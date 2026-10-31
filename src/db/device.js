import { db } from "./db";

const generateDeviceId = () => {
  return `DEVICE-${crypto.randomUUID()}`;
};

const getDeviceId = async () => {
  try {
    return db.transaction("rw", db.syncMeta, db.device, async () => {
      const saved = await db.syncMeta.get("deviceId");

      if (saved?.value) {
        return saved.value;
      }

      const existingDevice = await db.device.toCollection().first();

      if (existingDevice) {
        return existingDevice.deviceId;
      }

      const deviceId = generateDeviceId();
      const deviceName = getDeviceName();

      await db.syncMeta.put({
        key: "deviceId",
        value: deviceId,
      });
      await db.device.put({ deviceId, deviceName });

      return deviceId;
    });
  } catch (err) {
    console.error("Failed to get device ID:", err);
    throw err;
  }
};

const getDeviceName = () => {
  const ua = navigator.userAgent.toLowerCase();

  if (ua.includes("windows")) {
    return "POS_Windows-Pc";
  }
  if (ua.includes("macintosh")) {
    return "POS-MacBook";
  }
  if (ua.includes("android")) {
    if (ua.includes("samsung")) {
      // Try to extract model if available
      const match = ua.match(/samsung[\s-]?([a-z0-9]+)/i);
      return match
        ? `POS-Samsung-${match[1].toUpperCase()}`
        : "POS-Samsung-Device";
    }
    return "POS-Android-Device";
  }
  if (ua.includes("iphone")) {
    return "POS-iPhone";
  }
  if (ua.includes("ipad")) {
    return "POS-iPad";
  }

  return "POS-Unknown-Device";
};

export { getDeviceId };
