import { useEffect } from "react";
import { startAutomaticSaleSync } from "./services/syncManager";

const AutoSaleSync = ({ getToken }) => {
  useEffect(() => {
    if (!getToken) return;

    const stopSync = startAutomaticSaleSync(getToken, (result) => {
      if (result.success) {
        console.log("Automatic sale sync result:", result);
      } else {
        console.warn("Sale sync not completed:", result.message);
      }
    });

    return stopSync;
  }, [getToken]);

  return null;
};

export default AutoSaleSync;
