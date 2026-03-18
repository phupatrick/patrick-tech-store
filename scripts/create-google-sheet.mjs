import { DEFAULT_SHARED_EDITORS, PRODUCT_SHEET_NAME, buildTemplateRowsFromProducts, createGoogleClients } from "./google-sheet-products.mjs";

const SHEET_TITLE = process.env.GOOGLE_SHEET_TITLE?.trim() || "Bảng giá Patrick Tech Co. Store";
const SHARED_EDITORS = (process.env.GOOGLE_SHEET_EDITORS ?? DEFAULT_SHARED_EDITORS.join(","))
  .split(",")
  .map((item) => item.trim())
  .filter(Boolean);

const main = async () => {
  const { sheets, drive } = await createGoogleClients();
  const rows = await buildTemplateRowsFromProducts();
  const createResponse = await sheets.spreadsheets.create({
    requestBody: {
      properties: {
        title: SHEET_TITLE
      },
      sheets: [
        {
          properties: {
            title: PRODUCT_SHEET_NAME,
            gridProperties: {
              rowCount: Math.max(rows.length + 10, 100),
              columnCount: rows[0]?.length ?? 29
            }
          }
        }
      ]
    }
  });

  const spreadsheetId = createResponse.data.spreadsheetId;
  const spreadsheetUrl = createResponse.data.spreadsheetUrl;

  if (!spreadsheetId) {
    throw new Error("Google Sheets API did not return a spreadsheetId.");
  }

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${PRODUCT_SHEET_NAME}!A1`,
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: rows
    }
  });

  for (const emailAddress of SHARED_EDITORS) {
    await drive.permissions.create({
      fileId: spreadsheetId,
      sendNotificationEmail: true,
      requestBody: {
        type: "user",
        role: "writer",
        emailAddress
      }
    });
  }

  console.log(`Created spreadsheet: ${spreadsheetUrl ?? spreadsheetId}`);
  console.log(`Spreadsheet ID: ${spreadsheetId}`);
  console.log(`Editors added: ${SHARED_EDITORS.join(", ")}`);
};

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
