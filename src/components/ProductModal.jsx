import { useEffect, useRef, useState } from "react";
import { X, Loader2, ImagePlus, Trash2 } from "lucide-react";

import Alert from "./Alert";
import { validateCatalogueImage } from "../services/catalogueImageService.js";

import { createProduct, updateProduct } from "../services/productService.js";

export default function ProductModal({
  product,
  categories = [],
  onClose,
  onSaved,
}) {
  const editing = Boolean(product);
  const fileRef = useRef(null);

  const [form, setForm] = useState({
    name: product?.name || "",
    sku: product?.sku || "",
    barcode: product?.barcode || "",
    categoryId: product?.categoryId || "",
    buyingPrice: product?.buyingPrice ?? "",
    sellingPrice: product?.sellingPrice ?? "",
    lowStockThreshold: product?.lowStockThreshold ?? 5,
    unit: product?.unit || "piece",
  });

  const [imageFile, setImageFile] = useState(null);
  const [preview, setPreview] = useState(product?.imageUrl || "");
  const [removeImage, setRemoveImage] = useState(false);

  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  // Create and clean up the temporary preview URL.
  useEffect(() => {
    if (!imageFile) return;

    const objectUrl = URL.createObjectURL(imageFile);
    setPreview(objectUrl);

    return () => URL.revokeObjectURL(objectUrl);
  }, [imageFile]);

  // Close modal using Escape.
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape" && !saving) {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, saving]);

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handleImageChange = (event) => {
    const selectedFile = event.target.files?.[0];

    if (!selectedFile) return;

    try {
      validateCatalogueImage(selectedFile);

      setError("");
      setImageFile(selectedFile);
      setRemoveImage(false);
    } catch (err) {
      setError(err.message);
      event.target.value = "";
    }
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    setPreview("");
    setRemoveImage(true);

    if (fileRef.current) {
      fileRef.current.value = "";
    }
  };

  const validateForm = () => {
    if (!form.name.trim()) {
      return "Product name is required.";
    }

    if (!form.sku.trim()) {
      return "Product SKU is required.";
    }

    if (!form.categoryId) {
      return "Please select a product category.";
    }

    if (
      form.buyingPrice === "" ||
      !Number.isFinite(Number(form.buyingPrice)) ||
      Number(form.buyingPrice) < 0
    ) {
      return "Enter a valid buying price.";
    }

    if (
      form.sellingPrice === "" ||
      !Number.isFinite(Number(form.sellingPrice)) ||
      Number(form.sellingPrice) < 0
    ) {
      return "Enter a valid selling price.";
    }

    if (
      form.lowStockThreshold === "" ||
      !Number.isInteger(Number(form.lowStockThreshold)) ||
      Number(form.lowStockThreshold) < 0
    ) {
      return "Enter a valid low-stock threshold.";
    }

    return null;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    const validationError = validateForm();

    if (validationError) {
      setError(validationError);
      return;
    }

    setSaving(true);

    try {
      const payload = {
        name: form.name.trim(),
        sku: form.sku.trim().toUpperCase(),
        barcode: form.barcode.trim(),
        categoryId: form.categoryId,
        buyingPrice: Number(form.buyingPrice),
        sellingPrice: Number(form.sellingPrice),
        lowStockThreshold: Number(form.lowStockThreshold),
        unit: form.unit,
        imageFile,
        removeImage: editing && !imageFile && removeImage,
      };

      if (editing) {
        await updateProduct(product.productId, payload);
      } else {
        await createProduct(payload);
      }

      onSaved?.(
        editing
          ? "Product updated successfully."
          : "Product added successfully.",
      );
    } catch (err) {
      setError(err.message || "Unable to save product.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-slate-900/50 p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !saving) {
          onClose();
        }
      }}
    >
      <form
        onSubmit={handleSubmit}
        noValidate
        role="dialog"
        aria-modal="true"
        aria-labelledby="product-modal-title"
        className="w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl"
      >
        {/* Header */}
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h2
              id="product-modal-title"
              className="text-lg font-bold text-slate-900"
            >
              {editing ? "Edit product" : "Add new product"}
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Enter product details and catalogue information.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            aria-label="Close"
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
          >
            <X size={19} />
          </button>
        </div>

        {error && (
          <div className="mb-4">
            <Alert>{error}</Alert>
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          {/* Product name */}
          <div className="sm:col-span-2">
            <label className="lbl" htmlFor="product-name">
              Product name
            </label>

            <input
              id="product-name"
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder="e.g. Coca Cola 500ml"
              className="input"
              required
            />
          </div>

          {/* SKU */}
          <div>
            <label className="lbl" htmlFor="product-sku">
              SKU
            </label>

            <input
              id="product-sku"
              name="sku"
              value={form.sku}
              onChange={handleChange}
              placeholder="e.g. COKE-500"
              className="input"
              required
            />
          </div>

          {/* Barcode */}
          <div>
            <label className="lbl" htmlFor="product-barcode">
              Barcode
            </label>

            <input
              id="product-barcode"
              name="barcode"
              value={form.barcode}
              onChange={handleChange}
              placeholder="Optional barcode"
              className="input"
            />
          </div>

          {/* Category */}
          <div>
            <label className="lbl" htmlFor="product-category">
              Category
            </label>

            <select
              id="product-category"
              name="categoryId"
              value={form.categoryId}
              onChange={handleChange}
              className="input"
              required
            >
              <option value="">Select category</option>

              {categories
                .filter((category) => category.isActive)
                .map((category) => (
                  <option key={category.categoryId} value={category.categoryId}>
                    {category.name}
                  </option>
                ))}
            </select>
          </div>

          {/* Unit */}
          <div>
            <label className="lbl" htmlFor="product-unit">
              Unit
            </label>

            <select
              id="product-unit"
              name="unit"
              value={form.unit}
              onChange={handleChange}
              className="input"
            >
              {["piece", "kg", "g", "liter", "ml", "box", "pack", "dozen"].map(
                (unit) => (
                  <option key={unit} value={unit}>
                    {unit}
                  </option>
                ),
              )}
            </select>
          </div>

          {/* Buying price */}
          <div>
            <label className="lbl" htmlFor="product-buying-price">
              Buying price (KSh)
            </label>

            <input
              id="product-buying-price"
              name="buyingPrice"
              type="number"
              min="0"
              step="0.01"
              value={form.buyingPrice}
              onChange={handleChange}
              placeholder="0.00"
              className="input"
            />
          </div>

          {/* Selling price */}
          <div>
            <label className="lbl" htmlFor="product-selling-price">
              Selling price (KSh)
            </label>

            <input
              id="product-selling-price"
              name="sellingPrice"
              type="number"
              min="0"
              step="0.01"
              value={form.sellingPrice}
              onChange={handleChange}
              placeholder="0.00"
              className="input"
            />
          </div>

          {/* Low stock threshold */}
          <div>
            <label className="lbl" htmlFor="product-low-stock">
              Low-stock threshold
            </label>

            <input
              id="product-low-stock"
              name="lowStockThreshold"
              type="number"
              min="0"
              step="1"
              value={form.lowStockThreshold}
              onChange={handleChange}
              className="input"
            />
          </div>

          {/* Image upload */}
          <div className="sm:col-span-2">
            <label className="lbl">
              Product image
              <span className="ml-1 font-normal text-slate-400">
                (optional)
              </span>
            </label>

            <div className="flex flex-col gap-4 rounded-xl border border-slate-200 p-4 sm:flex-row sm:items-center">
              <div className="grid h-28 w-28 shrink-0 place-items-center overflow-hidden rounded-xl border border-dashed border-slate-300 bg-slate-50">
                {preview ? (
                  <img
                    src={preview}
                    alt="Selected product preview"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <ImagePlus size={28} className="text-slate-400" />
                )}
              </div>

              <div className="flex flex-col items-start gap-2">
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleImageChange}
                  className="hidden"
                  id="product-image"
                />

                <label
                  htmlFor="product-image"
                  className="cursor-pointer rounded-lg bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-100"
                >
                  {preview ? "Change image" : "Choose image"}
                </label>

                {preview && (
                  <button
                    type="button"
                    onClick={handleRemoveImage}
                    className="inline-flex items-center gap-2 text-sm text-red-600 hover:text-red-700"
                  >
                    <Trash2 size={15} />
                    Remove image
                  </button>
                )}

                <p className="text-xs text-slate-500">
                  JPG, PNG or WEBP. Maximum size: 2MB.
                </p>

                <p className="text-xs text-slate-500">
                  Preview is local. The image uploads when catalogue sync runs.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 flex justify-end gap-3 border-t border-slate-100 pt-5">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="h-11 rounded-lg border border-slate-300 px-5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={saving}
            className="inline-flex h-11 items-center gap-2 rounded-lg bg-blue-700 px-6 text-sm font-semibold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving && <Loader2 size={16} className="animate-spin" />}

            {saving ? "Saving..." : editing ? "Save changes" : "Add product"}
          </button>
        </div>
      </form>
    </div>
  );
}
