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

  // A locally created category has not reached the server yet.
  // If it is deactivated before synchronization, cancel its create operation.
  if (
    existing?.status === "pending" &&
    existing.action === "create" &&
    action === "status" &&
    payload?.isActive === false
  ) {
    await db.catalogueSync.delete(existing.id);
    return existing.operationId;
  }

  if (existing) {
    const isPending = existing.status === "pending";
    const isPendingCreate = isPending && existing.action === "create";

    const operationId = isPending ? existing.operationId : createOperationId();

    await db.catalogueSync.update(existing.id, {
      operationId,

      action: isPendingCreate ? "create" : action,

      baseVersion: isPending ? existing.baseVersion : baseVersion,

      payload: isPendingCreate
        ? { ...existing.payload, ...payload }
        : isPending
          ? { ...existing.payload, ...payload }
          : payload,

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
