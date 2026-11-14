import { db } from "../db/db.js";
import { createCategoryId, queueCatalogueOperation } from "./catalogueQueue.js";

window.db = db;

const normalizeCategoryName = (name) =>
  name.trim().normalize("NFKC").toLowerCase();

/*
 * Request catalogue synchronization after a successful
 * local transaction.
 */
const requestCatalogueSync = () => {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("catalogue:sync-requested"));
  }
};

const createCategory = async ({ name, description = "" }) => {
  if (!name?.trim()) {
    throw new Error("Category name is required");
  }

  const cleanName = name.trim();
  const cleanDescription = description.trim();
  const normalizedName = normalizeCategoryName(cleanName);

  const category = await db.transaction(
    "rw",
    db.categories,
    db.catalogueSync,
    async () => {
      const duplicate = await db.categories
        .filter((category) => category.normalizedName === normalizedName)
        .first();

      if (duplicate) {
        throw new Error("A category with this name already exists");
      }

      const categoryUid = createCategoryId();
      const now = new Date().toISOString();

      const newCategory = {
        categoryId: categoryUid,
        categoryUid,
        serverId: null,
        name: cleanName,
        normalizedName,
        description: cleanDescription,
        isActive: true,
        version: 0,
        syncStatus: "pending",
        lastSyncedAt: null,
        lastError: null,
        createdAt: now,
        updatedAt: now,
      };

      await db.categories.add(newCategory);

      await queueCatalogueOperation({
        entityType: "category",
        entityId: categoryUid,
        action: "create",
        baseVersion: 0,
        payload: {
          categoryUid,
          name: cleanName,
          description: cleanDescription,
        },
      });

      return newCategory;
    },
  );

  //Dispatch only after the transaction has committed
  requestCatalogueSync();

  return category;
};

const updateCategory = async (categoryId, changes) => {
  const updated = await db.transaction(
    "rw",
    db.categories,
    db.catalogueSync,
    async () => {
      const category = await db.categories.get(categoryId);

      if (!category || !category.isActive) {
        throw new Error("Category not found or inactive");
      }

      if (category.syncStatus === "conflict") {
        throw new Error("Resolve this category's sync conflict first");
      }

      const existingOperation = await db.catalogueSync
        .where("[entityType+entityId]")
        .equals(["category", categoryId])
        .first();

      const hasPendingCreate =
        existingOperation?.status === "pending" &&
        existingOperation.action === "create";

      if ((category.version ?? 0) < 1 && !hasPendingCreate) {
        throw new Error(
          "This category has not synchronized yet. Try again after its creation syncs.",
        );
      }

      const name = changes.name ?? category.name;
      const description = changes.description ?? category.description;

      if (!name?.trim()) {
        throw new Error("Category name is required");
      }

      const cleanName = name.trim();
      const cleanDescription = description.trim();
      const normalizedName = normalizeCategoryName(cleanName);

      const duplicate = await db.categories
        .filter(
          (item) =>
            item.categoryId !== categoryId &&
            item.normalizedName === normalizedName,
        )
        .first();

      if (duplicate) {
        throw new Error("Another category already uses this name");
      }

      const now = new Date().toISOString();

      const updatedCategory = {
        ...category,
        categoryId,
        categoryUid: category.categoryUid || categoryId,
        name: cleanName,
        normalizedName,
        description: cleanDescription,
        syncStatus: "pending",
        lastError: null,
        updatedAt: now,
      };

      await db.categories.put(updatedCategory);

      await queueCatalogueOperation({
        entityType: "category",
        entityId: categoryId,
        action: "update",
        baseVersion: category.version ?? 0,
        payload: {
          name: cleanName,
          description: cleanDescription,
        },
      });

      return updatedCategory;
    },
  );

  requestCatalogueSync();

  return updated;
};

