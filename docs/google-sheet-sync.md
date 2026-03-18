# Google Sheet Catalog Sync

This project now includes official Google Sheets and Drive scripts for product management.

## What the scripts do

- `npm run google-sheet:create`
  - creates a new Google Sheet
  - seeds it with the current product catalog
  - grants writer access to:
    - `hphumail@gmail.com`
    - `hoangphupatrick@gmail.com`
    - `phupunpin@gmail.com`

- `npm run google-sheet:sync -- <SPREADSHEET_ID>`
  - reads the `Products` tab from Google Sheets
  - rewrites `src/data/products.json`
  - updates the web catalog on the next build or deployment

- `POST /api/admin/google-sheet/sync`
  - pulls the latest rows from Google Sheets into `src/data/products.json`
  - is designed for Google Apps Script or another webhook caller
  - lets the web catalog refresh from the sheet without opening the server terminal

## Required credentials

Set one of these:

- `GOOGLE_SERVICE_ACCOUNT_JSON`
- `GOOGLE_SERVICE_ACCOUNT_FILE`

Optional:

- `GOOGLE_SHEET_TITLE`
- `GOOGLE_SHEET_ID`
- `GOOGLE_SHEET_TAB_NAME`
- `GOOGLE_SHEET_GID`
- `GOOGLE_SHEET_EDITORS`
- `GOOGLE_SHEET_SYNC_SECRET`

## Recommended service account scopes

- `https://www.googleapis.com/auth/spreadsheets`
- `https://www.googleapis.com/auth/drive.file`

## Product sheet columns

The `Products` tab uses these columns:

`id, slug, name, shortDescription, fullDescription, usageDurationValue, usageDurationUnit, costPrice, retailPrice, customerRegularPrice, customerVipPrice, ctvRegularPrice, ctvVipPrice, warrantyMonths, category, categories, accountType, featured, isFlashSale, flashSaleLabel, published, image, points, enName, enShortDescription, enFullDescription, enCategory, enCategories, enFlashSaleLabel`

## Auto-update the web catalog from Google Sheets

After you set `GOOGLE_SHEET_ID` and `GOOGLE_SHEET_SYNC_SECRET`, you can call:

`POST /api/admin/google-sheet/sync`

Use one of these headers:

- `Authorization: Bearer <GOOGLE_SHEET_SYNC_SECRET>`
- `x-google-sheet-secret: <GOOGLE_SHEET_SYNC_SECRET>`

Optional JSON body:

```json
{
  "spreadsheetId": "your-google-sheet-id"
}
```

### Example Apps Script trigger

You can attach this to the Google Sheet with an installable `onEdit` trigger:

```javascript
function syncPatrickTechCatalog() {
  var url = "https://your-domain.com/api/admin/google-sheet/sync";
  var options = {
    method: "post",
    contentType: "application/json",
    headers: {
      "x-google-sheet-secret": "YOUR_GOOGLE_SHEET_SYNC_SECRET"
    },
    payload: JSON.stringify({
      spreadsheetId: "YOUR_GOOGLE_SHEET_ID"
    }),
    muteHttpExceptions: true
  };

  UrlFetchApp.fetch(url, options);
}
```

This is enough for Google Sheet -> Web auto-update once the sheet and credentials are configured.

If your sheet is shared publicly by link, the web sync script can also read it through the public CSV export using `GOOGLE_SHEET_ID` and `GOOGLE_SHEET_GID`, without a service account for read-only sync.

## Important note about Zalo

This repo already supports importing products from the public Zalo catalog into the web catalog.

However, the official Zalo OA materials we verified describe OA OpenAPI as a paid integration platform for OA management, messaging, customer sync, and service purchases. We did not verify an official product-catalog write endpoint that would safely update the public Zalo catalog from this app.

Because of that, Google Sheet -> Web sync is ready in code, but Google Sheet -> Zalo catalog sync still needs one of these before it can be implemented safely:

- official Zalo catalog write API docs and credentials
- a supported partner integration
- a browser automation workflow that you explicitly approve
