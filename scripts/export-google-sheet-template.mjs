import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { buildTemplateRowsFromProducts } from "./google-sheet-products.mjs";

const outputDirectory = path.join(process.cwd(), "docs");
const outputFile = path.join(outputDirectory, "google-sheet-template.csv");

const escapeCsvCell = (value) => {
  const stringValue = String(value ?? "");

  if (/[",\n]/.test(stringValue)) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }

  return stringValue;
};

const BOM = "\uFEFF";

const toCsv = (rows) => rows.map((row) => row.map(escapeCsvCell).join(",")).join("\r\n");

const main = async () => {
  const rows = await buildTemplateRowsFromProducts();
  await mkdir(outputDirectory, { recursive: true });
  await writeFile(outputFile, `${BOM}${toCsv(rows)}`, "utf8");
  console.log(`Exported Google Sheet template to ${outputFile}`);
};

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
