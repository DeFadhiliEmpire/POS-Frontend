import { db } from "../db/db.js";
import { getDeviceId } from "../db/device.js";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

const MAX_OPERATIONS = 50;
const MAX_DOWNLOAD_PAGES = 10;

const getCursor = async () => {
  const record = await db.syncMeta.get("catalogueCursor");
  return record?.value ?? 0;
};

const saveCursor = async (value) => {
  await db.syncMeta.put({
    key: "catalogueCursor",
    value,
  });
};

const getPendingOperations = async () => {
  const now = Date.now();

  const pending = await db.catalogueSync
    .where("status")
    .equals("pending")
    .toArray();

  return pending
    .filter(
      (operation) =>
        !operation.nextRetryAt ||
        new Date(operation.nextRetryAt).getTime() <= now,
    )
    .sort((a, b) => {
      // Categories must arrive before products that depend on them.
      if (a.entityType !== b.entityType) {
        return a.entityType === "category" ? -1 : 1;
      }

      return new Date(a.createdAt) - new Date(b.createdAt);
    })
    .slice(0, MAX_OPERATIONS);
};

const updateLocalEntityAfterUpload = async (operation, result) => {
  const table =
    operation.entityType === "product" ? db.products : db.categories;

  await table.update(operation.entityId, {
    version: result.serverVersion,
    syncStatus: "synced",
    lastSyncedAt: new Date().toISOString(),
  });
};

const processResults = async (operations, results) => {
  for (const result of results) {
    const operation = operations.find(
      (item) => item.operationId === result.operationId,
    );

    if (!operation) continue;

    if (result.status === "synced" || result.status === "already_synced") {
      await db.catalogueSync.update(operation.id, {
        status: "synced",
        serverVersion: result.serverVersion,
        syncedAt: new Date().toISOString(),
        lastError: null,
      });

      await updateLocalEntityAfterUpload(operation, result);
    } else if (result.status === "conflict") {
      await db.catalogueSync.update(operation.id, {
        status: "conflict",
        lastError: result.message,
      });

      const table =
        operation.entityType === "product" ? db.products : db.categories;

      await table.update(operation.entityId, {
        syncStatus: "conflict",
        lastError: result.message,
      });
    } else {
      await db.catalogueSync.update(operation.id, {
        status: "failed",
        lastError: result.message || "Catalogue operation failed",
      });
    }
  }
};

const applyDownloadedChanges = async (changes) => {
  await db.transaction(
    "rw",
    db.products,
    db.categories,
    db.catalogueSync,
    async () => {
      for (const category of changes.categories || []) {
        const categoryId = String(category._id);

        const pending = await db.catalogueSync
          .where("[entityType+entityId]")
          .equals(["category", categoryId])
          .filter((item) => ["pending", "conflict"].includes(item.status))
          .first();

        if (pending) continue;

        await db.categories.put({
          categoryId,
          name: category.name,
          description: category.description || "",
          isActive: category.isActive,
          version: category.version,
          syncStatus: "synced",
          lastSyncedAt: new Date().toISOString(),
        });
      }

      for (const product of changes.products || []) {
        const productId = String(product._id);

        const pending = await db.catalogueSync
          .where("[entityType+entityId]")
          .equals(["product", productId])
          .filter((item) => ["pending", "conflict"].includes(item.status))
          .first();

        if (pending) continue;

        await db.products.put({
          productId,
          name: product.name,
          sku: product.sku,
          barcode: product.barcode || "",
          categoryId: String(product.category),
          buyingPrice: product.buyingPrice,
          sellingPrice: product.sellingPrice,
          lowStockThreshold: product.lowStockThreshold,
          stockQuantity: product.stockQuantity ?? 0,
          unit: product.unit,
          imageUrl: product.imageUrl || "",
          isActive: product.isActive,
          version: product.version,
          syncStatus: "synced",
          lastSyncedAt: new Date().toISOString(),
        });
      }
    },
  );
};

const sendCatalogueBatch = async (token, operations, cursor) => {
  const response = await fetch(`${API_URL}/sync/catalogue`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      "x-device-id": await getDeviceId(),
    },
    body: JSON.stringify({
      deviceId: await getDeviceId(),
      lastSyncCursor: cursor,
      operations: operations.map((operation) => ({
        operationId: operation.operationId,
        entityType: operation.entityType,
        entityId: operation.entityId,
        action: operation.action,
        baseVersion: operation.baseVersion,
        payload: operation.payload,
      })),
    }),
  });

  const data = await response.json();

  if (!response.ok || !data.success) {
    throw new Error(data.message || "Catalogue synchronization failed");
  }

  return data;
};

