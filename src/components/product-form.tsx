"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";

import { useCurrency } from "@/components/currency-provider";
import { useI18n } from "@/components/i18n-provider";
import { getProductImageSrc } from "@/lib/product-image-src";
import { emptyProductFormValues, ProductFormState, ProductFormValues, slugify } from "@/lib/product-form";

type ProductFormProps = {
  action: (state: ProductFormState, formData: FormData) => Promise<ProductFormState>;
  initialValues?: ProductFormValues;
  submitLabel: string;
  heading: string;
  description: string;
};

const ACCOUNT_TYPE_VALUES = ["dedicated", "primary", "rental"] as const;
const USAGE_DURATION_UNITS = ["day", "month"] as const;

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  const { t } = useI18n();

  return (
    <button type="submit" className="button button-primary" disabled={pending}>
      {pending ? t("admin.form.submit.saving") : label}
    </button>
  );
}

export function ProductForm({ action, initialValues, submitLabel, heading, description }: ProductFormProps) {
  const { t } = useI18n();
  const { settings } = useCurrency();
  const [state, formAction] = useActionState(action, {
    values: initialValues ?? emptyProductFormValues
  });
  const [slugEdited, setSlugEdited] = useState(Boolean(initialValues?.slug));
  const [selectedImagePreview, setSelectedImagePreview] = useState<string | null>(null);
  const [removeImage, setRemoveImage] = useState(state.values.removeImage);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const previewImage = selectedImagePreview ?? (removeImage ? "" : state.values.image);
  const priceStep = settings.currency === "USD" ? "0.01" : "1000";
  const pricePlaceholder = settings.currency === "USD" ? "19.99" : "890000";
  const costPlaceholder = settings.currency === "USD" ? "15.00" : "650000";
  const currencyLabel = `(${settings.currency})`;

  useEffect(() => {
    setRemoveImage(state.values.removeImage);
  }, [state.values.removeImage]);

  useEffect(() => {
    return () => {
      if (selectedImagePreview?.startsWith("blob:")) {
        URL.revokeObjectURL(selectedImagePreview);
      }
    };
  }, [selectedImagePreview]);

  return (
    <form action={formAction} className="surface page-stack admin-form" encType="multipart/form-data">
      <div className="section-head">
        <div>
          <h2 className="section-title">{heading}</h2>
          <p className="muted">{description}</p>
        </div>
      </div>

      {state.error ? <div className="admin-form-error">{state.error}</div> : null}

      <div className="admin-form-grid">
        <label className="field">
          <span className="field-label">{t("admin.form.field.name")}</span>
          <input
            name="name"
            defaultValue={state.values.name}
            onChange={(event) => {
              if (!slugEdited) {
                const slugInput = event.currentTarget.form?.elements.namedItem("slug") as HTMLInputElement | null;

                if (slugInput) {
                  slugInput.value = slugify(event.currentTarget.value);
                }
              }
            }}
            className="input"
            placeholder={t("admin.form.placeholder.name")}
            required
          />
        </label>

        <label className="field">
          <span className="field-label">{t("admin.form.field.slug")}</span>
          <input
            name="slug"
            defaultValue={state.values.slug}
            onChange={() => setSlugEdited(true)}
            className="input"
            placeholder={t("admin.form.placeholder.slug")}
            required
          />
        </label>
      </div>

      <div className="admin-form-grid">
        <label className="field">
          <span className="field-label">{t("admin.form.field.usageDuration")}</span>
          <div className="admin-form-grid admin-form-grid-usage">
            <input
              name="usageDurationValue"
              type="number"
              min="1"
              step="1"
              defaultValue={state.values.usageDurationValue}
              className="input"
              placeholder="30"
              required
            />
            <select name="usageDurationUnit" defaultValue={state.values.usageDurationUnit} className="select">
              {USAGE_DURATION_UNITS.map((unit) => (
                <option key={unit} value={unit}>
                  {t(`admin.form.usageDuration.${unit}` as const)}
                </option>
              ))}
            </select>
          </div>
        </label>

        <label className="field">
          <span className="field-label">{t("admin.form.field.accountType")}</span>
          <select name="accountType" defaultValue={state.values.accountType} className="select">
            {ACCOUNT_TYPE_VALUES.map((accountType) => (
              <option key={accountType} value={accountType}>
                {t(`admin.form.accountType.${accountType}` as const)}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="admin-form-grid admin-form-grid-pricing">
        <label className="field">
          <span className="field-label">
            {t("admin.form.field.costPrice")} {currencyLabel}
          </span>
          <input
            name="costPrice"
            type="number"
            min="0"
            step={priceStep}
            inputMode="decimal"
            defaultValue={state.values.costPrice}
            className="input"
            placeholder={costPlaceholder}
            required
          />
        </label>

        <label className="field">
          <span className="field-label">
            {t("admin.form.field.customerRegularPrice")} {currencyLabel}
          </span>
          <input
            name="customerRegularPrice"
            type="number"
            min="0"
            step={priceStep}
            inputMode="decimal"
            defaultValue={state.values.customerRegularPrice}
            className="input"
            placeholder={pricePlaceholder}
            required
          />
        </label>

        <label className="field">
          <span className="field-label">
            {t("admin.form.field.customerVipPrice")} {currencyLabel}
          </span>
          <input
            name="customerVipPrice"
            type="number"
            min="0"
            step={priceStep}
            inputMode="decimal"
            defaultValue={state.values.customerVipPrice}
            className="input"
            placeholder={pricePlaceholder}
            required
          />
        </label>

        <label className="field">
          <span className="field-label">
            {t("admin.form.field.ctvRegularPrice")} {currencyLabel}
          </span>
          <input
            name="ctvRegularPrice"
            type="number"
            min="0"
            step={priceStep}
            inputMode="decimal"
            defaultValue={state.values.ctvRegularPrice}
            className="input"
            placeholder={pricePlaceholder}
            required
          />
        </label>

        <label className="field">
          <span className="field-label">
            {t("admin.form.field.ctvVipPrice")} {currencyLabel}
          </span>
          <input
            name="ctvVipPrice"
            type="number"
            min="0"
            step={priceStep}
            inputMode="decimal"
            defaultValue={state.values.ctvVipPrice}
            className="input"
            placeholder={pricePlaceholder}
            required
          />
        </label>

        <label className="field">
          <span className="field-label">{t("admin.form.field.warrantyMonths")}</span>
          <input
            name="warrantyMonths"
            type="number"
            min="0"
            step="1"
            defaultValue={state.values.warrantyMonths}
            className="input"
            required
          />
        </label>
      </div>

      <p className="field-help">{t("admin.form.help.currency", { currency: settings.currency })}</p>

      <div className="admin-form-grid">
        <label className="field">
          <span className="field-label">{t("admin.form.field.category")}</span>
          <input
            name="category"
            defaultValue={state.values.category}
            className="input"
            placeholder={t("admin.form.placeholder.category")}
          />
          <span className="field-help">{t("admin.form.help.categories")}</span>
        </label>

        <label className="field">
          <span className="field-label">{t("admin.form.field.flashSaleLabel")}</span>
          <input
            name="flashSaleLabel"
            defaultValue={state.values.flashSaleLabel}
            className="input"
            placeholder={t("admin.form.placeholder.flashSaleLabel")}
          />
        </label>
      </div>

      <div className="admin-form-grid">
        <label className="toggle">
          <input type="checkbox" name="featured" defaultChecked={state.values.featured} />
          <span>{t("admin.form.field.featured")}</span>
        </label>
        <label className="toggle">
          <input type="checkbox" name="isFlashSale" defaultChecked={state.values.isFlashSale} />
          <span>{t("admin.form.field.flashSale")}</span>
        </label>
      </div>

      <label className="field">
        <span className="field-label">{t("admin.form.field.shortDescription")}</span>
        <textarea
          name="shortDescription"
          defaultValue={state.values.shortDescription}
          className="input textarea"
          rows={3}
          placeholder={t("admin.form.placeholder.shortDescription")}
          required
        />
      </label>

      <label className="field">
        <span className="field-label">{t("admin.form.field.fullDescription")}</span>
        <textarea
          name="fullDescription"
          defaultValue={state.values.fullDescription}
          className="input textarea textarea-lg"
          rows={7}
          placeholder={t("admin.form.placeholder.fullDescription")}
          required
        />
      </label>

      <div className="admin-form-grid admin-form-grid-image">
        <div className="field">
          <input type="hidden" name="currentImage" value={state.values.image} />
          <input type="hidden" name="removeImage" value={removeImage ? "true" : "false"} />
          <span className="field-label">{t("admin.form.field.image")}</span>
          <input
            ref={fileInputRef}
            name="imageFile"
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="input"
            onChange={(event) => {
              const nextFile = event.currentTarget.files?.[0];

              if (!nextFile) {
                setSelectedImagePreview(null);
                return;
              }

              if (selectedImagePreview?.startsWith("blob:")) {
                URL.revokeObjectURL(selectedImagePreview);
              }

              setRemoveImage(false);
              setSelectedImagePreview(URL.createObjectURL(nextFile));
            }}
          />
          <span className="field-help">{t("admin.form.help.imageUpload")}</span>
          <div className="row row-actions">
            <button type="button" className="button" onClick={() => fileInputRef.current?.click()}>
              {state.values.image ? t("admin.form.action.changeImage") : t("admin.form.action.chooseImage")}
            </button>
            {state.values.image || selectedImagePreview ? (
              <button
                type="button"
                className="button"
                onClick={() => {
                  if (selectedImagePreview?.startsWith("blob:")) {
                    URL.revokeObjectURL(selectedImagePreview);
                  }

                  if (fileInputRef.current) {
                    fileInputRef.current.value = "";
                  }

                  setSelectedImagePreview(null);
                  setRemoveImage(true);
                }}
              >
                {t("admin.form.action.removeImage")}
              </button>
            ) : null}
          </div>
        </div>

        <div className="image-preview-card">
          <span className="field-label">{t("admin.form.field.previewImage")}</span>
          {previewImage ? (
            <img src={getProductImageSrc(previewImage)} alt={t("admin.form.preview.alt")} className="image-preview" />
          ) : (
            <div className="image-preview image-preview-empty">{t("admin.form.preview.empty")}</div>
          )}
        </div>
      </div>

      <div className="toggle-row">
        <label className="toggle">
          <input type="checkbox" name="published" defaultChecked={state.values.published} />
          <span>{t("admin.form.field.publicVisibility")}</span>
        </label>
      </div>

      <div className="row row-actions">
        <SubmitButton label={submitLabel} />
      </div>
    </form>
  );
}
