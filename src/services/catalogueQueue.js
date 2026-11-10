import { db } from "../db/db.js";

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
    const isPendingCreate = existing.action === "create";

    await db.catalogueSync.update(existing.id, {
      operationId:
        existing.status === "pending"
          ? existing.operationId
          : createOperationId(),

      action: isPendingCreate ? "create" : action,

      baseVersion:
        existing.status === "pending" ? existing.baseVersion : baseVersion,

      payload: isPendingCreate ? { ...existing.payload, ...payload } : payload,

      status: "pending",
      error: null,
      updatedAt: new Date().toISOString(),
    });

    return existing.operationId;
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

export {
  createCategoryId,
  createObjectId,
  createOperationId,
  queueCatalogueOperation,
};