{
  /*const deactivateCategory = async (categoryId) => {
  const result = await db.transaction(
    "rw",
    db.categories,
    db.products,
    db.catalogueSync,
    async () => {
      const category = await db.categories.get(categoryId);

      if (!category || !category.isActive) {
        throw new Error("Category not found or already inactive");
      }

      if (category.syncStatus === "conflict") {
        throw new Error("Resolve this category's sync conflict first");
      }

      const existingOperation = await db.catalogueSync
        .where("[entityType+entityId]")
        .equals(["category", categoryId])
        .first();

      const hasPendingCreate =
        existingOperation?.status === "pending" &&
        existingOperation.action === "create";

      if ((category.version ?? 0) < 1 && !hasPendingCreate) {
        throw new Error(
          "This category has not synchronized yet. Try again after its creation syncs.",
        );
      }

      const dependentProducts = await db.products
        .where("categoryId")
        .equals(categoryId)
        .filter((product) => product.isActive)
        .count();

      if (dependentProducts > 0) {
        throw new Error(
          "Move active products to another category before deactivating this category",
        );
      }

      const now = new Date().toISOString();

      await db.categories.update(categoryId, {
        isActive: false,
        syncStatus: "pending",
        lastError: null,
        updatedAt: now,
      });

      await queueCatalogueOperation({
        entityType: "category",
        entityId: categoryId,
        action: "deactivate",
        baseVersion: category.version ?? 0,
        payload: {
          isActive: false,
        },
      });

      return {
        success: true,
        categoryId,
      };
    },
  );

  requestCatalogueSync();

  return result;
};*/
}

const getCategories = async () => {
  return db.categories
    .filter((category) => category.isActive === true)
    .toArray();
};

const getCategoryById = async (categoryId) => {
  return db.categories.get(categoryId);
};

export async function listCategories() {
  const [categories, products] = await Promise.all([
    db.categories.toArray(),
    db.products.toArray(),
  ]);

  const productCounts = new Map();

  for (const product of products) {
    if (!product.categoryId) continue;

    const count = productCounts.get(product.categoryId) || 0;
    productCounts.set(product.categoryId, count + 1);
  }

  const items = categories
    .map((category) => ({
      ...category,
      productCount: productCounts.get(category.categoryId) || 0,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return { items };
}

export async function setCategoryActive(categoryId, isActive) {
  if (!categoryId) {
    throw new Error("Category ID is required.");
  }

  if (typeof isActive !== "boolean") {
    throw new Error("Category status must be a boolean.");
  }

  const now = new Date().toISOString();

  const updatedCategory = await db.transaction(
    "rw",
    db.categories,
    db.products,
    db.catalogueSync,
    async () => {
      const category = await db.categories.get(categoryId);

      if (!category) {
        throw new Error("Category not found.");
      }

      if (category.isActive === isActive) {
        return category;
      }

      if (category.syncStatus === "conflict") {
        throw new Error("Resolve this category's sync conflict first.");
      }

      const existingOperation = await db.catalogueSync
        .where("[entityType+entityId]")
        .equals(["category", categoryId])
        .first();

      const hasPendingCreate =
        existingOperation?.status === "pending" &&
        existingOperation.action === "create";

      if ((category.version ?? 0) < 1 && !hasPendingCreate) {
        throw new Error(
          "This category has not synchronized yet. Try again after its creation syncs.",
        );
      }

      // Do not deactivate a category that still has active products.
      if (!isActive) {
        const dependentProducts = await db.products
          .where("categoryId")
          .equals(categoryId)
          .filter((product) => product.isActive)
          .count();

        if (dependentProducts > 0) {
          throw new Error(
            "Move active products to another category before deactivating this category.",
          );
        }
      }

      const updated = {
        ...category,
        isActive,
        syncStatus: "pending",
        lastError: null,
        updatedAt: now,
      };

      await db.categories.put(updated);

      // Preserve an unsynchronized creation.
      const action = hasPendingCreate
        ? "create"
        : isActive
          ? "activate"
          : "deactivate";

      await queueCatalogueOperation({
        entityType: "category",
        entityId: categoryId,
        action,
        baseVersion: hasPendingCreate ? 0 : category.version,
        payload:
          action === "create"
            ? {
                ...(existingOperation.payload || {}),
                name: updated.name,
                description: updated.description,
              }
            : { isActive },
      });

      return updated;
    },
  );

  requestCatalogueSync();

  return updatedCategory;
}

const deactivateCategory = (categoryId) => setCategoryActive(categoryId, false);

const activateCategory = (categoryId) => setCategoryActive(categoryId, true);

export {
  createCategory,
  updateCategory,
  deactivateCategory,
  activateCategory,
  getCategories,
  getCategoryById,
};
