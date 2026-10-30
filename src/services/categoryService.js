import { db } from "../db/db.js";
import { createObjectId, queueCatalogueOperation } from "./catalogueQueue.js";

const createCategory = async ({ name, description = "" }) => {
  if (!name?.trim()) {
    throw new Error("Category name is required");
  }

  return db.transaction("rw", db.categories, db.catalogueSync, async () => {
    const normalizedName = name.trim().toLowerCase();

    const duplicate = await db.categories
      .filter(
        (category) =>
          category.name?.trim().toLowerCase() === normalizedName &&
          category.isActive,
      )
      .first();

    if (duplicate) {
      throw new Error("A category with this name already exists");
    }

    const categoryId = createObjectId();

    const category = {
      categoryId,
      name: name.trim(),
      description,
      isActive: true,
      version: 0,
      syncStatus: "pending",
    };

    await db.categories.add(category);

    await queueCatalogueOperation({
      entityType: "category",
      entityId: categoryId,
      action: "create",
      baseVersion: 0,
      payload: {
        name: category.name,
        description: category.description,
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

    const normalizedName = name.trim().toLowerCase();

    const duplicate = await db.categories
      .filter(
        (item) =>
          item.categoryId !== categoryId &&
          item.isActive &&
          item.name?.trim().toLowerCase() === normalizedName,
      )
      .first();

    if (duplicate) {
      throw new Error("Another category already uses this name");
    }

    const updated = {
      ...category,
      name: name.trim(),
      description,
      syncStatus: "pending",
    };

    await db.categories.put(updated);

    await queueCatalogueOperation({
      entityType: "category",
      entityId: categoryId,
      action: "update",
      baseVersion: category.version || 1,
      payload: {
        name: updated.name,
        description: updated.description,
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

      await db.categories.update(categoryId, {
        isActive: false,
        syncStatus: "pending",
      });

      await queueCatalogueOperation({
        entityType: "category",
        entityId: categoryId,
        action: "deactivate",
        baseVersion: category.version || 1,
        payload: {},
      });

      return { success: true };
    },
  );
};

const getCategories = async () => {
  return db.categories.filter((category) => category.isActive).toArray();
};

const getCategoryById = async (categoryId) => {
  return db.categories.get(categoryId);
};

export {
  createCategory,
  updateCategory,
  deactivateCategory,
  getCategories,
  getCategoryById,
};
