import { readFileSync, statSync, writeFileSync } from "node:fs";

export const createJsonFileStore = <T>({
  ensureFile,
  filePath,
  parse,
  serialize
}: {
  ensureFile: () => void;
  filePath: string;
  parse: (content: string) => T;
  serialize: (value: T) => string;
}) => {
  let cachedValue: T | undefined;
  let cachedMtimeMs = -1;

  const syncCache = (value: T) => {
    cachedValue = value;
    cachedMtimeMs = statSync(filePath).mtimeMs;
    return value;
  };

  return {
    read: () => {
      ensureFile();
      const currentMtimeMs = statSync(filePath).mtimeMs;

      if (cachedValue && cachedMtimeMs === currentMtimeMs) {
        return cachedValue;
      }

      return syncCache(parse(readFileSync(filePath, "utf8")));
    },
    write: (value: T) => {
      ensureFile();
      writeFileSync(filePath, serialize(value), "utf8");
      return syncCache(value);
    },
    clear: () => {
      cachedValue = undefined;
      cachedMtimeMs = -1;
    }
  };
};
