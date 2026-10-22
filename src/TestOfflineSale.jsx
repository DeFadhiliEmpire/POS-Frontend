import { saveOfflineSale } from "./services/offlineSaleService.js";
import { useEffect } from "react";
import { getNextCounter } from "./db/db.js";
import { getDeviceId } from "./db/device.js";

const deviceId = await getDeviceId();

const saleNumber = await getNextCounter(`sale-${deviceId}`);

const TestOfflineSale = () => {
  useEffect(() => {
    const testOfflineSale = async () => {
      const clientSaleId = `SALE-OFFLINE-${deviceId}-${saleNumber}`;
      const receipNumber = `REC-OFFLINE-${deviceId}-${saleNumber}`;
      try {
        const results = await saveOfflineSale({
          deviceId: deviceId,
          clientSaleId: clientSaleId,
          receiptNumber: receipNumber,

          items: [
            {
              productId: "6ac162be54e13ea86a5d563d",
              quantity: 2,
              unitPrice: 145,
            },
          ],

          payment: {
            method: "cash",
            amount: 290,
          },

          discount: 0,
          tax: 0,

          occurredAt: new Date().toISOString(),
        });

        console.log("Offline sale test :", results);
      } catch (error) {
        console.error("Offline sale test error :", error);
      }
    };

    testOfflineSale();
  }, []);

  return <h1>Testing Offline Sale...</h1>;
};

export default TestOfflineSale;
