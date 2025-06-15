import type { NextApiRequest, NextApiResponse } from "next";

import { config } from "@/utils/config";
import {
  handleSubconscious,
} from "@/features/externalAPI/externalAPI";
import { getTokenVersion } from "@/features/externalAPI/jwt"

import {
  generateSessionId,
  sendError,
  apiLogEntry,
  ApiResponse,
} from "@/features/externalAPI/utils/apiHelper";
import {
  processNormalChat,
  triggerAmicaActions,
  updateSystemPrompt,
} from "@/features/externalAPI/processors/chatProcessor";
import { readStore, writeStore } from "@/features/externalAPI/memoryStore";
import { verifyConfigJWT } from "@/features/externalAPI/jwt";

export const apiLogs: apiLogEntry[] = [];
export const sseClients: Array<{ res: NextApiResponse }> = [];

const JWT_SECRET = process.env.NEXT_PUBLIC_JWT_SECRET as string;

// Main Amica Handler
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>,
) {
  if (req.method === "GET") {
    handleSSEConnection(req, res);
    return;
  }

  // Syncing config to be accessible from server side
  const authHeader = req.headers.authorization;
  const token = authHeader?.split(" ")[1];

  if (!JWT_SECRET) {
    return res.status(500).json({ error: "JWT_SECRET is not defined" });
  }
  if (!token) {
    return res.status(401).json({ error: "No token provided" });
  }
  let decoded;
  try {
    decoded = verifyConfigJWT(token);
  } catch (e) {
    return res.status(401).json({ error: "Invalid token" });
  }
  const latestTokenVersion = getTokenVersion();
  if (decoded?.tokenVersion !== latestTokenVersion) {
    return res.status(401).json({ error: "JWT token version is outdat" });;
  }
  const configFromToken = decoded;

  // Apply the config globally for the request
  writeStore("config", configFromToken!);


  if (config("external_api_enabled") !== "true") {
    return sendError(res, "", "API is currently disabled.", 503);
  }

  const { sessionId, inputType, payload, noProcessChat = false } = req.body;
  const currentSessionId = generateSessionId(sessionId);
  const timestamp = new Date().toISOString();

  if (!inputType) {
    return sendError(res, currentSessionId, "inputType are required.");
  }

  try {
    const { response, outputType } = await processRequest(inputType, payload);
    apiLogs.push({
      sessionId: currentSessionId,
      timestamp,
      inputType,
      outputType,
      response,
    });
    res.status(200).json({ sessionId: currentSessionId, outputType, response });
  } catch (error) {
    apiLogs.push({
      sessionId: sessionId,
      timestamp,
      inputType,
      outputType: "Error",
      error: String(error),
    });
    sendError(res, currentSessionId, String(error), 500);
  }
}

const processRequest = async (inputType: string, payload: any) => {
  switch (inputType) {
    case "Normal Chat Message":
      return { response: await processNormalChat(payload), outputType: "Chat" };
    case "Memory Request":
      return { response: readStore("subconscious"), outputType: "Memory" };
    case "RPC Logs":
      return { response: readStore("logs"), outputType: "Logs" };
    case "RPC User Input Messages":
      return {
        response: readStore("userInputMessages"),
        outputType: "User Input",
      };
    case "Update System Prompt":
      return {
        response: await updateSystemPrompt(payload),
        outputType: "Updated system prompt",
      };
    case "Brain Message":
      return {
        response: await handleSubconscious(payload),
        outputType: "Added subconscious stored prompt",
      };
    case "Chat History":
      return { response: readStore("chatLogs"), outputType: "Chat History" };
    case "Reasoning Server":
      return {
        response: await triggerAmicaActions(payload),
        outputType: "Actions",
      };
    default:
      throw new Error("Invalid input type");
  }
};

// Sub-functions
const handleSSEConnection = (
  req: NextApiRequest,
  res: NextApiResponse,
): void => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("X-Accel-Buffering", "no");
  res.setHeader("Connection", "keep-alive");

  const client = { res };
  sseClients.push(client);

  req.on("close", () => {
    console.log("Client disconnected");
    sseClients.splice(sseClients.indexOf(client), 1);
    res.end();
  });
};
