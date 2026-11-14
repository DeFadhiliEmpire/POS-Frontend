import { useEffect, useMemo, useState } from "react";
import {
  Plus,
  Tags,
  CircleCheck,
  CirclePause,
  Pencil,
  Power,
  PowerOff,
  Loader2,
} from "lucide-react";
import Alert from "../components/Alert";
import CategoryModal from "../components/CategoryModal";
import {
  listCategories,
  deactivateCategory,
  activateCategory,
} from "../services/categoryService";
import { act } from "react";

const fmtDate = (iso) =>
  new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

function Stat({ icon: Icon, label, value, tone }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200/70 shadow-[0_1px_2px_rgba(16,24,40,.04)] p-4 flex items-center gap-4">
      <span className={`w-12 h-12 rounded-xl grid place-items-center ${tone}`}>
        <Icon size={22} />
      </span>
      <div>
        <p className="text-[13px] text-slate-500">{label}</p>
        <p className="text-[26px] font-extrabold leading-tight">{value}</p>
      </div>
    </div>
  );
}

export default function Categories() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [modal, setModal] = useState(null); // null | { category: null | {...} }
  const [confirm, setConfirm] = useState(null); // category being deactivated
  const [busyId, setBusyId] = useState(null);
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    let cancelled = false;

    listCategories()
      .then((r) => {
        if (!cancelled) {
          setItems(r.items);
          setError("");
        }
      })
      .catch((e) => {
        if (!cancelled) setError(e.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [refresh]);

  const stats = useMemo(() => {
    const active = items.filter((c) => c.isActive).length;
    return { total: items.length, active, inactive: items.length - active };
  }, [items]);

  function onSaved(msg) {
    setModal(null);
    setNotice(msg);
    setRefresh((n) => n + 1);
  }

  async function toggle(c, active) {
    setBusyId(c.categoryId);
    setError("");
    try {
      await deactivateCategory(c.categoryId);
      setNotice(`“${c.name}” ${active ? "activated" : "deactivated"}.`);
      setRefresh((n) => n + 1);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusyId(null);
      setConfirm(null);
    }
  }

  async function activate(c, active) {
    setBusyId(c.categoryId);
    setError("");
    try {
      await activateCategory(c.categoryId);
      setNotice(`“${c.name}” ${active ? "activated" : "deactivated"}.`);
      setRefresh((n) => n + 1);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusyId(null);
      setConfirm(null);
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4 mb-5">
        <div>
          <h1 className="text-[26px] font-bold tracking-tight">Categories</h1>
          <p className="text-slate-500 text-[14px] mt-1">
            Organise your products into categories.
          </p>
        </div>
        <button
          onClick={() => {
            setNotice("");
            setModal({ category: null });
          }}
          className="h-11 px-5 rounded-sm bg-[#16915f] hover:bg-[#16915f]/80 text-white text-[14px] font-semibold inline-flex items-center gap-2 shadow-sm cursor-pointer"
        >
          <Plus size={18} /> Add Category
        </button>
      </div>

      <div className="grid sm:grid-cols-3 gap-4 mb-5">
        <Stat
          icon={Tags}
          label="Total Categories"
          value={stats.total}
          tone="bg-emerald-600 text-white"
        />
        <Stat
          icon={CircleCheck}
          label="Active Categories"
          value={stats.active}
          tone="bg-blue-500 text-white"
        />
        <Stat
          icon={CirclePause}
          label="Inactive Categories"
          value={stats.inactive}
          tone="bg-amber-400 text-white"
        />
      </div>

      <Alert type="success">{notice}</Alert>
      <Alert>{error}</Alert>

      <div className="bg-white rounded-sm border border-slate-200/70 shadow-[0_1px_2px_rgba(16,24,40,.04)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px]">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                {[
                  "Category Name",
                  "Description",
                  "Products",
                  "Status",
                  "Created",
                ].map((h) => (
                  <th
                    key={h}
                    className="text-left text-[11.5px] font-medium text-slate-500 px-3 py-2.5 px-5"
                  >
                    {h}
                  </th>
                ))}
                <th className="text-left text-[11.5px] font-medium text-slate-500 px-3 py-2.5 px-5 text-right">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody
              className={`divide-y divide-slate-100 transition-opacity ${loading && items.length ? "opacity-50" : ""}`}
            >
              {items.map((c) => (
                <tr
                  key={c.categoryId}
                  className={`h-[60px] hover:bg-slate-50/60 ${c.isActive ? "" : "text-slate-400"}`}
                >
                  <td className="td px-5 text-[13.5px] font-medium">
                    {c.name}
                  </td>
                  <td
                    className="td px-5 max-w-[280px] truncate"
                    title={c.description || undefined}
                  >
                    {c.description || <span className="text-slate-300">—</span>}
                  </td>
                  <td className="td px-5">{c.productCount}</td>
                  <td className="td px-5">
                    <span
                      className={`px-2.5 py-1 rounded-md text-[11.5px] font-medium ${c.isActive ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}
                    >
                      {c.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="td px-5">{fmtDate(c.createdAt)}</td>
                  <td className="td px-5">
                    <div className="flex justify-end items-center gap-1">
                      <button
                        onClick={() => {
                          setNotice("");
                          setModal({ category: c });
                        }}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[12.5px] font-medium text-blue-600 hover:bg-blue-50"
                      >
                        <Pencil size={14} /> Edit
                      </button>
                      {c.isActive ? (
                        <button
                          onClick={() => setConfirm(c)}
                          disabled={busyId === c.categoryId}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[12.5px] font-medium text-red-500 hover:bg-red-50 disabled:opacity-50"
                        >
                          <PowerOff size={14} /> Deactivate
                        </button>
                      ) : (
                        <button
                          onClick={() => activate(c, true)}
                          disabled={busyId === c.categoryId}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[12.5px] font-medium text-emerald-700 hover:bg-emerald-50 disabled:opacity-50"
                        >
                          {busyId === c.categoryId ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : (
                            <Power size={14} />
                          )}{" "}
                          Activate
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {loading && !items.length && (
                <tr>
                  <td colSpan="6" className="py-14 text-center">
                    <Loader2 className="animate-spin text-brand inline" />
                  </td>
                </tr>
              )}
              {!loading && !items.length && !error && (
                <tr>
                  <td colSpan="6" className="py-14 text-center text-slate-500">
                    <Tags
                      size={30}
                      className="mx-auto mb-2 text-slate-300 text-sm"
                    />
                    No categories yet. Click “Add Category” to create your first
                    one.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {modal && (
        <CategoryModal
          category={modal.category}
          existing={items}
          onClose={() => setModal(null)}
          onSaved={onSaved}
        />
      )}

      {confirm && (
        <div
          className="fixed inset-0 z-50 grid place-items-center p-4 bg-slate-900/50"
          onMouseDown={(e) => e.target === e.currentTarget && setConfirm(null)}
        >
          <div
            role="alertdialog"
            aria-modal="true"
            className="w-full max-w-[400px] bg-white rounded-2xl shadow-2xl p-6"
          >
            <h2 className="text-lg font-bold">Deactivate category?</h2>
            <p className="text-[14px] text-slate-500 mt-2">
              “{confirm.name}” won’t be available when adding new products.
              {confirm.productCount > 0 &&
                ` Its ${confirm.productCount} existing products will not be deleted.`}{" "}
              You can activate it again any time.
            </p>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setConfirm(null)}
                className="h-10 px-4 rounded-[10px] border border-line text-[14px] font-medium hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={() => toggle(confirm, false)}
                disabled={busyId === confirm.categoryId}
                className="h-10 px-5 rounded-[10px] bg-red-600 hover:bg-red-700 text-white text-[14px] font-semibold inline-flex items-center gap-2 disabled:opacity-70"
              >
                {busyId === confirm.categoryId && (
                  <Loader2 size={15} className="animate-spin" />
                )}{" "}
                Deactivate
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
