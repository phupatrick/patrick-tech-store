import "./load-env.mjs";
import { mkdirSync, existsSync, writeFileSync } from "node:fs";
import path from "node:path";

const projectRoot = process.cwd();
const nextTypesDirectory = path.join(projectRoot, ".next", "types");
const validatorFile = path.join(nextTypesDirectory, "validator.ts");

if (!existsSync(nextTypesDirectory)) {
  mkdirSync(nextTypesDirectory, { recursive: true });
}

if (!existsSync(validatorFile)) {
  writeFileSync(validatorFile, "export {};\n", "utf8");
}
