import { db } from "../db/db.js";
import { createCategoryId, queueCatalogueOperation } from "./catalogueQueue.js";

const normalizeCategoryName = (name) =>
  name.trim().normalize("NFKC").toLowerCase();

const createCategory = async ({ name, description = "" }) => {
  if (!name?.trim()) {
    throw new Error("Category name is required");
  }

  const cleanName = name.trim();
  const cleanDescription = description.trim();
  const normalizedName = normalizeCategoryName(cleanName);

  return db.transaction("rw", db.categories, db.catalogueSync, async () => {
    const duplicate = await db.categories
      .filter(
        (category) =>
          category.normalizedName === normalizedName && category.isActive,
      )
      .first();

    if (duplicate) {
      throw new Error("A category with this name already exists");
    }

    const categoryId = createCategoryId();
    const now = new Date().toISOString();

    const category = {
      categoryId,
      name: cleanName,
      normalizedName,
      description: cleanDescription,
      isActive: true,
      version: 0,
      syncStatus: "pending",
      createdAt: now,
      updatedAt: now,
    };

    await db.categories.add(category);

    await queueCatalogueOperation({
      entityType: "category",
      entityId: categoryId,
      action: "create",
      baseVersion: 0,
      payload: {
        categoryUid: categoryId,
        name: cleanName,
        description: cleanDescription,
      },
    });

    return category;
  });
};

const updateCategory = async (categoryId, changes) => {
  return db.transaction("rw", db.categories, db.catalogueSync, async () => {
    const category = await db.categories.get(categoryId);

    if (!category || !category.isActive) {
      throw new Error("Category not found or inactive");
    }

    if (category.syncStatus === "conflict") {
      throw new Error("Resolve this category's sync conflict first");
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
          item.isActive &&
          item.normalizedName === normalizedName,
      )
      .first();

    if (duplicate) {
      throw new Error("Another category already uses this name");
    }

    const now = new Date().toISOString();

    const updated = {
      ...category,
      name: cleanName,
      normalizedName,
      description: cleanDescription,
      syncStatus: "pending",
      updatedAt: now,
    };

    await db.categories.put(updated);

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

    return updated;
  });
};

const deactivateCategory = async (categoryId) => {
  return db.transaction(
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
        updatedAt: now,
      });

      await queueCatalogueOperation({
        entityType: "category",
        entityId: categoryId,
        action: "status",
        baseVersion: category.version ?? 0,
        payload: { isActive: false },
      });

      return { success: true };
    },
  );
};

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

  return db.transaction("rw", db.categories, db.catalogueSync, async () => {
    const category = await db.categories.get(categoryId);

    if (!category) {
      throw new Error("Category not found.");
    }

    // Nothing to change.
    if (category.isActive === isActive) {
      return category;
    }

    const updatedCategory = {
      ...category,
      isActive,
      syncStatus: "pending",
      updatedAt: now,
    };

    // Save immediately in IndexedDB.
    await db.categories.put(updatedCategory);

    // Find an existing pending operation for this category.
    const existingOperation = await db.catalogueSync.get([
      "category",
      categoryId,
    ]);

    let action = existingOperation?.action || "status";

    // Preserve an unsynchronized creation operation.
    if (action === "create") {
      action = "create";
    }

    // Preserve a pending update operation.
    if (action === "update") {
      action = "update";
    }

    const payload =
      action === "create"
        ? {
            ...(existingOperation?.payload || {}),
            ...updatedCategory,
          }
        : action === "update"
          ? {
              ...(existingOperation?.payload || {}),
              isActive,
            }
          : { isActive };

    await db.catalogueSync.put({
      operationId: existingOperation?.operationId || crypto.randomUUID(),

      entityType: "category",
      entityId: categoryId,
      action,

      baseVersion: existingOperation?.baseVersion ?? category.version ?? 0,

      payload,
      status: "pending",

      createdAt: existingOperation?.createdAt || now,
      updatedAt: now,
    });

    return updatedCategory;
  });
}

export {
  createCategory,
  updateCategory,
  deactivateCategory,
  getCategories,
  getCategoryById,
};
