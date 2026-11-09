import { db } from "../db/db.js";
import {
  createCategoryRemote,
  updateCategoryRemote,
  updateCategoryStatusRemote,
} from "./categoryApi";

let isCategorySyncRunning = false;

export async function syncPendingCategories(token) {
  if (isCategorySyncRunning || !navigator.onLine || !token) {
    return;
  }

  isCategorySyncRunning = true;

  try {
    const operations = await db.catalogueSync
      .where("entityType")
      .equals("category")
      .and((item) => item.status === "pending")
      .sortBy("createdAt");

    for (const operation of operations) {
      if (!navigator.onLine) break;

      await db.catalogueSync.update(operation.id, {
        status: "syncing",
        attempts: (operation.attempts || 0) + 1,
        updatedAt: new Date(),
      });

      try {
        let result;

        switch (operation.action) {
          case "create":
            result = await createCategoryRemote(token, operation.payload);
            break;

          case "update":
            result = await updateCategoryRemote(
              token,
              operation.entityId,
              operation.payload,
            );
            break;

          case "status":
            result = await updateCategoryStatusRemote(
              token,
              operation.entityId,
              operation.payload,
            );
            break;

          default:
            throw new Error(`Unknown category operation: ${operation.action}`);
        }

        const serverCategory = result.category;

        await db.transaction(
          "rw",
          db.categories,
          db.catalogueSync,
          async () => {
            const localCategory = await db.categories.get(operation.entityId);

            if (localCategory) {
              await db.categories.put({
                ...localCategory,

                // Preserve the stable local identity.
                categoryId: serverCategory.categoryUid,

                // Keep MongoDB identity separately.
                serverId: serverCategory._id,

                name: serverCategory.name,
                normalizedName: serverCategory.normalizedName,
                description: serverCategory.description,
                isActive: serverCategory.isActive,
                version: serverCategory.version,
                updatedAt: serverCategory.updatedAt,

                syncStatus: "synced",
              });
            }

            await db.catalogueSync.update(operation.id, {
              status: "synced",
              serverVersion: serverCategory.version,
              lastSyncedAt: new Date(),
              updatedAt: new Date(),
              error: null,
            });
          },
        );
      } catch (error) {
        console.error(
          "Category synchronization failed:",
          operation.entityId,
          error,
        );

        const isConflict = error.status === 409;

        const isPermanent =
          error.status >= 400 &&
          error.status < 500 &&
          !isConflict &&
          error.status !== 429;

        const nextStatus = isConflict
          ? "conflict"
          : isPermanent
            ? "failed"
            : "pending";

        await db.transaction(
          "rw",
          db.categories,
          db.catalogueSync,
          async () => {
            const localCategory = await db.categories.get(operation.entityId);

            if (localCategory) {
              await db.categories.update(operation.entityId, {
                syncStatus: nextStatus,
              });
            }

            await db.catalogueSync.update(operation.id, {
              status: nextStatus,
              error: error.message,
              serverCategory: error.data?.category || null,
              updatedAt: new Date(),
            });
          },
        );

        // Don't continue uploading dependent catalogue
        // operations after a category failure.
        if (
          !navigator.onLine ||
          error.status >= 500 ||
          !error.status ||
          isConflict
        ) {
          break;
        }
      }
    }
  } finally {
    isCategorySyncRunning = false;
  }
}
