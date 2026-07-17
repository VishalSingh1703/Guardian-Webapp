// Shared types for the Guardian bystander web app.
// These mirror the (proposed) server responses documented in SPEC.md §7.

export type Coords = {
  lat: number;
  lng: number;
  accuracy?: number;
};

/** GET /api/v1/qr/{qr_token} — resolve a scanned QR to session context (no PII). */
export type QrContext = {
  active: boolean;
  /** Which report categories this vehicle/profile allows. */
  categoriesEnabled: Array<"accident" | "parking">;
};

/** POST /api/v1/incidents/init — open an incident for this token. */
export type IncidentInit = {
  incidentToken: string;
};

/** POST /api/v1/incidents/{token}/verify-accident — image verification pipeline result. */
export type AccidentVerification = {
  /** Does the image depict an accident / vehicle damage? */
  isAccident: boolean;
  /** Does the plate in the photo match the QR-mapped plate? */
  plateMatch: boolean;
  /** Overall gate: both checks passed. */
  verified: boolean;
  /** Server's authoritative signal that the SOS button may be enabled. */
  sosUnlocked: boolean;
  /** Optional human-readable reason when not verified. */
  reason?: string;
};

/** POST /api/v1/incidents/{token}/sos — emergency dispatch result. */
export type SosResult = {
  dispatched: boolean;
};

/** POST /api/v1/incidents/{token}/parking — parking obstruction alert result. */
export type ParkingResult = {
  queued: boolean;
};
