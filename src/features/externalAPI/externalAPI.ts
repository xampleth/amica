import { config, defaults, prefixed } from "@/utils/config";
import {
  MAX_STORAGE_TOKENS,
  TimestampedPrompt,
} from "../amicaLife/eventHandler";
import { Message } from "../chat/messages";

export const issueJWT = `/api/getConfigJWT`;
export const configUrl = new URL(
  `${process.env.NEXT_PUBLIC_DEVELOPMENT_BASE_URL}/api/dataHandler`,
);
configUrl.searchParams.append("type", "config");

export const userInputUrl = new URL(
  `${process.env.NEXT_PUBLIC_DEVELOPMENT_BASE_URL}/api/dataHandler`,
);
userInputUrl.searchParams.append("type", "userInputMessages");

export const subconsciousUrl = new URL(
  `${process.env.NEXT_PUBLIC_DEVELOPMENT_BASE_URL}/api/dataHandler`,
);
subconsciousUrl.searchParams.append("type", "subconscious");

export const logsUrl = new URL(
  `${process.env.NEXT_PUBLIC_DEVELOPMENT_BASE_URL}/api/dataHandler`,
);
logsUrl.searchParams.append("type", "logs");

export const chatLogsUrl = new URL(
  `${process.env.NEXT_PUBLIC_DEVELOPMENT_BASE_URL}/api/dataHandler`,
);
chatLogsUrl.searchParams.append("type", "chatLogs");

export async function fetcher(method: string, url: URL | string, data?: any) {
  switch (method) {
    case "POST":
      try {
        await fetch(url, {
          method: method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
      } catch (error) {
        console.error("Failed to POST server config: ", error);
      }
      break;

    default:
      break;
  }
}

export async function handleConfig(
  type: string,
  data?: Record<string, string>,
) {
  switch (type) {
    // Call this function at the beginning of your application to load the server config and sync to localStorage if needed.
    case "init":
      let localStorageData: Record<string, string> = {};

      for (const key in defaults) {
        const localKey = prefixed(key);
        const value = localStorage.getItem(localKey);

        if (value !== null) {
          localStorageData[key] = value;
        } else {
          // Append missing keys with default values
          localStorageData[key] = (<any>defaults)[key];
        }
      }

      // Sync update to server config
      const response = await fetch(issueJWT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config: localStorageData }),
      });

      let token: string = "";
      if (response.ok) {
        const json = await response.json();
        if (json.token) {
          token = json.token;
        }
      }

      return token;
    case "update":
      await fetcher("POST", configUrl, data);
      break;

    default:
      break;
  }
}

export async function handleUserInput(message: string) {
  if (config("external_api_enabled") !== "true") {
    return;
  }

  fetch(userInputUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemPrompt: config("system_prompt"),
      message: message,
    }),
  });
}

export async function handleChatLogs(messages: Message[]) {
  if (config("external_api_enabled") !== "true") {
    return;
  }

  fetch(chatLogsUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(messages),
  });
}

export async function handleSubconscious(
  timestampedPrompt: TimestampedPrompt,
): Promise<any> {
  if (config("external_api_enabled") !== "true") {
    return;
  }

  const data = await fetch(subconsciousUrl);
  if (!data.ok) {
    throw new Error("Failed to get subconscious data");
  }

  const currentStoredSubconscious: TimestampedPrompt[] = await data.json();
  currentStoredSubconscious.push(timestampedPrompt);

  let totalStorageTokens = currentStoredSubconscious.reduce(
    (totalTokens, prompt) => totalTokens + prompt.prompt.length,
    0,
  );
  while (totalStorageTokens > MAX_STORAGE_TOKENS) {
    const removed = currentStoredSubconscious.shift();
    totalStorageTokens -= removed!.prompt.length;
  }

  const response = await fetch(subconsciousUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ subconscious: currentStoredSubconscious }),
  });

  if (!response.ok) {
    throw new Error("Failed to update subconscious data");
  }

  return currentStoredSubconscious;
}
