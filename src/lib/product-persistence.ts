import { Language } from "@/lib/i18n";

const READ_ONLY_FILE_SYSTEM_PATTERN = /EROFS|read-only file system/i;

export const isLiveProductStoreReadOnly = () => process.env.VERCEL === "1" && process.env.NODE_ENV === "production";

export const isReadOnlyProductPersistenceError = (error: unknown) => {
  if (!error) {
    return false;
  }

  if (typeof error === "object" && "code" in error) {
    const code = String((error as { code?: unknown }).code ?? "").toUpperCase();

    if (code === "EROFS") {
      return true;
    }
  }

  const message = error instanceof Error ? error.message : String(error);
  return READ_ONLY_FILE_SYSTEM_PATTERN.test(message);
};

export const getProductStoreReadOnlyNotice = (language: Language) =>
  language === "vi"
    ? "Bản web live trên Vercel hiện ở chế độ chỉ xem cho quản lý sản phẩm vì dữ liệu đang lưu bằng file cục bộ. Hãy cập nhật qua Google Sheet hoặc bản local rồi đồng bộ lại."
    : "The live Vercel site is currently read-only for product management because products are still stored in local files. Update them from Google Sheet or your local workspace, then sync again.";

export const getProductStoreWriteErrorMessage = (language: Language) =>
  language === "vi"
    ? "Không thể lưu thay đổi trực tiếp trên bản web live vì máy chủ Vercel không cho ghi file cục bộ. Hãy cập nhật qua Google Sheet hoặc bản local rồi đồng bộ lại."
    : "Changes cannot be saved directly on the live site because the Vercel server cannot write local files. Update the product from Google Sheet or your local workspace, then sync again.";
