import { db } from "../db/db.js";
import { getDeviceId } from "../db/device.js";
import { uploadCatalogueImage } from "./catalogueImageService.js";

window.db = db;

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

const MAX_OPERATIONS = 50;
const MAX_DOWNLOAD_PAGES = 10;

const CATEGORY_UID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const isCategoryUid = (value) =>
  typeof value === "string" && CATEGORY_UID_REGEX.test(value);

const CATALOGUE_SYNC_EVENT = "catalogue:sync-requested";

const nowISO = () => new Date().toISOString();

const getErrorMessage = (error) =>
  error instanceof Error ? error.message : String(error);

// --------------------------------------------------
// REQUEST CATALOGUE SYNC
// --------------------------------------------------

const handleCatalogueSyncRequest = () => {
  window.dispatchEvent(new Event(CATALOGUE_SYNC_EVENT));
};

// --------------------------------------------------
// SYNC CURSOR
// --------------------------------------------------

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

// --------------------------------------------------
// GET PENDING OPERATIONS
// --------------------------------------------------

const getPendingOperations = async () => {
  const now = Date.now();

  const pending = await db.catalogueSync
    .where("status")
    .equals("pending")
    .toArray();

  return pending
    .filter((operation) => {
      if (!operation.nextRetryAt) {
        return true;
      }

      const retryTime = new Date(operation.nextRetryAt).getTime();

      return Number.isFinite(retryTime) && retryTime <= now;
    })
    .sort((a, b) => {
      // Categories must be uploaded before dependent products.
      if (a.entityType !== b.entityType) {
        return a.entityType === "category" ? -1 : 1;
      }

      return (
        new Date(a.createdAt || 0).getTime() -
        new Date(b.createdAt || 0).getTime()
      );
    })
    .slice(0, MAX_OPERATIONS);
};

// --------------------------------------------------
// UPDATE LOCAL ENTITY AFTER SUCCESSFUL UPLOAD
// --------------------------------------------------

const updateLocalEntityAfterUpload = async (operation, result) => {
  const table =
    operation.entityType === "product" ? db.products : db.categories;

  const update = {
    syncStatus: "synced",
    lastSyncedAt: nowISO(),
    lastError: null,
  };

  if (result.serverVersion !== undefined) {
    update.version = result.serverVersion;
  }

  if (operation.entityType === "category") {
    // The category UUID remains the permanent local identity.
    update.categoryUid = operation.entityId;

    if (result.serverId) {
      // MongoDB _id is stored separately.
      update.serverId = String(result.serverId);
    }
  }

  if (operation.entityType === "product" && result.serverId) {
    update.serverId = String(result.serverId);
  }

  const updated = await table.update(operation.entityId, update);

  if (!updated) {
    console.warn(
      `Could not update local ${operation.entityType}:`,
      operation.entityId,
    );
  }
};

// --------------------------------------------------
// PROCESS SERVER RESULTS
// --------------------------------------------------

const processResults = async (operations, results) => {
  for (const result of results) {
    const operation = operations.find(
      (item) => item.operationId === result.operationId,
    );

    if (!operation) {
      continue;
    }

    const table =
      operation.entityType === "product" ? db.products : db.categories;

    const errorMessage = result.message || "Catalogue synchronization failed";

    if (result.status === "synced" || result.status === "already_synced") {
      await db.catalogueSync.update(operation.id, {
        status: "synced",
        serverVersion: result.serverVersion,
        syncedAt: nowISO(),
        attempts: 0,
        nextRetryAt: null,
        lastError: null,
      });

      await updateLocalEntityAfterUpload(operation, result);

      // Remove the local image queue record after successful product sync.
      if (operation.entityType === "product") {
        await db.catalogueImages.delete(["product", operation.entityId]);
      }
    } else if (result.status === "conflict") {
      await db.catalogueSync.update(operation.id, {
        status: "conflict",
        lastError: errorMessage,
        nextRetryAt: null,
      });

      await table.update(operation.entityId, {
        syncStatus: "conflict",
        lastError: errorMessage,
      });
    } else {
      // Failed operations are retained for inspection/manual retry.
      await db.catalogueSync.update(operation.id, {
        status: "failed",
        lastError: errorMessage,
        nextRetryAt: null,
      });

      await table.update(operation.entityId, {
        syncStatus: "failed",
        lastError: errorMessage,
      });
    }
  }
};

