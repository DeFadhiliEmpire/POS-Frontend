import { useEffect, useRef, useState } from "react";
import { X, ImagePlus, Loader2, Trash2 } from "lucide-react";
import Alert from "./Alert";

const MAX_MB = 2;

export default function ProductModal({ product, onClose, onSaved }) {
  const editing = Boolean(product);
  const fileRef = useRef(null);
  const [f, setF] = useState({
    name: product?.name ?? "",
    category: product?.category ?? CATEGORY[0],
    price: product?.price ?? "",
    stock: product?.stock ?? "",
    lowStockAt: product?.lowStockAt ?? 5,
  });
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(product?.imageUrl ?? null);
  const [removeImage, setRemoveImage] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.terget.value }));

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  function pickImage(e) {
    const picked = e.target.files?.[0];
    if (!picked) return;
    if (!picked.type.startsWith("image/"))
      return setError("Please choose an image file.");
    if (picked.size > MAX_MB * 1024 * 1024)
      return setError(`Image must be smaller than ${MAX_MB}MB.`);
    setError("");
    setFile(picked);
    setPreview(URL.createObjectURL(picked));
    setRemoveImage(false);
  }

  function clearImage() {
    setFile(null);
    setPreview(null);
    setRemoveImage(true);
    if (fileRef.current) fileRef.current.value = "";
  }

  async function submit(e) {
    e.preventDefault();
    setError("");
    if (!f.name.trim()) return setError("Product name is required.");
    if (f.price === "" || Number(f.price) < 0)
      return setError("Enter a valid price.");
    if (
      f.stock === "" ||
      Number(f.stock) < 0 ||
      !Number.isInteger(Number(f.stock))
    )
      return setError("Stock must be a whole number (0 or more).");

    const fd = new FormData();
    Object.entries({ ...f, name: f.name.trim() }).forEach(([k, v]) =>
      fd.append(k, v),
    );
    if (file) fd.append("image", file);
    if (editing && removeImage) fd.append("removeImage", "true");

    setSaving(true);
    try {
      await saveProduct(fd, product?.id);
      onSaved(editing ? "Product update" : "Product added.");
    } catch (error) {
      setError(error.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center p-4 bg-slate-900/50"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <form
        onSubmit={submit}
        noValidate
        role="dialog"
        aria-modal="true"
        aria-labelledby="pm-title"
        className="w-full max-w-[520px] max-h-[92vh] overflow-y-auto bg-white rounded-2xl shadow-2xl p-6"
      >
        <div className="flex items-center justify-between mb-5">
          <h2 id="pm-title" className="text-lg font-bold">
            {editing ? "Edit product" : "Add product"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="p-1.5 rounded-lg hover:bg-slate-100"
          >
            <X size={18} />
          </button>
        </div>
        <Alert>{error}</Alert>

        <div className="grid gap-4">
          <div>
            <label className="lbl" htmlFor="pm-name">
              Product name
            </label>
            <input
              id="pm-name"
              className="input"
              value={f.name}
              onChange={set("name")}
              placeholder="e.g. Coca Cola 500ml"
              autoFocus
            />
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="lbl" htmlFor="pm-cat">
                Category
              </label>
              <select
                id="pm-cat"
                className="input"
                value={f.category}
                onChange={set("category")}
              >
                {CATEGORIES.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="lbl" htmlFor="pm-price">
                Price (KSh)
              </label>
              <input
                id="pm-price"
                type="number"
                min="0"
                step="0.01"
                className="input"
                value={f.price}
                onChange={set("price")}
                placeholder="0"
              />
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="lbl" htmlFor="pm-stock">
                Stock
              </label>
              <input
                id="pm-stock"
                type="number"
                min="0"
                step="1"
                className="input"
                value={f.stock}
                onChange={set("stock")}
                placeholder="0"
              />
            </div>
            <div>
              <label className="lbl" htmlFor="pm-low">
                Low stock at
              </label>
              <input
                id="pm-low"
                type="number"
                min="0"
                step="1"
                className="input"
                value={f.lowStockAt}
                onChange={set("lowStockAt")}
              />
            </div>
          </div>

          <div>
            <span className="lbl">
              Image{" "}
              <span className="font-normal text-slate-400">(optional)</span>
            </span>
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-xl border border-dashed border-slate-300 bg-slate-50 grid place-items-center overflow-hidden shrink-0">
                {preview ? (
                  <img
                    src={preview}
                    alt="Product preview"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <ImagePlus size={24} className="text-slate-400" />
                )}
              </div>
              <div className="flex flex-col items-start gap-2">
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  onChange={pickImage}
                  className="hidden"
                  id="pm-img"
                />
                <label
                  htmlFor="pm-img"
                  className="cursor-pointer text-[13px] font-semibold text-[#1a56c4] hover:underline"
                >
                  {preview ? "Change image" : "Upload image"}
                </label>
                {preview && (
                  <button
                    type="button"
                    onClick={clearImage}
                    className="inline-flex items-center gap-1 text-[13px] text-red-600 hover:underline"
                  >
                    <Trash2 size={13} /> Remove
                  </button>
                )}
                <span className="text-[11.5px] text-slate-500">
                  PNG or JPG, up to {MAX_MB}MB
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button
            type="button"
            onClick={onClose}
            className="h-11 px-5 rounded-[10px] border border-line text-[14px] font-medium hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="h-11 px-6 rounded-[10px] bg-brand hover:bg-brand-dark text-white text-[14px] font-semibold inline-flex items-center gap-2 disabled:opacity-70"
          >
            {saving && <Loader2 size={16} className="animate-spin" />}
            {editing ? "Save changes" : "Add product"}
          </button>
        </div>
      </form>
    </div>
  );
}
