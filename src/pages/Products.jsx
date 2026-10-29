import { useEffect, useRef, useState } from "react";
import { X, ImagePlus, Loader2, Trash2 } from "lucide-react";
import Alert from "../components/Alert";

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
}