// --------------------------------------------------
// PREPARE PRODUCT CATEGORY REFERENCE
// --------------------------------------------------

const prepareProductCategoryReference = async (operation) => {
  const payload = { ...operation.payload };

  const localCategoryId =
    payload.categoryId || payload.categoryUid || payload.category;

  // If it is not a category UUID, leave the reference unchanged.
  // This supports payloads that already contain a MongoDB ObjectId.
  if (!localCategoryId || !isCategoryUid(String(localCategoryId))) {
    return operation;
  }

  const category = await db.categories.get(String(localCategoryId));

  if (!category) {
    throw new Error(
      `Local category ${localCategoryId} not found for this product`,
    );
  }

  // The category must exist on the server before this product
  // can reference it.
  if (!category.serverId) {
    return null;
  }

  /*
   * IMPORTANT:
   *
   * Local IndexedDB identity:
   * categoryId = categoryUid = UUID
   *
   * Server relationship:
   * category = MongoDB ObjectId
   *
   * The backend expects payload.category.
   */

  payload.category = String(category.serverId);

  // Preserve the UUID fields if they are part of the local payload.
  if (payload.categoryId) {
    payload.categoryId = String(localCategoryId);
  }

  if (payload.categoryUid) {
    payload.categoryUid = category.categoryUid;
  }

  return {
    ...operation,
    payload,
  };
};

// --------------------------------------------------
// PREPARE OPERATIONS BEFORE UPLOAD
// --------------------------------------------------

const prepareOperationsForUpload = async (operations) => {
  const prepared = [];

  for (const operation of operations) {
    if (operation.entityType !== "product") {
      prepared.push(operation);
      continue;
    }

    const preparedProduct = await prepareProductCategoryReference(operation);

    if (!preparedProduct) {
      /*
       * The category has not received a serverId yet.
       *
       * Do not repeatedly retry immediately.
       * The category must sync first.
       */

      await db.catalogueSync.update(operation.id, {
        nextRetryAt: new Date(Date.now() + 5000).toISOString(),
        lastError: "Waiting for the product category to synchronize",
      });

      continue;
    }

    prepared.push(preparedProduct);
  }

  return prepared;
};

// --------------------------------------------------
// APPLY DOWNLOADED CATEGORIES AND PRODUCTS
// --------------------------------------------------

