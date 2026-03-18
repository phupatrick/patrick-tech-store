import { randomUUID } from "node:crypto";
import { existsSync, mkdirSync, unlinkSync, writeFileSync } from "node:fs";
import path from "node:path";

import { Language, translate } from "@/lib/i18n";

const uploadsDirectory = path.join(process.cwd(), "public", "uploads", "products");
const ALLOWED_IMAGE_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp"
};
const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;

const ensureUploadsDirectory = () => {
  if (!existsSync(uploadsDirectory)) {
    mkdirSync(uploadsDirectory, { recursive: true });
  }
};

const normalizeSlug = (slug: string) =>
  slug
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/(^-|-$)/g, "") || "product";

const isFile = (value: FormDataEntryValue | null): value is File =>
  typeof File !== "undefined" && value instanceof File;

export const saveUploadedProductImage = async (file: File, slug: string, language: Language) => {
  const extension = ALLOWED_IMAGE_TYPES[file.type];

  if (!extension) {
    return { ok: false as const, error: translate(language, "admin.validation.imageInvalid") };
  }

  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    return { ok: false as const, error: translate(language, "admin.validation.imageTooLarge") };
  }

  try {
    ensureUploadsDirectory();
    const fileName = `${normalizeSlug(slug)}-${Date.now()}-${randomUUID().slice(0, 8)}.${extension}`;
    const filePath = path.join(uploadsDirectory, fileName);
    const buffer = Buffer.from(await file.arrayBuffer());

    writeFileSync(filePath, buffer);

    return { ok: true as const, imagePath: `/uploads/products/${fileName}` };
  } catch {
    return { ok: false as const, error: translate(language, "admin.validation.imageUploadFailed") };
  }
};

export const resolveProductImageFromFormData = async ({
  formData,
  slug,
  currentImagePath,
  requireImage,
  language
}: {
  formData: FormData;
  slug: string;
  currentImagePath: string;
  requireImage: boolean;
  language: Language;
}) => {
  const removeImage = formData.get("removeImage") === "true";
  const imageEntry = formData.get("imageFile");
  const imageFile = isFile(imageEntry) && imageEntry.size > 0 ? imageEntry : undefined;
  let imagePath = removeImage ? "" : currentImagePath.trim();

  if (imageFile) {
    const storedImage = await saveUploadedProductImage(imageFile, slug, language);

    if (!storedImage.ok) {
      return storedImage;
    }

    imagePath = storedImage.imagePath;
  }

  if (requireImage && !imagePath) {
    return { ok: false as const, error: translate(language, "admin.validation.imageRequired") };
  }

  return {
    ok: true as const,
    imagePath,
    removeImage,
    replaced: Boolean(imageFile) || removeImage
  };
};

export const removeStoredProductImage = (imagePath?: string | null) => {
  if (!imagePath || !imagePath.startsWith("/uploads/products/")) {
    return;
  }

  const filePath = path.join(process.cwd(), "public", imagePath.replace(/^\//, ""));

  if (existsSync(filePath)) {
    unlinkSync(filePath);
  }
};
