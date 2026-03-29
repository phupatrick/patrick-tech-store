import {
  PRODUCT_SHEET_NAME,
  PRODUCT_SHEET_RANGE,
  buildTemplateRowsFromProducts,
  createGoogleClients
} from "./google-sheet-products.mjs";

const spreadsheetId = process.argv[2] ?? process.env.GOOGLE_SHEET_ID;

if (!spreadsheetId) {
  console.error("Missing spreadsheet ID. Pass it as an argument or set GOOGLE_SHEET_ID.");
  process.exit(1);
}

const main = async () => {
  const rows = await buildTemplateRowsFromProducts();
  const { sheets } = await createGoogleClients();

  await sheets.spreadsheets.values.clear({
    spreadsheetId,
    range: PRODUCT_SHEET_RANGE
  });

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${PRODUCT_SHEET_NAME}!A1`,
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: rows
    }
  });

  console.log(`Pushed ${rows.length - 1} products to Google Sheet ${spreadsheetId}.`);
};

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