const applyDownloadedChanges = async (changes = {}) => {
  await db.transaction(
    "rw",
    db.products,
    db.categories,
    db.catalogueSync,
    async () => {
      // ----------------------------------------------
      // DOWNLOAD CATEGORIES
      // ----------------------------------------------

      for (const category of changes.categories || []) {
        const categoryUid = String(category.categoryUid || "");

        if (!isCategoryUid(categoryUid)) {
          console.error(
            "Downloaded category has no valid categoryUid:",
            category,
          );

          continue;
        }

        const categoryServerId = category._id
          ? String(category._id)
          : category.serverId
            ? String(category.serverId)
            : null;

        if (!categoryServerId) {
          console.error(
            `Category ${categoryUid} has no MongoDB server ID`,
            category,
          );

          continue;
        }

        // Do not overwrite local changes that have not synced.
        const pending = await db.catalogueSync
          .where("[entityType+entityId]")
          .equals(["category", categoryUid])
          .filter((item) =>
            ["pending", "conflict", "syncing"].includes(item.status),
          )
          .first();

        if (pending) {
          continue;
        }

        await db.categories.put({
          categoryId: categoryUid,
          categoryUid,

          // MongoDB identity is separate from the UUID.
          serverId: categoryServerId,

          name: category.name,
          normalizedName:
            category.normalizedName ||
            String(category.name || "")
              .trim()
              .normalize("NFKC")
              .toLowerCase(),

          description: category.description || "",
          isActive: category.isActive ?? true,
          version: category.version ?? 1,

          syncStatus: "synced",
          lastSyncedAt: nowISO(),
          lastError: null,
        });
      }

      // ----------------------------------------------
      // DOWNLOAD PRODUCTS
      // ----------------------------------------------

      for (const product of changes.products || []) {
        if (!product._id && !product.serverId) {
          console.error("Downloaded product has no server ID:", product);

          continue;
        }

        const productId = String(product._id || product.serverId);

        // Do not overwrite a product with pending local changes.
        const pending = await db.catalogueSync
          .where("[entityType+entityId]")
          .equals(["product", productId])
          .filter((item) =>
            ["pending", "conflict", "syncing"].includes(item.status),
          )
          .first();

        if (pending) {
          continue;
        }

        let categoryUid = null;
        let categoryServerId = null;

        if (product.category && typeof product.category === "object") {
          categoryUid = product.category.categoryUid || null;

          categoryServerId = product.category._id
            ? String(product.category._id)
            : product.category.serverId
              ? String(product.category.serverId)
              : null;
        } else if (product.category) {
          categoryServerId = String(product.category);
        }

        /*
         * If the populated category contains categoryUid,
         * use it directly.
         *
         * Otherwise, resolve its MongoDB ID against the
         * local category records.
         */

        if (!categoryUid && categoryServerId) {
          const localCategory = await db.categories
            .filter((item) => String(item.serverId) === categoryServerId)
            .first();

          categoryUid =
            localCategory?.categoryUid || localCategory?.categoryId || null;
        }

        /*
         * Never save a MongoDB category ObjectId inside
         * the local categoryId field.
         */

        if (!categoryUid || !isCategoryUid(categoryUid)) {
          console.warn(
            `Product ${productId} was not applied because its category UUID could not be resolved.`,
          );

          continue;
        }

        await db.products.put({
          productId,
          serverId: productId,

          name: product.name,
          sku: product.sku,
          barcode: product.barcode || "",

          // Always store the local category UUID here.
          categoryId: categoryUid,

          buyingPrice: product.buyingPrice,
          sellingPrice: product.sellingPrice,

          lowStockThreshold: product.lowStockThreshold,
          stockQuantity: product.stockQuantity ?? 0,

          unit: product.unit,

          imageUrl: product.imageUrl || "",
          imagePublicId: product.imagePublicId || "",

          isActive: product.isActive ?? true,
          version: product.version ?? 1,

          syncStatus: "synced",
          lastSyncedAt: nowISO(),
          lastError: null,
        });
      }
    },
  );
};

// --------------------------------------------------
// SEND OPERATIONS TO BACKEND
// --------------------------------------------------

