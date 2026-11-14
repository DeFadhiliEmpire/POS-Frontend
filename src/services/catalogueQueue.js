import { db } from "../db/db.js";

window.db = db;

const createCategoryId = () => crypto.randomUUID();
const createObjectId = () => crypto.randomUUID();

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
    .first();

  if (existing?.status === "syncing") {
    throw new Error("This item is currently synchronizing. Try again shortly.");
  }

  if (existing?.status === "conflict") {
    throw new Error(
      "This item has a synchronization conflict. Resolve it before editing.",
    );
  }

  const isPending = existing?.status === "pending";
  const isPendingCreate = isPending && existing.action === "create";

  // A pending create can be cancelled if the item is deactivated
  // before it has ever reached the server.
  if (isPendingCreate && action === "deactivate") {
    await db.catalogueSync.delete(existing.id);
    return null;
  }

  if (existing) {
    const operationId = isPending ? existing.operationId : createOperationId();

    // Preserve the original create operation.
    if (isPendingCreate) {
      await db.catalogueSync.update(existing.id, {
        operationId,
        action: "create",
        baseVersion: 0,
        payload: {
          ...existing.payload,
          ...payload,
        },
        status: "pending",
        attempts: 0,
        nextRetryAt: null,
        lastError: null,
        updatedAt: new Date().toISOString(),
      });

      return operationId;
    }

    // For ordinary pending operations, keep the original baseVersion
    // but replace the payload with the latest intended state.
    await db.catalogueSync.update(existing.id, {
      operationId,
      action,
      baseVersion: isPending ? existing.baseVersion : baseVersion,
      payload,
      status: "pending",
      attempts: 0,
      nextRetryAt: null,
      lastError: null,
      updatedAt: new Date().toISOString(),
    });

    return operationId;
  }

  const operationId = createOperationId();
  const now = new Date().toISOString();

  await db.catalogueSync.add({
    operationId,
    entityType,
    entityId,
    action,
    baseVersion,
    payload,
    status: "pending",
    attempts: 0,
    nextRetryAt: null,
    lastError: null,
    createdAt: now,
    updatedAt: now,
  });

  return operationId;
};

export {
  createCategoryId,
  createObjectId,
  createOperationId,
  queueCatalogueOperation,
};
