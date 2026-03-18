const SHEET_ID = "1KFyHVHTcVFpJf0zHZFJmZ5LAXXwhdB56oiBbI6hk2KU";
const TAB_NAME = "Trang tính1";
const LINK_IMAGE_HEADER = "Link ảnh";
const PREVIEW_IMAGE_HEADER = "Ảnh";
const NAME_HEADER = "Tên sản phẩm";

function myFunction() {
  syncCatalogImages();
  ensureImageTriggers();
}

function syncCatalogImages() {
  const sheet = getCatalogSheet_();
  const meta = getColumnMeta_(sheet);
  const lastRow = sheet.getLastRow();

  if (lastRow < 2) {
    return;
  }

  const rowCount = lastRow - 1;
  const imageUrls = sheet.getRange(2, meta.linkImageColumn, rowCount, 1).getDisplayValues();
  const productNames = sheet.getRange(2, meta.nameColumn, rowCount, 1).getDisplayValues();
  const imageValues = imageUrls.map((row, index) => {
    const imageUrl = String(row[0] ?? "").trim();
    const productName = String(productNames[index]?.[0] ?? "").trim() || "Ảnh sản phẩm";

    if (!imageUrl) {
      return [""];
    }

    const cellImage = SpreadsheetApp.newCellImage()
      .setSourceUrl(imageUrl)
      .setAltTextTitle(productName)
      .setAltTextDescription(productName)
      .build();

    return [cellImage];
  });

  sheet.getRange(2, meta.previewImageColumn, rowCount, 1).setValues(imageValues);
  sheet.setColumnWidth(meta.previewImageColumn, 140);
  sheet.setRowHeightsForced(2, rowCount, 110);
}

function syncCatalogImagesOnEdit(e) {
  if (!e || !e.range) {
    syncCatalogImages();
    return;
  }

  const sheet = e.range.getSheet();
  if (sheet.getName() !== TAB_NAME) {
    return;
  }

  const meta = getColumnMeta_(sheet);
  const editedColumn = e.range.getColumn();

  if (editedColumn !== meta.linkImageColumn && editedColumn !== meta.nameColumn) {
    return;
  }

  const row = e.range.getRow();
  if (row < 2) {
    return;
  }

  const imageUrl = String(sheet.getRange(row, meta.linkImageColumn).getDisplayValue() ?? "").trim();
  if (!imageUrl) {
    sheet.getRange(row, meta.previewImageColumn).clearContent();
    return;
  }

  const productName = String(sheet.getRange(row, meta.nameColumn).getDisplayValue() ?? "").trim() || "Ảnh sản phẩm";
  const cellImage = SpreadsheetApp.newCellImage()
    .setSourceUrl(imageUrl)
    .setAltTextTitle(productName)
    .setAltTextDescription(productName)
    .build();

  sheet.getRange(row, meta.previewImageColumn).setValue(cellImage);
  sheet.setRowHeight(row, 110);
}

function ensureImageTriggers() {
  const sheet = getCatalogSheet_();
  const triggers = ScriptApp.getProjectTriggers();
  const hasEditTrigger = triggers.some((trigger) => trigger.getHandlerFunction() === "syncCatalogImagesOnEdit");

  if (!hasEditTrigger) {
    ScriptApp.newTrigger("syncCatalogImagesOnEdit").forSpreadsheet(sheet.getParent()).onEdit().create();
  }
}

function getCatalogSheet_() {
  const spreadsheet = SpreadsheetApp.openById(SHEET_ID);
  const sheet = spreadsheet.getSheetByName(TAB_NAME);

  if (!sheet) {
    throw new Error(`Không tìm thấy sheet ${TAB_NAME}.`);
  }

  return sheet;
}

function getColumnMeta_(sheet) {
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getDisplayValues()[0];
  const linkImageColumn = headers.indexOf(LINK_IMAGE_HEADER) + 1;
  const previewImageColumn = headers.indexOf(PREVIEW_IMAGE_HEADER) + 1;
  const nameColumn = headers.indexOf(NAME_HEADER) + 1;

  if (!linkImageColumn || !previewImageColumn || !nameColumn) {
    throw new Error("Thiếu cột Link ảnh, Ảnh hoặc Tên sản phẩm.");
  }

  return {
    linkImageColumn,
    previewImageColumn,
    nameColumn
  };
}