const sendCatalogueBatch = async (token, operations, cursor) => {
  const deviceId = await getDeviceId();

  const res = await fetch(`${API_URL}/sync/catalogue`, {
    method: "POST",

    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      "x-device-id": deviceId,
    },

    body: JSON.stringify({
      deviceId,
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

  const data = await res.json();

  if (!res.ok || !data.success) {
    throw new Error(data.message || "Catalogue synchronization failed");
  }

  return data;
};

// --------------------------------------------------
// PREPARE PRODUCT IMAGES
// --------------------------------------------------

const prepareCatalogueImages = async (operations, token) => {
  const prepared = [];

  for (const operation of operations) {
    if (operation.entityType !== "product") {
      prepared.push(operation);
      continue;
    }

    const image = await db.catalogueImages.get(["product", operation.entityId]);

    if (!image) {
      prepared.push(operation);
      continue;
    }

    let uploadedImage = image.uploadedImage;

    if (!uploadedImage) {
      if (!image.blob) {
        throw new Error(`Product image is missing for ${operation.entityId}`);
      }

      uploadedImage = await uploadCatalogueImage(image.blob, token);

      await db.catalogueImages.update(["product", operation.entityId], {
        uploadedImage,
        status: "uploaded",
      });
    }

    const updatedPayload = {
      ...operation.payload,
      imageUrl: uploadedImage.imageUrl,
      imagePublicId: uploadedImage.imagePublicId,
    };

    await db.catalogueSync.update(operation.id, {
      payload: updatedPayload,
      updatedAt: nowISO(),
    });

    prepared.push({
      ...operation,
      payload: updatedPayload,
    });
  }

  return prepared;
};

// --------------------------------------------------
// MAIN CATALOGUE SYNCHRONIZATION
// --------------------------------------------------

const syncCatalogue = async (getToken) => {
  console.log("[CATALOGUE] syncCatalogue entered");

  console.log("[CATALOGUE] Browser online:", navigator.onLine);
  if (!navigator.onLine) {
    return {
      success: false,
      offline: true,
      message: "Device is offline",
    };
  }

  const token = await getToken();

  if (!token) {
    console.warn("Catalogue sync paused: authentication required");

    return {
      success: false,
      reason: "AUTH_REQUIRED",
    };
  }

  const bootstrapped = await db.syncMeta.get("catalogueBootstrapped");

  if (!bootstrapped?.value) {
    await bootstrapCatalogue(token);
  }

  let cursor = await getCursor();

  let uploaded = 0;
  let conflicts = 0;
  let failed = 0;

  const operations = await getPendingOperations();

  let preparedOperations = [];
  let data;

  try {
    // First resolve category UUIDs to MongoDB IDs.
    const categoryPreparedOperations =
      await prepareOperationsForUpload(operations);

    // Then upload any pending product images.
    preparedOperations = await prepareCatalogueImages(
      categoryPreparedOperations,
      token,
    );

    console.log("[CATALOGUE] Sending operations:", preparedOperations);

    // Send the operations to the unified endpoint.
    data = await sendCatalogueBatch(token, preparedOperations, cursor);
  } catch (error) {
    /*
     * Apply retry backoff to operations that were part
     * of this attempted synchronization.
     */

    for (const operation of operations) {
      const attempts = (operation.attempts || 0) + 1;

      const delay = Math.min(1000 * 2 ** attempts, 300000);

      await db.catalogueSync.update(operation.id, {
        attempts,
        nextRetryAt: new Date(Date.now() + delay).toISOString(),
        lastError: getErrorMessage(error),
      });
    }

    throw error;
  }

  // ----------------------------------------------
  // PROCESS UPLOAD RESULTS
  // ----------------------------------------------

  await processResults(preparedOperations, data.results || []);

  // ----------------------------------------------
  // APPLY DOWNLOADED CHANGES
  // ----------------------------------------------

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

  // ----------------------------------------------
  // SAVE NEW CURSOR
  // ----------------------------------------------

  cursor = data.nextSyncCursor ?? cursor;

  await saveCursor(cursor);

  // ----------------------------------------------
  // DOWNLOAD ADDITIONAL PAGES
  // ----------------------------------------------

  let pagesFetched = 0;

  while (data.hasMore && pagesFetched < MAX_DOWNLOAD_PAGES - 1) {
    data = await sendCatalogueBatch(token, [], cursor);

    await applyDownloadedChanges(data.changes || {});

    cursor = data.nextSyncCursor ?? cursor;

    await saveCursor(cursor);

    pagesFetched++;
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

// --------------------------------------------------
// AUTOMATIC CATALOGUE SYNCHRONIZATION
// --------------------------------------------------

const startAutomaticCatalogueSync = (getToken, onResult) => {
  console.log("[CATALOGUE] Automatic sync manager started");

  let running = false;
  let retryTimer = null;
  let stopped = false;
  let rerunRequested = false;

  // ----------------------------------------------
  // SCHEDULE RETRIES
  // ----------------------------------------------

  const scheduleRetry = async () => {
    if (stopped || !navigator.onLine) {
      return;
    }

    if (retryTimer) {
      clearTimeout(retryTimer);
      retryTimer = null;
    }

    const pending = await db.catalogueSync
      .where("status")
      .equals("pending")
      .toArray();

    if (!pending.length) {
      return;
    }

    const now = Date.now();

    const retryTimes = pending.map((operation) => {
      if (!operation.nextRetryAt) {
        // Avoid an immediate retry loop if a pending
        // operation has no retry timestamp.
        return now + 30000;
      }

      const timestamp = new Date(operation.nextRetryAt).getTime();

      return Number.isFinite(timestamp) ? timestamp : now + 30000;
    });

    const nextRetry = Math.min(...retryTimes);

    const delay = Math.max(0, nextRetry - now);

    retryTimer = setTimeout(runSync, delay);
  };

  // ----------------------------------------------
  // RUN SYNCHRONIZATION
  // ----------------------------------------------

  const runSync = async () => {
    console.log("[CATALOGUE] runSync triggered");
    if (stopped || !navigator.onLine) {
      return;
    }

    if (running) {
      // Do not lose a sync request that arrives while
      // another synchronization is running.
      rerunRequested = true;
      return;
    }

    running = true;

    try {
      const result = await syncCatalogue(getToken);

      onResult?.(result);
    } catch (error) {
      console.error("Automatic catalogue sync failed:", error);

      onResult?.({
        success: false,
        message: getErrorMessage(error),
      });
    } finally {
      running = false;

      if (stopped) {
        return;
      }

      if (rerunRequested) {
        rerunRequested = false;

        // Run again after the current operation finishes.
        queueMicrotask(runSync);

        return;
      }

      await scheduleRetry();
    }
  };

  // ----------------------------------------------
  // ONLINE EVENT
  // ----------------------------------------------

  const handleOnline = () => {
    if (retryTimer) {
      clearTimeout(retryTimer);
      retryTimer = null;
    }

    runSync();
  };

  // ----------------------------------------------
  // LOCAL CATALOGUE CHANGE EVENT
  // ----------------------------------------------

  const handleCatalogueSyncRequested = () => {
    if (retryTimer) {
      clearTimeout(retryTimer);
      retryTimer = null;
    }

    runSync();
  };

  // ----------------------------------------------
  // REGISTER EVENT LISTENERS
  // ----------------------------------------------

  window.addEventListener("online", handleOnline);

  window.addEventListener(CATALOGUE_SYNC_EVENT, handleCatalogueSyncRequested);

  // Start initial synchronization.
  runSync();

  // ----------------------------------------------
  // CLEANUP
  // ----------------------------------------------

  return () => {
    stopped = true;

    if (retryTimer) {
      clearTimeout(retryTimer);
      retryTimer = null;
    }

    window.removeEventListener("online", handleOnline);

    window.removeEventListener(
      CATALOGUE_SYNC_EVENT,
      handleCatalogueSyncRequested,
    );
  };
};

// --------------------------------------------------
// INITIAL CATALOGUE BOOTSTRAP
// --------------------------------------------------

const bootstrapCatalogue = async (token) => {
  const deviceId = await getDeviceId();

  const res = await fetch(`${API_URL}/sync/catalogue/bootstrap`, {
    method: "GET",

    headers: {
      Authorization: `Bearer ${token}`,
      "x-device-id": deviceId,
    },
  });

  const data = await res.json();

  if (!res.ok || !data.success || !data.snapshot) {
    console.error("Catalogue bootstrap failed:", {
      status: res.status,
      response: data,
    });

    throw new Error(data.message || "Failed to download catalogue");
  }

  await applyDownloadedChanges({
    categories: data.snapshot.categories || [],
    products: data.snapshot.products || [],
  });

  await saveCursor(data.snapshot.cursor ?? 0);

  await db.syncMeta.put({
    key: "catalogueBootstrapped",
    value: true,
  });

  return data.snapshot;
};

// --------------------------------------------------
// EXPORTS
// --------------------------------------------------

export {
  handleCatalogueSyncRequest,
  startAutomaticCatalogueSync,
  syncCatalogue,
};
