import { db } from "../db/db.js";

export const saveOfflineSale = async (sale) => {
  try {
    if (!sale.clientSaleId) {
      throw new Error("clientSaleId is required");
    }
    if (!sale.deviceId) {
      throw new Error("deviceId is required");
    }

    //check if this sale exists locally
    const existingSale = await db.sales
      .where("clientSaleId")
      .equals(sale.clientSaleId)
      .first();

    if (existingSale) {
      return {
        success: true,
        duplicate: true,
        message: "Sale already exists locally",
        sale: existingSale,
      };
    }

    const saleId = await db.sales.put({
      ...sale,
      syncStatus: "pending",
      occurredAt: new Date().toISOString(),
    });

    const existingPendingSync = await db.pendingSync
      .where("[type+referenceId]")
      .equals(["sale", sale.clientSaleId])
      .first();

    if (!existingPendingSync) {
      await db.pendingSync.put({
        type: "sale",
        referenceId: sale.clientSaleId,
        status: "pending",
        createdAt: new Date().toISOString(),
      });
    }

    return {
      success: true,
      duplicate: false,
      message: "Sale saved locally and queued for synchronization",
      saleId,
    };
  } catch (error) {
    console.error("Save offline sale error:", error);
    throw error;
  }
};
