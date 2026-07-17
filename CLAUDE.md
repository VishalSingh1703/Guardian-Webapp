# Guardian-Webapp — Zero-Install Bystander Interface

> Part of the **Guardian** platform (AI-powered digital vehicle identity & emergency response). Read the platform-wide PRD for full product context; this file covers **only this repository**. This app talks to the rest of the system **only through the Guardian-Server HTTP API** (`/api/v1`).

- **Repo:** `github.com/VishalSingh1703/Guardian-Webapp`
- **Sibling repos:** `Guardian-Server` (Python/FastAPI backend — the only thing this app talks to) · `Guardian-App` (Kotlin owner client — this app never talks to it directly).
- **Status:** ✅ Scaffolded and running. QR → accident → SOS and QR → parking flows work end-to-end in **stub mode** (no server required). See [§7 Progress & current state](#7-progress--current-state).

---

> 📋 **Detailed flow, screens, and open backend endpoints live in [`SPEC.md`](./SPEC.md).** Read it before building — it supersedes the summary below where they differ (notably: entry is by **QR scan**, not a bystander OCR plate-scan).

## 1. What this component IS
The **bystander's** interface, embodying the platform's zero-friction promise: *any mobile device instantly acts as an emergency interface, with nothing to install.* A witness at a scene **scans the QR code on the vehicle**, which auto-opens the app in their phone browser, and in seconds can help. Its jobs (the emergency flow, in order):
1. **Land via QR** — the QR (on car/bike/helmet) encodes a URL with a `qr_token` that maps to the vehicle; the app reads it from the URL. No plate OCR by the user — the QR does the identification.
2. **Choose a category** — landing screen with two vertically-stacked options: **Accident/Safety** and **Parking**.
3. **Capture the accident photo** — live in-page camera only (**no gallery**); upload the frame. The UI stays **locked** until the Server's image-verification pipeline confirms both *(a)* the image depicts an accident and *(b)* the plate in the photo matches the QR-mapped plate.
4. **Trigger SOS** — once unlocked, one tap fires the Server's SMS + IVR pipeline to the owner's emergency contacts, sending the bystander's live GPS.
5. **Show the medical passport** — after verification, display a read-only card of driver vitals (blood group, allergies, organ-donor) so responders can act. *(Confirm inclusion — see SPEC §9.)*
6. **Secondary utilities** — file parking-obstruction (and later vandalism / fleet) courtesy alerts against the QR-mapped vehicle.

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

Routes (as built):
```
/                       → "scan the QR" info screen (+ dev-only demo link)
/s/[token]              → QR landing: two options (Accident / Parking)
/s/[token]/accident     → live camera → capture → verify → SOS → dispatched
/s/[token]/parking      → preset-message parking alert (stub)
```

---

## 4. This app's use of the Server API
📤 **The full, sendable contract for the server team is in [`SERVER_API.md`](./SERVER_API.md)** — request/response JSON for every endpoint. Every call goes through the single client module [`lib/api.ts`](./lib/api.ts). Endpoints as wired today (all under `/api/v1`):
| Method | Path | Used for | Client fn |
|--------|------|----------|-----------|
| `GET` | `/qr/{qr_token}` | Resolve QR → `{ active, categoriesEnabled }`. | `resolveQr` |
| `POST` | `/incidents/init` | Open an incident → `{ incidentToken }`. | `initIncident` |
| `POST` | `/incidents/{token}/verify-accident` | Multipart photo + GPS → image-verification result (accident + plate match). | `verifyAccident` |
| `POST` | `/incidents/{token}/sos` | Fire SMS + IVR broadcast (idempotent). | `triggerSos` |
| `POST` | `/incidents/{token}/parking` | Parking obstruction alert. | `reportParking` |
| `GET` | `/incidents/{token}/medical-passport` | *(planned)* read-only vitals after verify. | — |

**Stub mode:** when `NEXT_PUBLIC_API_BASE` is blank, `lib/api.ts` simulates all responses so the UI runs without a server. Set the env var to hit the real API — no other code changes.

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

---

## 7. Progress & current state

### Stack (as built)
Next.js **15.5.20** (App Router) · React **19** · TypeScript · Tailwind CSS 3.4 · PWA (manifest + theme). Pinned Next to 15.5.20 to clear the critical CVE in 15.1.x.

### Run it locally
```bash
npm install                     # first time only
cp .env.example .env.local      # optional; leave NEXT_PUBLIC_API_BASE blank for stub mode
npm run dev                     # http://localhost:3000
```
Other scripts: `npm run build`, `npm run start` (prod), `npm run typecheck`, `npm run lint`.
- Open `/` for the info screen; in dev it shows a demo link. Or go straight to `/s/DEMO-PLATE-123` to simulate a QR scan.
- **Camera needs a secure context** — works on `localhost`; on a real phone you need **https** (e.g. a tunnel) or `getUserMedia` is blocked.

### File map
```
app/
  layout.tsx                     # root layout, viewport/PWA metadata, phone-width frame
  globals.css                    # Tailwind + safe-area helpers
  page.tsx                       # "scan the QR" info screen (+ dev demo link)
  s/[token]/page.tsx             # QR landing: Accident / Parking options
  s/[token]/accident/page.tsx    # accident state machine (init→capture→preview→verify→SOS→dispatched)
  s/[token]/parking/page.tsx     # preset-message parking alert (stub)
components/
  OptionButton.tsx  CameraCapture.tsx  SosButton.tsx  Spinner.tsx
lib/
  api.ts                         # single server-integration seam (+ STUB_MODE)
  types.ts                       # response types (mirror server JSON)
  geo.ts                         # best-effort GPS (never blocks the flow)
public/
  manifest.webmanifest  icon.svg
SPEC.md          # product flow & requirements
SERVER_API.md    # endpoint contract to hand to the server team
```

### What works (verified in-browser, stub mode)
- ✅ QR landing resolves and renders the two stacked options.
- ✅ Accident: **live in-page camera only** (`getUserMedia` + canvas capture — no file input, gallery is impossible), capture → preview (retake / use) → server verify → **SOS** → "help on the way".
- ✅ Parking: preset message → owner-notified confirmation.
- ✅ Graceful states: camera permission/no-camera errors with retry; incident-init failure with retry; GPS denial never blocks.
- ✅ `npm run build` + `npm run typecheck` pass clean.

### Decisions made
- **Camera-only enforced via `getUserMedia`**, not `<input capture>` (which many phones let bypass to the gallery). True authenticity is still the server's job (SPEC §8).
- **All backend calls stubbed behind `lib/api.ts`** so frontend and backend can progress independently.
- **Client never self-authorizes** — SOS enables only on server `sosUnlocked`.
- Pinch-zoom left enabled (accessibility) despite the app-like feel.

### Not done yet / next
- Wire real server (set `NEXT_PUBLIC_API_BASE`); confirm JSON key casing with server team (see `SERVER_API.md`).
- Post-verification **medical-passport card** (pending SPEC §9 confirmation).
- Flesh out parking (photo? geofence?), and decide vandalism/fleet utilities.
- Real PNG PWA icons (192/512) + optional offline service worker.
- Two moderate npm-audit advisories remain (transitive `postcss` via Next) — clear on a routine Next bump.
