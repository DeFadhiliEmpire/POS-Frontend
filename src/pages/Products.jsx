import { useEffect, useState, useMemo } from "react";
import {
  Search,
  Plus,
  Pencil,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Package,
  Loader2,
  RefreshCw,
} from "lucide-react";
import ProductModal from "../components/ProductModal";
import Alert from "../components/Alert";
import { getProducts, deactivateProduct } from "../services/productService";
import { getCategories } from "../services/categoryService";

const PAGE_SIZE = 6;

const stockStatus = (product) => {
  const stock = Number(product.stockQuantity || 0);
  const threshold = Number(product.lowStockThreshold ?? 5);

  if (stock <= 0) return "out";
  if (stock <= threshold) return "low";

  return "in";
};

const PILL = {
  in: ["In Stock", "bg-emerald-100 text-emerald-700"],
  low: ["Low Stock", "bg-orange-100 text-orange-600"],
  out: ["Out of Stock", "bg-red-100 text-red-600"],
};

function Thumb({ src, name }) {
  const [broken, setBroken] = useState(false);
  return src && !broken ? (
    <img
      src={src}
      alt={name}
      onError={() => setBroken(true)}
      className="w-11 h-11 rounded-lg object-cover bg-slate-100"
    />
  ) : (
    <span className="w-11 h-11 rounded-lg bg-slate-100 grid place-items-center text-slate-400">
      <Package size={20} />
    </span>
  );
}

const selectCls =
  "h-11 rounded-xl border border-slate-200 bg-white px-3 text-[13px] text-slate-700 focus:outline-none focus:border-brand focus:ring-[3px] focus:ring-brand/20";

{
  /*

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
}*/
}

