import { DEFAULT_SHARED_EDITORS, PRODUCT_SHEET_NAME, buildTemplateRowsFromProducts, createGoogleClients } from "./google-sheet-products.mjs";

const SHEET_TITLE = process.env.GOOGLE_SHEET_TITLE?.trim() || "Bang gia Patrick Tech Co. Store";
const SHARED_EDITORS = (process.env.GOOGLE_SHEET_EDITORS ?? DEFAULT_SHARED_EDITORS.join(","))
  .split(",")
  .map((item) => item.trim())
  .filter(Boolean);

const COLUMN_WIDTHS = [
  180, 220, 240, 140, 140, 130, 120, 120, 120, 120, 120, 260, 420, 120
];

const buildFormattingRequests = (sheetId, rowCount, columnCount) => [
  {
    updateSheetProperties: {
      properties: {
        sheetId,
        gridProperties: {
          frozenRowCount: 1
        }
      },
      fields: "gridProperties.frozenRowCount"
    }
  },
  {
    repeatCell: {
      range: {
        sheetId,
        startRowIndex: 0,
        endRowIndex: 1
      },
      cell: {
        userEnteredFormat: {
          backgroundColor: { red: 0.06, green: 0.09, blue: 0.16 },
          textFormat: {
            bold: true,
            foregroundColor: { red: 1, green: 1, blue: 1 }
          },
          verticalAlignment: "MIDDLE",
          wrapStrategy: "WRAP"
        }
      },
      fields: "userEnteredFormat(backgroundColor,textFormat,verticalAlignment,wrapStrategy)"
    }
  },
  {
    repeatCell: {
      range: {
        sheetId,
        startRowIndex: 1,
        endRowIndex: rowCount
      },
      cell: {
        userEnteredFormat: {
          verticalAlignment: "TOP",
          wrapStrategy: "WRAP"
        }
      },
      fields: "userEnteredFormat(verticalAlignment,wrapStrategy)"
    }
  },
  {
    updateDimensionProperties: {
      range: {
        sheetId,
        dimension: "ROWS",
        startIndex: 0,
        endIndex: 1
      },
      properties: {
        pixelSize: 38
      },
      fields: "pixelSize"
    }
  },
  {
    updateDimensionProperties: {
      range: {
        sheetId,
        dimension: "ROWS",
        startIndex: 1,
        endIndex: rowCount
      },
      properties: {
        pixelSize: 132
      },
      fields: "pixelSize"
    }
  },
  ...COLUMN_WIDTHS.slice(0, columnCount).map((width, index) => ({
    updateDimensionProperties: {
      range: {
        sheetId,
        dimension: "COLUMNS",
        startIndex: index,
        endIndex: index + 1
      },
      properties: {
        pixelSize: width
      },
      fields: "pixelSize"
    }
  })),
  {
    setBasicFilter: {
      filter: {
        range: {
          sheetId,
          startRowIndex: 0,
          endRowIndex: rowCount,
          startColumnIndex: 0,
          endColumnIndex: columnCount
        }
      }
    }
  }
];

const main = async () => {
  const { sheets, drive } = await createGoogleClients();
  const rows = await buildTemplateRowsFromProducts();
  const rowCount = Math.max(rows.length + 10, 100);
  const columnCount = rows[0]?.length ?? 30;
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
              rowCount,
              columnCount
            }
          }
        }
      ]
    }
  });

  const spreadsheetId = createResponse.data.spreadsheetId;
  const spreadsheetUrl = createResponse.data.spreadsheetUrl;
  const productSheetId = createResponse.data.sheets?.[0]?.properties?.sheetId ?? 0;

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

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: buildFormattingRequests(productSheetId, rowCount, columnCount)
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
