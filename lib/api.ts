// Guardian-Server API client — the single integration seam for the web app.
//
// Every backend call goes through here. The endpoints are intentionally OPEN:
// when NEXT_PUBLIC_API_BASE is unset the client runs in STUB mode and simulates
// responses, so the whole QR -> accident -> SOS flow works before the server
// exists. When the server team ships the real endpoints (see SPEC.md §7), set
// NEXT_PUBLIC_API_BASE and the same calls hit the live API unchanged.

import type {
  AccidentVerification,
  Coords,
  IncidentInit,
  ParkingResult,
  QrContext,
  SosResult,
} from "./types";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE?.replace(/\/$/, "") ?? "";

/** True when no real backend is configured — we simulate responses. */
export const STUB_MODE = API_BASE === "";

// --- Flip these while developing to exercise the failure branches in STUB mode.
const STUB_ACCIDENT_VERIFIES = true;

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function apiJson<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: { Accept: "application/json", ...(init?.headers ?? {}) },
  });
  if (!res.ok) {
    throw new Error(`API ${path} failed: ${res.status}`);
  }
  return (await res.json()) as T;
}

// ---------------------------------------------------------------------------
// 1. Resolve QR token -> session context
// ---------------------------------------------------------------------------
export async function resolveQr(qrToken: string): Promise<QrContext> {
  if (STUB_MODE) {
    await delay(500);
    return { active: true, categoriesEnabled: ["accident", "parking"] };
  }
  return apiJson<QrContext>(`/api/v1/qr/${encodeURIComponent(qrToken)}`);
}

// ---------------------------------------------------------------------------
// 2. Open an incident for this token
// ---------------------------------------------------------------------------
export async function initIncident(qrToken: string): Promise<IncidentInit> {
  if (STUB_MODE) {
    await delay(300);
    return { incidentToken: `stub-${qrToken}-${Date.now()}` };
  }
  return apiJson<IncidentInit>(`/api/v1/incidents/init`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ qrToken }),
  });
}

// ---------------------------------------------------------------------------
// 3. Image verification pipeline (accident detection + plate match)
// ---------------------------------------------------------------------------
export async function verifyAccident(
  incidentToken: string,
  photo: Blob,
  gps: Coords | null,
): Promise<AccidentVerification> {
  if (STUB_MODE) {
    await delay(1800); // simulate the CV pipeline
    if (STUB_ACCIDENT_VERIFIES) {
      return { isAccident: true, plateMatch: true, verified: true, sosUnlocked: true };
    }
    return {
      isAccident: false,
      plateMatch: true,
      verified: false,
      sosUnlocked: false,
      reason: "Image did not clearly show an accident. Please retake.",
    };
  }

  const form = new FormData();
  form.append("photo", photo, "capture.jpg");
  if (gps) {
    form.append("lat", String(gps.lat));
    form.append("lng", String(gps.lng));
  }
  return apiJson<AccidentVerification>(
    `/api/v1/incidents/${encodeURIComponent(incidentToken)}/verify-accident`,
    { method: "POST", body: form },
  );
}

// ---------------------------------------------------------------------------
// 4. Trigger SOS (all calls / SMS / IVR happen server-side)
// ---------------------------------------------------------------------------
export async function triggerSos(
  incidentToken: string,
  gps: Coords | null,
): Promise<SosResult> {
  if (STUB_MODE) {
    await delay(1200);
    return { dispatched: true };
  }
  return apiJson<SosResult>(
    `/api/v1/incidents/${encodeURIComponent(incidentToken)}/sos`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ gps }),
    },
  );
}

// ---------------------------------------------------------------------------
// 5. Parking obstruction alert
// ---------------------------------------------------------------------------
export async function reportParking(
  qrToken: string,
  message: string,
): Promise<ParkingResult> {
  if (STUB_MODE) {
    await delay(1000);
    return { queued: true };
  }
  return apiJson<ParkingResult>(
    `/api/v1/incidents/${encodeURIComponent(qrToken)}/parking`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message }),
    },
  );
}
