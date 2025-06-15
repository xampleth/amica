export type MemoryData = {
  config: Record<string, any>;
  subconscious: any[];
  logs: { type: string; ts: number; arguments: any[] }[];
  userInputMessages: any[];
  chatLogs: any[];
};

const memoryStore: MemoryData = {
  config: {},
  subconscious: [],
  logs: [],
  userInputMessages: [],
  chatLogs: [],
};

export function readStore<K extends keyof MemoryData>(key: K): MemoryData[K] {
  return memoryStore[key];
}

export function writeStore<K extends keyof MemoryData>(
  key: K,
  value: MemoryData[K],
): void {
  memoryStore[key] = value;
}

export function updateStore<K extends keyof MemoryData>(
  key: K,
  values: Partial<MemoryData[K]> | any,
): void {
  const current = memoryStore[key];
  if (Array.isArray(current)) {
    memoryStore[key] = [...current, values];
    console.log(`Update ${key} with ${JSON.stringify(values)}`);
  } else if (
    typeof current === "object" &&
    typeof values === "object" &&
    !Array.isArray(current)
  ) {
    console.log(`Update ${key} with ${JSON.stringify(values)}`);
    if (values.key && values.value !== undefined) {
      const { key, value } = values;
      if (!current.hasOwnProperty(key)) {
        throw new Error(`Config key "${key}" not found.`);
      }
      current[key] = value;
    } else {
      for (const [key, value] of Object.entries(values)) {
        current[key] = value;
      }
    }
    console.log(`Update ${key} with ${JSON.stringify(values)}`);
  } else {
    console.error("Update memory stroe: Invalid Type");
  }
}
