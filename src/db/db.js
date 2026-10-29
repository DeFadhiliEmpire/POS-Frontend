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
