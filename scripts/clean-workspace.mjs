import { rm } from "node:fs/promises";
import path from "node:path";

const TEMP_PATHS = [
  ".next",
  ".tmp-verification",
  ".tmp-server.pid",
  "tmp-zalo-catalog.html",
  "tmp-zalo-main.js",
  "tmp-zalo-products-detailed.json",
  "tmp-zalo-products.json",
  "tsconfig.tsbuildinfo"
];

const main = async () => {
  await Promise.all(
    TEMP_PATHS.map(async (target) => {
      const absolutePath = path.join(process.cwd(), target);
      await rm(absolutePath, { recursive: true, force: true });
    })
  );

  console.log("Workspace temp files removed.");
};

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
