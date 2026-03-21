# Google Sheet Catalog Sync

Project này hỗ trợ đồng bộ catalog sản phẩm từ Google Sheet vào web.

## Các lệnh chính

- `npm run google-sheet:create`
  - tạo một Google Sheet mới
  - đổ sẵn catalog hiện tại vào sheet
  - chia quyền sửa cho:
    - `hphumail@gmail.com`
    - `hoangphupatrick@gmail.com`
    - `phupunpin@gmail.com`

- `npm run google-sheet:export-template`
  - xuất file mẫu CSV mới nhất ở:
    - `docs/google-sheet-template.csv`

- `npm run google-sheet:sync -- <SPREADSHEET_ID>`
  - đọc dữ liệu từ sheet
  - cập nhật lại:
    - `src/data/products.json`

- `POST /api/admin/google-sheet/sync`
  - kéo dữ liệu mới nhất từ Google Sheet về web
  - phù hợp để gọi bằng Apps Script hoặc webhook

## Biến môi trường

Bắt buộc nếu muốn tạo sheet mới bằng service account:

- `GOOGLE_SERVICE_ACCOUNT_JSON`
- hoặc `GOOGLE_SERVICE_ACCOUNT_FILE`

Tùy chọn:

- `GOOGLE_SHEET_TITLE`
- `GOOGLE_SHEET_ID`
- `GOOGLE_SHEET_TAB_NAME`
- `GOOGLE_SHEET_GID`
- `GOOGLE_SHEET_EDITORS`
- `GOOGLE_SHEET_SYNC_SECRET`

## Schema sheet hiện tại

Tab `Products` dùng layout gọn này:

`Mã sản phẩm | Tên sản phẩm | Thời gian sử dụng | Thời gian bảo hành | Loại acc | Giá vốn | Giá khách (VND) | Giá CTV (VND) | Giá khách (USD) | Giá CTV (USD) | Còn hàng (y/n)`

## Ghi chú

- `Thời gian sử dụng` và `Thời gian bảo hành` có thể nhập kiểu:
  - `30 ngày`
  - `1 tháng`
  - `1 năm`
- `Loại acc` hỗ trợ:
  - `Chính chủ`
  - `Cấp riêng`
  - `Thuê`
- `Còn hàng (y/n)` chấp nhận:
  - `y`, `yes`
  - `n`, `no`
- `Giá khách (USD)` và `Giá CTV (USD)` được nhập riêng, không phụ thuộc giá VND.
- `Hình ảnh`, `Mô tả ngắn`, `Mô tả chi tiết` không còn nằm trong sheet; các phần này sẽ quản lý trực tiếp trong web/admin.
- Khi sync từ sheet, những trường không còn nằm trong sheet nhưng đã có sẵn trong catalog local sẽ được giữ lại.

## Gọi API sync thủ công

Sau khi cấu hình `GOOGLE_SHEET_ID` và `GOOGLE_SHEET_SYNC_SECRET`, gọi:

`POST /api/admin/google-sheet/sync`

Header hợp lệ:

- `Authorization: Bearer <GOOGLE_SHEET_SYNC_SECRET>`
- hoặc `x-google-sheet-secret: <GOOGLE_SHEET_SYNC_SECRET>`

Body tùy chọn:

```json
{
  "spreadsheetId": "your-google-sheet-id"
}
```

## Apps Script mẫu

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
