import { useEffect, useRef, useState } from "react";
import { X, Plus, Minus, Equal, Package, Loader2 } from "lucide-react";
import Alert from "./Alert";
{
  /*import { adjustStock, invStatus } from "../inventoryApi";*/
}

// Each reason maps to one of your backend movement types.
const MODES = {
  add: {
    label: "Add stock",
    icon: Plus,
    reasons: [
      ["Purchase / delivery", "purchase"],
      ["Customer return", "return"],
      ["Stock correction", "adjustment"],
    ],
  },
  remove: {
    label: "Remove",
    icon: Minus,
    reasons: [
      ["Damaged", "damage"],
      ["Expired", "damage"],
      ["Lost / theft", "damage"],
      ["Stock correction", "adjustment"],
    ],
  },
  recount: {
    label: "Recount",
    icon: Equal,
    reasons: [["Stock count (recount)", "adjustment"]],
  },
};
const PILL = {
  in: ["In Stock", "bg-emerald-100 text-emerald-700"],
  low: ["Low Stock", "bg-orange-100 text-orange-600"],
  out: ["Out of Stock", "bg-red-100 text-red-600"],
};

export default function StockAdjustModal({ item, onClose, onSaved }) {
  const [mode, setMode] = useState("add");
  const [qty, setQty] = useState("");
  const [reasonIdx, setReasonIdx] = useState(0);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const moveId = useRef(crypto.randomUUID()); // one id per modal = safe retries, no double counting

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const q = qty === "" ? null : Number(qty);
  const next =
    q === null
      ? item.stock
      : mode === "add"
        ? item.stock + q
        : mode === "remove"
          ? item.stock - q
          : q;
  const [pillLabel, pillCls] =
    PILL[invStatus({ stock: next, reorderLevel: item.reorderLevel })];
  const [reasonLabel, type] = MODES[mode].reasons[reasonIdx];

  function pickMode(k) {
    setMode(k);
    setReasonIdx(0);
    setError("");
  }

  async function submit(e) {
    e.preventDefault();
    setError("");
    if (q === null || !Number.isInteger(q) || q < 0)
      return setError("Enter a whole number (0 or more).");

    let quantity = q;
    let direction = mode === "remove" ? "out" : "in";

    if (mode === "recount") {
      const delta = q - item.stock;
      if (delta === 0)
        return setError(
          "That matches the current stock, so nothing to change.",
        );
      direction = delta > 0 ? "in" : "out";
      quantity = Math.abs(delta);
    } else {
      if (q === 0) return setError("Quantity must be greater than zero.");
      if (mode === "remove" && q > item.stock)
        return setError(
          `You can’t remove more than the ${item.stock} in stock.`,
        );
    }

    setSaving(true);
    try {
      await adjustStock(item.id, {
        type,
        direction,
        quantity,
        note: `${reasonLabel}${note.trim() ? ` – ${note.trim()}` : ""}`,
        clientMovementId: moveId.current,
      });
      onSaved(`${item.name} updated.`);
    } catch (err) {
      setError(err.message);
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
        aria-labelledby="sa-title"
        className="w-full max-w-[460px] max-h-[92vh] overflow-y-auto bg-white rounded-2xl shadow-2xl p-6"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 id="sa-title" className="text-lg font-bold">
            Adjust stock
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

        <div className="flex items-center gap-3 rounded-xl bg-slate-50 border border-slate-100 p-3 mb-4">
          {item.imageUrl ? (
            <img
              src={item.imageUrl}
              alt=""
              className="w-11 h-11 rounded-lg object-cover"
            />
          ) : (
            <span className="w-11 h-11 rounded-lg bg-white border border-slate-100 grid place-items-center text-slate-400">
              <Package size={20} />
            </span>
          )}
          <div className="leading-tight flex-1 min-w-0">
            <b className="block text-[14px] truncate">{item.name}</b>
            <span className="text-[12px] text-slate-500">{item.sku}</span>
          </div>
          <div className="text-right leading-tight">
            <span className="text-[11px] text-slate-500">Current stock</span>
            <b className="block text-[18px]">{item.stock}</b>
          </div>
        </div>

        <Alert>{error}</Alert>

        <div className="grid gap-4">
          <div
            role="tablist"
            aria-label="Adjustment type"
            className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-slate-100"
          >
            {Object.entries(MODES).map(([key, { label, icon: Icon }]) => (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={mode === key}
                onClick={() => pickMode(key)}
                className={`h-9 rounded-lg text-[13px] font-medium inline-flex items-center justify-center gap-1.5 transition ${mode === key ? "bg-white shadow-sm text-brand font-semibold" : "text-slate-600 hover:text-ink"}`}
              >
                <Icon size={14} /> {label}
              </button>
            ))}
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="lbl" htmlFor="sa-qty">
                {mode === "recount" ? "Counted stock" : "Quantity"}
              </label>
              <input
                id="sa-qty"
                type="number"
                min="0"
                step="1"
                className="input"
                value={qty}
                onChange={(e) => setQty(e.target.value)}
                placeholder="0"
                autoFocus
              />
            </div>
            <div>
              <label className="lbl" htmlFor="sa-reason">
                Reason
              </label>
              <select
                id="sa-reason"
                className="input"
                value={reasonIdx}
                onChange={(e) => setReasonIdx(Number(e.target.value))}
                disabled={MODES[mode].reasons.length === 1}
              >
                {MODES[mode].reasons.map(([label], i) => (
                  <option key={label} value={i}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="lbl" htmlFor="sa-note">
              Note{" "}
              <span className="font-normal text-slate-400">(optional)</span>
            </label>
            <input
              id="sa-note"
              className="input"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={120}
              placeholder="e.g. Delivery note #1042"
            />
          </div>

          <div className="flex items-center justify-between rounded-xl bg-emerald-50/60 border border-emerald-100 px-4 py-3 text-[13px]">
            <span className="text-slate-600">New stock level</span>
            <span className="flex items-center gap-2.5">
              <b className={`text-[18px] ${next < 0 ? "text-red-600" : ""}`}>
                {next}
              </b>
              <span
                className={`px-2.5 py-1 rounded-md text-[11.5px] font-medium ${pillCls}`}
              >
                {pillLabel}
              </span>
            </span>
          </div>
          <p className="text-[11.5px] text-slate-400 -mt-2">
            Reorder level is edited in the product form.
          </p>
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
            {saving && <Loader2 size={16} className="animate-spin" />} Save
            changes
          </button>
        </div>
      </form>
    </div>
  );
}