export default function Products() {
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [modal, setModal] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const loadProducts = async () => {
    setLoading(true);
    setError("");

    try {
      const [productsData, categoriesData] = await Promise.all([
        getProducts(),
        getCategories(),
      ]);

      setItems(productsData || []);
      setCategories(categoriesData || []);
    } catch (error) {
      setError(error.message || "Failed to load products");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  const categoryMap = useMemo(
    () =>
      new Map(categories.map((item) => [String(item.categoryId), item.name])),
    [categories],
  );

  const filteredItems = useMemo(() => {
    const term = search.trim().toLowerCase();

    return items.filter((product) => {
      const matchesSearch =
        !term ||
        product.name?.toLowerCase().includes(term) ||
        product.sku?.toLowerCase().includes(term) ||
        product.barcode?.toLowerCase().includes(term);

      const matchesCategory =
        !category || String(product.categoryId) === category;

      const matchesStatus = !status || stockStatus(product) === status;

      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [items, search, category, status]);

  const total = filteredItems.length;
  const pages = Math.min(1, Math.ceil(total / PAGE_SIZE));
  const currentPage = Math.min(page, pages);

  const visibleItems = filteredItems.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );

  const from = total ? (currentPage - 1) * PAGE_SIZE + 1 : 0;
  const to = Math.min(currentPage * PAGE_SIZE, total);

  async function onSaved(message) {
    setModal(null);
    setNotice(message);
    setPage(1);
    await loadProducts();
  }

  async function onDelete() {
    if (!confirm) return;

    setDeleting(true);
    setError("");

    try {
      await deactivateProduct(confirm.productId || confirm.id);

      setNotice(`"${confirm.name}" deactivated.`);
      setConfirm(null);
      await loadProducts();
    } catch (err) {
      setError(err.message || "Failed to deactivate product.");
    } finally {
      setDeleting(false);
    }
  }

  // Debounce search and go back to page 1 whenever a filter changes.
  {
    /*useEffect(() => {
    const t = setTimeout(() => {
      setQuery(search.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [search]);*/
  }

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4 mb-5">
        <div>
          <h1 className="text-[26px] font-bold tracking-tight">Products</h1>
          <p className="text-slate-500 text-[14px] mt-1">
            Manage your store products and stock levels.
          </p>
        </div>
        <button
          onClick={() => setModal({ product: null })}
          disabled={!categories.length}
          className="h-11 px-5 rounded-xl bg-brand hover:bg-brand-dark text-white text-[14px] font-semibold inline-flex items-center gap-2 shadow-sm"
        >
          <Plus size={18} /> Add Product
        </button>
      </div>

      <Alert type="success">{notice}</Alert>
      <Alert>{error}</Alert>

      {!categories.length && !loading && (
        <div className="mb-4 rounded-xl border border-orange-200 bg-orange-50 p-3 text-sm text-orange-800">
          Create a category before adding products.
        </div>
      )}

      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative flex-1 min-w-[220px]">
          <Search
            size={17}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search products..."
            aria-label="Search products"
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
          {categories.map((item) => (
            <option key={item.categoryId} value={item.categoryId}>
              {item.name}
            </option>
          ))}
        </select>
        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
          className={selectCls}
          aria-label="Filter by status"
        >
          <option value="">All Statuses</option>
          <option value="in">In Stock</option>
          <option value="low">Low Stock</option>
          <option value="out">Out of Stock</option>
        </select>

        <button
          type="button"
          onClick={loadProducts}
          disabled={loading}
          title="Refresh products"
          className="h-11 w-11 grid place-items-center rounded-xl border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50"
        >
          {" "}
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px]">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                {[
                  "Image",
                  "Name",
                  "Category",
                  "Price (KSh)",
                  "Stock",
                  "Status",
                ].map((heading) => (
                  <th key={heading} className="th px-5">
                    {heading}
                  </th>
                ))}
                <th className="th px-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody
              className={`divide-y divide-slate-100 transition-opacity ${loading ? "opacity-50" : ""}`}
            >
              {visibleItems.map((product) => {
                const [label, cls] = PILL[stockStatus(product)];
                return (
                  <tr
                    key={product.productId}
                    className="h-[64px] hover:bg-slate-50/60"
                  >
                    <td className="td px-5">
                      <Thumb src={product.imageUrl} name={product.name} />
                    </td>

                    <td className="td px-5 text-[13.5px] font-medium">
                      {product.name}
                    </td>

                    <td className="td px-5 text-slate-500">{product.sku}</td>

                    <td className="td px-5 text-slate-500">
                      {categoryMap.get(String(product.categoryId)) || "—"}
                    </td>

                    <td className="td px-5">
                      {Number(product.sellingPrice || 0).toLocaleString(
                        "en-KE",
                      )}
                    </td>

                    <td className="td px-5">
                      {Number(product.stockQuantity || 0).toLocaleString(
                        "en-KE",
                      )}
                    </td>

                    <td className="td px-5">
                      <span
                        className={`px-2.5 py-1 rounded-md text-[11.5px] font-medium ${cls}`}
                      >
                        {label}
                      </span>
                    </td>

                    <td className="td px-5">
                      <div className="flex justify-end gap-1">
                        <button
                          onClick={() => setModal({ product })}
                          aria-label={`Edit ${product.name}`}
                          className="p-2 rounded-lg text-blue-600 hover:bg-blue-50"
                        >
                          <Pencil size={16} />
                        </button>

                        <button
                          onClick={() => setConfirm(product)}
                          aria-label={`Deactivate ${product.name}`}
                          className="p-2 rounded-lg text-red-500 hover:bg-red-50"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!loading && !visibleItems.length && (
                <tr>
                  <td colSpan="8" className="py-14 text-center text-slate-500">
                    <Package
                      size={30}
                      className="mx-auto mb-2 text-slate-300"
                    />
                    {search || category || status
                      ? "No products match your filters."
                      : "No products yet. Click Add Product to create your first one."}
                  </td>
                </tr>
              )}
              {loading && !items.length && (
                <tr>
                  <td colSpan="7" className="py-14 text-center">
                    <Loader2 className="animate-spin text-brand inline" />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 border-t border-slate-100 text-[12.5px] text-slate-500">
          <span>
            Showing {from}–{to} of {total.toLocaleString()} products
          </span>
          <nav className="flex items-center gap-1.5" aria-label="Pagination">
            <button
              disabled={currentPage <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              aria-label="Previous page"
              className="w-8 h-8 grid place-items-center rounded-lg border border-slate-200 bg-white disabled:opacity-40"
            >
              <ChevronLeft size={15} />
            </button>
            <span>
              Page {currentPage} of {pages}
            </span>

            <button
              disabled={currentPage >= pages}
              onClick={() => setPage((p) => Math.min(pages, p + 1))}
              className="w-8 h-8 grid place-items-center rounded-lg border border-slate-200 disabled:opacity-40"
            >
              <ChevronRight size={15} />
            </button>
          </nav>
        </div>
      </div>

      {modal && (
        <ProductModal
          product={modal.product}
          categories={categories}
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
            <h2 className="text-lg font-bold">Deactivate product?</h2>
            <p className="text-[14px] text-slate-500 mt-2">
              “{confirm.name}” will no longer appear in the product catalogue.
              Existing sales records will remain intact.
            </p>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setConfirm(null)}
                className="h-10 px-4 rounded-[10px] border border-line text-[14px] font-medium hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={onDelete}
                disabled={deleting}
                className="h-10 px-5 rounded-[10px] bg-red-600 hover:bg-red-700 text-white text-[14px] font-semibold inline-flex items-center gap-2 disabled:opacity-70"
              >
                {deleting && <Loader2 size={15} className="animate-spin" />}{" "}
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
