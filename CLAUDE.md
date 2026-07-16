# Guardian-Webapp — Zero-Install Bystander Interface

> Part of the **Guardian** platform (AI-powered digital vehicle identity & emergency response). Read the platform-wide PRD for full product context; this file covers **only this repository**. This app talks to the rest of the system **only through the Guardian-Server HTTP API** (`/api/v1`).

- **Repo:** `github.com/VishalSingh1703/Guardian-Webapp`
- **Sibling repos:** `Guardian-Server` (Python/FastAPI backend — the only thing this app talks to) · `Guardian-App` (Kotlin owner client — this app never talks to it directly).
- **Status:** greenfield — the repo is effectively empty. This document defines what to build.

---

## 1. What this component IS
The **bystander's** interface, embodying the platform's zero-friction promise: *any mobile device instantly acts as an emergency interface, with nothing to install.* A witness at a scene opens a URL in their phone browser and, in seconds, can help. Its jobs (the emergency flow, in order):
1. **Scan the plate** — open the device camera stream, capture a frame, send it to the Server for OCR + lookup.
2. **Verify the crash** — the UI stays **locked** until the bystander captures a wide damage frame that the Server's CV engine confirms, plus a passing geofence check.
3. **Trigger the emergency broadcast** — once unlocked, one action fires the Server's SMS + IVR pipeline to the owner's emergency contacts, sending the bystander's live GPS.
4. **Show the medical passport** — after verification, display a read-only card of driver vitals (blood group, allergies, organ-donor) so responders can act.
5. **Secondary utilities** — file parking-obstruction, vandalism, or fleet/maintenance courtesy alerts against a plate.

## 2. What this component is NOT (hard boundaries)
- ❌ **Not the owner app.** Vehicle registration, profile/medical-passport *entry*, and accelerometer crash detection live in **Guardian-App**. This app never creates or edits profiles.
- ❌ **Not the brain.** OCR, plate hashing, CV verification, encryption, Twilio SMS/IVR, and geofence logic all run on **Guardian-Server**. This app captures frames + GPS and calls the API; it never runs OCR/CV locally, never hashes the plate, and never calls Twilio/AI vendors.
- ❌ **Never sees PII.** The Server only ever returns `active_profile`, an `incident_token`, and (post-verification) the `medical_passport` block. There is no name/phone/insurance data to display — do not build UI for it.

---

## 3. Recommended tech stack
- **Framework:** **Next.js (App Router) + React + TypeScript.** *(Web only — the native app is separate Kotlin.)*
- **Styling:** Tailwind CSS. Mobile-first; this is used one-handed at a stressful scene — large touch targets, high contrast, minimal steps.
- **PWA:** installable + offline shell so a returning bystander gets an app-like launch; the emergency flow itself needs network.
- **Camera:** `navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })` for the rear camera; capture frames to a `<canvas>` → upload as `multipart/form-data`.
- **Location:** `navigator.geolocation.getCurrentPosition` for the geofence check and the GPS deep-link sent to contacts.
- **Data fetching:** `fetch` or TanStack Query against the Server API base URL (env var, e.g. `NEXT_PUBLIC_API_BASE`).
- **Hosting:** Vercel (or any static/edge host).

Suggested screens/routes:
```
/                      → landing + "Scan a plate" CTA (requests camera/location perms)
/scan                  → live camera stream, capture plate frame  → POST /ocr/resolve
/incident/[token]      → capture damage frame (verify)            → POST /incidents/{token}/verify
/incident/[token]/act  → unlocked emergency trigger + medical passport
/utilities/[token]     → parking / vandalism / fleet secondary alerts
```

---

## 4. This app's use of the Server API
Only these routes matter here (full contract in the platform PRD, §6.2). Frames are `multipart/form-data`.
| Method | Path | Used for |
|--------|------|----------|
| `POST` | `/ocr/resolve` | Send plate frame → `{ active_profile, incident_token }`. |
| `POST` | `/incidents/{token}/verify` | Send wide damage frame + GPS → `{ verified, alert_unlocked }`. |
| `POST` | `/incidents/{token}/trigger-emergency` | Fire SMS + IVR broadcast (idempotent). |
| `GET` | `/incidents/{token}/medical-passport` | Read-only vitals, only after `verified`. |
| `POST` | `/utilities/parking` · `/vandalism` · `/fleet` | Secondary community alerts. |

**Base URL:** environment variable only, never hard-coded. No API secrets in the client — this is a public browser app; anything sensitive stays on the Server.

## 5. UX rules that enforce platform invariants
1. **No trigger without verification.** Keep the emergency action visually **disabled/locked** until the Server returns `verified: true` / `alert_unlocked: true`. The Server also enforces this — the UI must mirror it, never bypass it.
2. **Mandatory visual context.** The flow *cannot* skip the damage-frame capture step.
3. **Geofence honesty.** Request precise location; if the Server rejects on proximity, surface a clear "you must be near the vehicle" message — do not retry to spoof it.
4. **Respect rate limits/cooldowns.** When the Server returns a cooldown (e.g. parking 5-min), show a countdown/disabled state rather than letting the user hammer the button.
5. **Show only what the Server discloses.** Render the `medical_passport` block and nothing more. There is no owner-identity UI in this app.

---

## 6. Working conventions
- Handle camera/location permission denial gracefully — these are the most common failure points on a real phone; every step needs a fallback message.
- Keep the emergency path fast and forgiving: minimal taps, clear progress, no dead ends; assume a stressed, one-handed user on flaky mobile data.
- Type the API responses (mirror the Server's Pydantic/OpenAPI models) so a contract change is caught at build time.
- Verify: `npm run dev`, drive the full scan → verify → trigger flow against a running Guardian-Server (or a mock), and test on an actual phone browser for camera/GPS behavior.
