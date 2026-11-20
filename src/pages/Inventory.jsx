import { useEffect, useState } from "react";
import {
  Search,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  Package,
  Loader2,
  Boxes,
  CircleCheck,
  TriangleAlert,
  PackageX,
} from "lucide-react";
import Alert from "../components/Alert";
import StockAdjustModal from "../components/StockAdjustModal";
{
  /*import { listInventory, invStatus } from "../inventoryApi";*/
}
import { listCategories } from "../services/categoryService";

const PAGE_SIZE = 8;
const PILL = {
  in: ["In Stock", "bg-emerald-100 text-emerald-700"],
  low: ["Low Stock", "bg-orange-100 text-orange-600"],
  out: ["Out of Stock", "bg-red-100 text-red-600"],
};
const BAR = { in: "bg-emerald-500", low: "bg-orange-400", out: "bg-red-500" };
const selectCls =
  "h-11 rounded-xl border border-slate-200 bg-white px-3 text-[13px] text-slate-700 focus:outline-none focus:border-brand focus:ring-[3px] focus:ring-brand/20";

function pageList(page, pages) {
  if (pages <= 5) return Array.from({ length: pages }, (_, i) => i + 1);
  const keep = [
    ...new Set(
      [1, pages, page - 1, page, page + 1].filter((n) => n >= 1 && n <= pages),
    ),
  ].sort((a, b) => a - b);
  const out = [];
  let prev = 0;
  keep.forEach((n) => {
    if (n - prev > 1) out.push("…");
    out.push(n);
    prev = n;
  });
  return out;
}

function Thumb({ src, name }) {
  const [broken, setBroken] = useState(false);
  return src && !broken ? (
    <img
      src={src}
      alt={name}
      onError={() => setBroken(true)}
      className="w-10 h-10 rounded-lg object-cover bg-slate-100"
    />
  ) : (
    <span className="w-10 h-10 rounded-lg bg-slate-100 grid place-items-center text-slate-400">
      <Package size={18} />
    </span>
  );
}

// Clicking a card filters the table by that status.
function StatCard({ icon: Icon, label, value, tone, active, onClick }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={`card p-4 flex items-center gap-4 text-left transition hover:shadow-md ${active ? "ring-2 ring-brand/40 border-brand/40" : ""}`}
    >
      <span className={`w-12 h-12 rounded-xl grid place-items-center ${tone}`}>
        <Icon size={22} />
      </span>
      <span>
        <span className="block text-[13px] text-slate-500">{label}</span>
        <b className="block text-[26px] font-extrabold leading-tight">
          {value}
        </b>
      </span>
    </button>
  );
}

