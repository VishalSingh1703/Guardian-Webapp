import type { Coords } from "./types";

/**
 * Best-effort single GPS fix. Never throws — resolves to null if the user
 * denies permission or the device can't get a fix, so the emergency flow is
 * never blocked by location. The server treats GPS as optional-but-preferred.
 */
export function getCurrentCoords(timeoutMs = 8000): Promise<Coords | null> {
  return new Promise((resolve) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      resolve(null);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: timeoutMs, maximumAge: 0 },
    );
  });
}