const syncCatalogue = async (getToken) => {
  if (!navigator.onLine) {
    return {
      success: false,
      offline: true,
      message: "Device is offline",
    };
  }

  const token = await getToken();

  if (!token) {
    throw new Error("Authentication required for catalogue synchronization");
  }

  const bootstrapped = await db.syncMeta.get("catalogueBootstrapped");

  if (!bootstrapped?.value) {
    await bootstrapCatalogue(token);
  }

  let cursor = await getCursor();
  let uploaded = 0;
  let conflicts = 0;
  let failed = 0;

  // Upload pending operations, then download all available pages.
  const operations = await getPendingOperations();

  let data;

  try {
    data = await sendCatalogueBatch(token, operations, cursor);
  } catch (error) {
    // Network/server failure: preserve operation IDs and retry later.
    for (const operation of operations) {
      const attempts = (operation.attempts || 0) + 1;
      const delay = Math.min(1000 * 2 ** attempts, 300000);

      await db.catalogueSync.update(operation.id, {
        attempts,
        nextRetryAt: new Date(Date.now() + delay).toISOString(),
        lastError: error.message,
      });
    }

    throw error;
  }

  await processResults(operations, data.results || []);
  await applyDownloadedChanges(data.changes || {});

  uploaded += (data.results || []).filter(
    (item) => item.status === "synced" || item.status === "already_synced",
  ).length;

  conflicts += (data.results || []).filter(
    (item) => item.status === "conflict",
  ).length;

  failed += (data.results || []).filter(
    (item) => item.status === "failed",
  ).length;

  cursor = data.nextSyncCursor ?? cursor;
  await saveCursor(cursor);

  // Fetch additional pages without uploading operations again.
  for (let page = 1; page < MAX_DOWNLOAD_PAGES && data.hasMore; page++) {
    data = await sendCatalogueBatch(token, [], cursor);

    await applyDownloadedChanges(data.changes || {});

    cursor = data.nextSyncCursor ?? cursor;
    await saveCursor(cursor);
  }

  return {
    success: true,
    uploaded,
    conflicts,
    failed,
    cursor,
    hasMore: Boolean(data.hasMore),
  };
};

const startAutomaticCatalogueSync = (getToken, onResult) => {
  let running = false;
  let retryTimer = null;
  let stopped = false;

  const scheduleRetry = async () => {
    if (stopped || !navigator.onLine) return;

    if (retryTimer) {
      clearTimeout(retryTimer);
      retryTimer = null;
    }

    const pending = await db.catalogueSync
      .where("status")
      .equals("pending")
      .toArray();

    if (!pending.length) return;

    const now = Date.now();

    const nextRetry = pending
      .map((operation) =>
        operation.nextRetryAt ? new Date(operation.nextRetryAt).getTime() : now,
      )
      .reduce((earliest, time) => Math.min(earliest, time), Infinity);

    const delay = Math.max(0, nextRetry - now);

    retryTimer = setTimeout(runSync, delay);
  };

  const runSync = async () => {
    if (running || stopped || !navigator.onLine) return;

    running = true;

    try {
      const result = await syncCatalogue(getToken);
      onResult?.(result);
    } catch (error) {
      console.error("Automatic catalogue sync failed:", error);
      onResult?.({
        success: false,
        message: error.message,
      });
    } finally {
      running = false;
      await scheduleRetry();
    }
  };

  const handleOnline = () => {
    if (retryTimer) {
      clearTimeout(retryTimer);
      retryTimer = null;
    }

    runSync();
  };

  window.addEventListener("online", handleOnline);

  runSync();

  return () => {
    stopped = true;

    if (retryTimer) {
      clearTimeout(retryTimer);
    }

    window.removeEventListener("online", handleOnline);
  };
};

const bootstrapCatalogue = async (token) => {
  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

  const deviceId = await getDeviceId();

  const res = await fetch(`${API_URL}/sync/catalogue/bootstrap`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "x-device-id": deviceId,
    },
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.message || "Catalogue bootstrap failed");
  }

  await applyDownloadedChanges({
    categories: data.snapshot.categories,
    products: data.snapshot.products,
  });

  await saveCursor(data.snapshot.cursor);

  await db.syncMeta.put({
    key: "catalogueBootstrapped",
    value: true,
  });

  return data.snapshot;
};

export { startAutomaticCatalogueSync, syncCatalogue };
