import { useEffect, useState } from "react";
import { X, Loader2 } from "lucide-react";
import Alert from "./Alert";
import { createCategory, updateCategory } from "../categoriesApi";

const MAX_DESC = 200;

export default function CategoryModal({
  category,
  existing,
  onClose,
  onSaved,
}) {
  const editing = Boolean(category);
  const [name, setName] = useState(category?.name ?? "");
  const [description, setDescription] = useState(category?.description ?? "");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

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
        aria-labelledby="cm-title"
        className="w-full max-w-[420px] bg-white rounded-2xl shadow-2xl p-6"
      >
        <div className="flex items-center justify-between mb-5">
          <h2 id="cm-title" className="text-lg font-bold">
            {editing ? "Edit category" : "Add category"}
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
            <label className="lbl" htmlFor="cm-name">
              Category name
            </label>
            <input
              id="cm-name"
              className="input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Beverages"
              maxLength={60}
              autoFocus
            />
          </div>
          <div>
            <label className="lbl" htmlFor="cm-desc">
              Description{" "}
              <span className="font-normal text-slate-400">(optional)</span>
            </label>
            <textarea
              id="cm-desc"
              rows={3}
              maxLength={MAX_DESC}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What belongs in this category?"
              className="input h-auto py-3 resize-none leading-snug"
            />
            <p className="text-[11.5px] text-slate-400 text-right mt-1">
              {description.length}/{MAX_DESC}
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-5">
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
            {editing ? "Save changes" : "Add category"}
          </button>
        </div>
      </form>
    </div>
  );
}
