import Dexie from "dexie";

const db = new Dexie("POSDatatbase");

db.version(1).stores({
  products: "productId,name,sku,barcode,categoryId,isActive",
  sales: "clientSaleId,syncStatus,occurredAt",
  pendingSync: "++id,[type+referenceId],status,createdAt",
  device: "deviceId",
  counters: "++id,key,value",
});

db.version(2).stores({
  products: "productId,name,sku,barcode,categoryId,isActive",
  sales: "clientSaleId,syncStatus,occurredAt",
  pendingSync: "++id,[type+referenceId],status,createdAt",
  device: "deviceId",
  counters: "++id,key,value",

  categories: "categoryId,name,isActive",
  catalogueSync: "++id,[entityType+entityId],status,createdAt",
});

db.version(3).stores({
  products: "productId,name,sku,barcode,categoryId,isActive,syncStatus,version",
  sales: "clientSaleId,syncStatus,occurredAt",
  pendingSync: "++id,[type+referenceId],status,createdAt",
  device: "deviceId",
  counters: "++id,key,value",
  categories: "categoryId,name,isActive,syncStatus,version",
  catalogueSync:
    "++id,operationId,[entityType+entityId],entityType,entityId,status,createdAt",
  syncMeta: "key",
});

db.version(4).stores({
  products: "productId,name,sku,barcode,categoryId,isActive,syncStatus,version",
  sales: "clientSaleId,syncStatus,occurredAt",
  pendingSync: "++id,[type+referenceId],status,createdAt",
  device: "deviceId",
  counters: "++id,key,value",
  categories: "categoryId,name,isActive,syncStatus,version",
  catalogueSync:
    "++id,operationId,[entityType+entityId],entityType,entityId,status,createdAt",
  syncMeta: "key",
  catalogueImages: "[entityType+entityId],entityType,entityId,status,createdAt",
});

db.version(5).stores({
  categories: "categoryId,name,normalizedName,isActive,syncStatus,version",
});

const productIds = [
  "1032e9c1-d345-44f1-ab64-5038219821c4",
  "2a6980a1-7866-4638-903f-f13122013b39",
];

for (const productId of productIds) {
  const product = await db.products.get(productId);

  const operations = await db.catalogueSync
    .where("[entityType+entityId]")
    .equals(["product", productId])
    .toArray();

  console.log("PRODUCT:", productId);
  console.log("LOCAL RECORD:", product);
  console.log("CATALOGUE OPERATIONS:", operations);
}

const productId = "1032e9c1-d345-44f1-ab64-5038219821c4";

const product = await db.products.get(productId);

const operations = await db.catalogueSync
  .where("[entityType+entityId]")
  .equals(["product", productId])
  .toArray();

const pending = await db.pendingSync.toArray();

console.log("FIRST FANTA RECORD:", product);
console.log("FIRST FANTA OPERATIONS:", operations);
console.log(
  "RELATED PENDING QUEUE:",
  pending.filter((item) => item.referenceId === productId),
);

const getNextCounter = async (key) => {
  let counter = await db.counters.where("key").equals(key).first();
  if (!counter) {
    counter = { key, value: 1 };
    await db.counters.add(counter);
    return 1;
  }
  counter.value += 1;
  await db.counters.put(counter);
  return counter.value;
};

const inspectSalesSync = async () => {
  const sales = await db.sales.toArray();
  const pending = await db.pendingSync.toArray();

  console.table(
    sales.map((sale) => ({
      clientSaleId: sale.clientSaleId,
      syncStatus: sale.syncStatus,
      serverSaleId: sale.serverSaleId || null,
    })),
  );

  console.log("Pending queue:", pending);
};

inspectSalesSync();

export { db, getNextCounter };
