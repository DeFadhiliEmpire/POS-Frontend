import { db } from "../db/db.js";

window.db = db;

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

const MAX_IMAGE_SIZE = 2 * 1024 * 1024;

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

export const validateCatalogueImage = (file) => {
  if (!file) return;

  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error("Choose a JPG, PNG or WEBP image.");
  }

  if (file.size > MAX_IMAGE_SIZE) {
    throw new Error("Image must not exceed 2MB.");
  }
};

export const saveCatalogueImageLocally = async ({
  entityType,
  entityId,
  file,
}) => {
  if (!file) return;

  validateCatalogueImage(file);

  // A new file must be uploaded separately.
  // Do not reuse the previous file's Cloudinary details.
  await db.catalogueImages.put({
    entityType,
    entityId,
    blob: file,
    fileName: file.name,
    mimeType: file.type,
    size: file.size,
    status: "pending",
    uploadedImage: null,
    createdAt: new Date().toISOString(),
  });
};

export const getLocalCatalogueImage = async (entityType, entityId) => {
  return db.catalogueImages.get([entityType, entityId]);
};

export const uploadCatalogueImage = async (file, token) => {
  validateCatalogueImage(file);

  const formData = new FormData();
  formData.append("image", file);

  const res = await fetch(`${API_URL}/uploads/catalogue-image`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  const data = await res.json();

  if (
    !res.ok ||
    !data.success ||
    !data.image?.imageUrl ||
    !data.image?.imagePublicId
  ) {
    throw new Error(data.message || "Image upload failed.");
  }

  return data.image;
};
