import { useEffect } from "react";
import { syncOfflineSales } from "./services/syncManager.js";

const TestOnlineSaleSync = () => {
  useEffect(() => {
    const runSync = async () => {
      const token =
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2YWJhYmUxOWE3N2UzNjMwZjg4MTRhYTgiLCJlbWFpbCI6Im1vc2VzQGV4YW1wbGUuY29tIiwibmFtZSI6Ik1vc2VzIEZhZGhpbGkgTWFzaGEiLCJyb2xlIjoib3duZXIiLCJidXNpbmVzc0lkIjoiNmFiYWJlMTdhNzdlMzYzMGY4ODE0YWE3IiwiaXNBY3RpdmUiOnRydWUsImlhdCI6MTc5MjEzMDg2MiwiZXhwIjoxNzkyMTM0NDYyfQ.DA-wuFsa7fFFBbmg-e8PYELhBII8H-FMprJYi4AkQNA";

      try {
        const result = await syncOfflineSales(token);
        console.log("Sync result:", result);
      } catch (err) {
        console.error("Sync error:", err);
      }
    };

    runSync();
  }, []);

  return <h1>Testing Online Sale Sync...</h1>;
};

export default TestOnlineSaleSync;
