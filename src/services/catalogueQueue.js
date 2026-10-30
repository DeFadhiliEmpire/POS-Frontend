import { db } from "../db/db.js";

const createObjectId = () => {
  const bytes = crypto.getRandomValues(new Uint8Array(12));

  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
};

const createOperationId = () => crypto.randomUUID();

const queueCatalogueOperation = async ({
  entityType,
  entityId,
  action,
  baseVersion,
  payload,
}) => {
  const existing = await db.catalogueSync
    .where("[entityType+entityId]")
    .equals([entityType, entityId])
    .filter((operation) => operation.status === "pending")
    .first();

  // Coalesce multiple unsynced edits into one operation.
  if (existing) {
    if (existing.action === "create") {
      await db.catalogueSync.update(existing.id, {
        payload: {
          ...existing.payload,
          ...payload,
        },
        updatedAt: new Date().toISOString(),
      });

      return existing.operationId;
    }

    if (action === "deactivate") {
      await db.catalogueSync.update(existing.id, {
        action: "deactivate",
        payload: {},
        updatedAt: new Date().toISOString(),
      });

      return existing.operationId;
    }

    await db.catalogueSync.update(existing.id, {
      payload: {
        ...existing.payload,
        ...payload,
      },
      updatedAt: new Date().toISOString(),
    });

    return existing.operationId;
  }

  const conflicted = await db.catalogueSync
    .where("[entityType+entityId]")
    .equals([entityType, entityId])
    .filter((operation) => operation.status === "conflict")
    .first();

  if (conflicted) {
    throw new Error(
      "This item has a synchronization conflict. Resolve it before editing again.",
    );
  }

  const operationId = createOperationId();

  await db.catalogueSync.add({
    operationId,
    entityType,
    entityId,
    action,
    baseVersion,
    payload,
    status: "pending",
    attempts: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  return operationId;
};

export { createObjectId, queueCatalogueOperation };
