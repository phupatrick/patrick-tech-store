import { readProductsFromGoogleSheet, writeProductsFile } from "./google-sheet-products.mjs";

const spreadsheetId = process.argv[2] ?? process.env.GOOGLE_SHEET_ID;

if (!spreadsheetId) {
  console.error("Missing spreadsheet ID. Pass it as an argument or set GOOGLE_SHEET_ID.");
  process.exit(1);
}

const main = async () => {
  const products = await readProductsFromGoogleSheet(spreadsheetId);

  if (products.length === 0) {
    throw new Error("The Google Sheet does not contain any product rows.");
  }

  await writeProductsFile(products);
  console.log(`Synced ${products.length} products from Google Sheet ${spreadsheetId}.`);
};

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