export default function Inventory() {
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [summary, setSummary] = useState({ total: 0, in: 0, low: 0, out: 0 });
  const [categories, setCategories] = useState([]);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [adjusting, setAdjusting] = useState(null);
  const [refresh, setRefresh] = useState(0);

  // Category filter options come from your Categories data (active ones only).
  useEffect(() => {
    listCategories()
      .then((r) =>
        setCategories(r.items.filter((c) => c.active).map((c) => c.name)),
      )
      .catch(() => {});
  }, []);

  // Debounce search and return to page 1.
  useEffect(() => {
    const t = setTimeout(() => {
      setQuery(search.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    listInventory({ page, limit: PAGE_SIZE, search: query, category, status })
      .then((r) => {
        if (cancelled) return;
        setItems(r.items);
        setTotal(r.total);
        if (r.summary) setSummary(r.summary);
        setError("");
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
  }, [page, query, category, status, refresh]);

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const from = total ? (page - 1) * PAGE_SIZE + 1 : 0;
  const to = Math.min(page * PAGE_SIZE, total);
  const filterStatus = (s) => {
    setStatus(s);
    setPage(1);
  };

  function onSaved(msg) {
    setAdjusting(null);
    setNotice(msg);
    setRefresh((n) => n + 1);
  }

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-[26px] font-bold tracking-tight">Inventory</h1>
        <p className="text-slate-500 text-[14px] mt-1">
          Track stock levels and keep reorder points up to date.
        </p>
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-5">
        <StatCard
          icon={Boxes}
          label="Total Items"
          value={summary.total}
          tone="bg-emerald-600 text-white"
          active={status === ""}
          onClick={() => filterStatus("")}
        />
        <StatCard
          icon={CircleCheck}
          label="In Stock"
          value={summary.in}
          tone="bg-blue-500 text-white"
          active={status === "in"}
          onClick={() => filterStatus("in")}
        />
        <StatCard
          icon={TriangleAlert}
          label="Low Stock"
          value={summary.low}
          tone="bg-amber-400 text-white"
          active={status === "low"}
          onClick={() => filterStatus("low")}
        />
        <StatCard
          icon={PackageX}
          label="Out of Stock"
          value={summary.out}
          tone="bg-red-500 text-white"
          active={status === "out"}
          onClick={() => filterStatus("out")}
        />
      </div>

      <Alert type="success">{notice}</Alert>
      <Alert>{error}</Alert>

      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative flex-1 min-w-[220px]">
          <Search
            size={17}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by product name or barcode..."
            aria-label="Search inventory"
            className="w-full h-11 rounded-xl border border-slate-200 bg-white pl-11 pr-4 text-[14px] focus:outline-none focus:border-brand focus:ring-[3px] focus:ring-brand/20"
          />
        </div>
        <select
          value={category}
          onChange={(e) => {
            setCategory(e.target.value);
            setPage(1);
          }}
          className={selectCls}
          aria-label="Filter by category"
        >
          <option value="">All Categories</option>
          {categories.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
        <select
          value={status}
          onChange={(e) => filterStatus(e.target.value)}
          className={selectCls}
          aria-label="Filter by status"
        >
          <option value="">All Statuses</option>
          <option value="in">In Stock</option>
          <option value="low">Low Stock</option>
          <option value="out">Out of Stock</option>
        </select>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px]">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                {[
                  "Product",
                  "SKU / Barcode",
                  "Stock",
                  "Reorder Level",
                  "Status",
                ].map((h) => (
                  <th key={h} className="th px-5">
                    {h}
                  </th>
                ))}
                <th className="th px-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody
              className={`divide-y divide-slate-100 transition-opacity ${loading && items.length ? "opacity-50" : ""}`}
            >
              {items.map((p) => {
                const st = p.status || invStatus(p);
                const [label, cls] = PILL[st];
                const pct = Math.min(
                  100,
                  (Number(p.stock) / Math.max(1, Number(p.reorderLevel) * 3)) *
                    100,
                );
                return (
                  <tr key={p.id} className="h-[66px] hover:bg-slate-50/60">
                    <td className="td px-5">
                      <div className="flex items-center gap-3">
                        <Thumb src={p.imageUrl} name={p.name} />
                        <span className="text-[13.5px] font-medium">
                          {p.name}
                        </span>
                      </div>
                    </td>
                    <td className="td px-5 font-mono text-[12.5px] text-slate-600">
                      {p.sku}
                    </td>
                    <td className="td px-5 w-[130px]">
                      <b
                        className={`text-[14px] ${st === "out" ? "text-red-600" : st === "low" ? "text-orange-600" : ""}`}
                      >
                        {p.stock}
                      </b>
                      <div
                        className="h-1 w-20 rounded bg-slate-100 mt-1.5 overflow-hidden"
                        aria-hidden="true"
                      >
                        <div
                          className={`h-full ${BAR[st]}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </td>
                    <td className="td px-5">{p.reorderLevel}</td>
                    <td className="td px-5">
                      <span
                        className={`px-2.5 py-1 rounded-md text-[11.5px] font-medium ${cls}`}
                      >
                        {label}
                      </span>
                    </td>
                    <td className="td px-5">
                      <div className="flex justify-end">
                        <button
                          onClick={() => {
                            setNotice("");
                            setAdjusting(p);
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-[12.5px] font-medium text-brand hover:bg-emerald-50 hover:border-emerald-200"
                        >
                          <SlidersHorizontal size={14} /> Adjust
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
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
                    <Package
                      size={30}
                      className="mx-auto mb-2 text-slate-300"
                    />
                    {query || category || status
                      ? "No items match your filters."
                      : "No inventory yet. Add products first and they will appear here."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 border-t border-slate-100 text-[12.5px] text-slate-500">
          <span>
            Showing {from}–{to} of {total.toLocaleString()} items
          </span>
          <nav className="flex items-center gap-1.5" aria-label="Pagination">
            <button
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
              aria-label="Previous page"
              className="w-8 h-8 grid place-items-center rounded-lg border border-slate-200 bg-white disabled:opacity-40"
            >
              <ChevronLeft size={15} />
            </button>
            {pageList(page, pages).map((n, i) =>
              n === "…" ? (
                <span key={i} className="w-8 text-center">
                  …
                </span>
              ) : (
                <button
                  key={i}
                  onClick={() => setPage(n)}
                  aria-current={n === page ? "page" : undefined}
                  className={`w-8 h-8 rounded-lg font-medium ${n === page ? "bg-brand text-white" : "border border-slate-200 bg-white hover:bg-slate-50"}`}
                >
                  {n}
                </button>
              ),
            )}
            <button
              disabled={page >= pages}
              onClick={() => setPage(page + 1)}
              aria-label="Next page"
              className="w-8 h-8 grid place-items-center rounded-lg border border-slate-200 bg-white disabled:opacity-40"
            >
              <ChevronRight size={15} />
            </button>
          </nav>
        </div>
      </div>

      {adjusting && (
        <StockAdjustModal
          item={adjusting}
          onClose={() => setAdjusting(null)}
          onSaved={onSaved}
        />
      )}
    </div>
  );
}
