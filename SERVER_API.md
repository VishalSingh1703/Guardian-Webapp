# Guardian-Webapp → Server API Contract (endpoints to implement)

> **For the Guardian-Server team.** This is the exact set of HTTP endpoints the bystander web app calls. They are currently **stubbed** on the client (`lib/api.ts`): with `NEXT_PUBLIC_API_BASE` unset, the webapp simulates every response so the UI works without a backend. Point `NEXT_PUBLIC_API_BASE` at your server and the same calls go live — **no client code changes needed** as long as you match the paths, request bodies, and response JSON below.
>
> Source of truth on the client: [`lib/api.ts`](./lib/api.ts) and [`lib/types.ts`](./lib/types.ts). Product flow: [`SPEC.md`](./SPEC.md).

## Conventions
- **Base path:** all routes are under `/api/v1`. Full URL = `${NEXT_PUBLIC_API_BASE}/api/v1/...`.
- **Content types:** JSON except the image upload, which is `multipart/form-data`.
- **Auth:** none from the bystander — they are anonymous. All state is carried by `qr_token` / `incident_token`.
- **Errors:** the client treats any non-`2xx` as a failure (shows a retry / "couldn't verify" state). Return `4xx` for validation/verification failures, `5xx` for server errors.
- **⚠️ JSON key naming:** the client currently reads the **camelCase** keys shown below (e.g. `incidentToken`, `sosUnlocked`). If the server prefers `snake_case`, that's fine — just tell us and we'll add a mapping layer in `lib/api.ts`. **Let's agree on one before you build.**
- **CORS:** the webapp is a separate origin (browser `fetch`). Enable CORS for the webapp's domain (and `http://localhost:3000` for dev).

---

## 1. Resolve QR token → session context
Called when the bystander lands via the QR deep-link, to confirm the vehicle is registered and which report types are allowed.

```
GET /api/v1/qr/{qr_token}
```
**Path param:** `qr_token` — the token embedded in the QR code (identifies the vehicle/owner).

**200 response:**
```json
{
  "active": true,
  "categoriesEnabled": ["accident", "parking"]
}
```
- `active` — is this QR/vehicle registered & enabled. If `false`, the app shows "not registered".
- `categoriesEnabled` — subset of `["accident", "parking"]`; controls which options render.
- **No PII** in this response, ever.

---

## 2. Open an incident
Called when the bystander picks a category, to get a server-side incident handle used by later calls.

```
POST /api/v1/incidents/init
Content-Type: application/json
```
**Body:**
```json
{ "qrToken": "<qr_token>" }
```
**200 response:**
```json
{ "incidentToken": "<opaque incident id>" }
```
> May be merged into endpoint #1 if you'd rather return the incident token from the QR resolve — tell us and we'll collapse the two calls.

---

## 3. Image-verification pipeline (accident detection + plate match)  ⭐ core
The critical anti-abuse gate. Intakes the **live-captured** accident photo and runs your CV pipeline. This is the endpoint the server team's image-verification work plugs into.

```
POST /api/v1/incidents/{incident_token}/verify-accident
Content-Type: multipart/form-data
```
**Multipart fields:**
| Field | Type | Notes |
|-------|------|-------|
| `photo` | file (`image/jpeg`) | The captured frame, filename `capture.jpg`. Always present. |
| `lat` | string (float) | Optional — bystander GPS latitude. May be absent if location denied. |
| `lng` | string (float) | Optional — bystander GPS longitude. |

**Server must do:** (a) confirm the image depicts an accident / vehicle damage, and (b) match the license plate visible in the photo against the plate mapped to this incident's `qr_token`.

**200 response:**
```json
{
  "isAccident": true,
  "plateMatch": true,
  "verified": true,
  "sosUnlocked": true,
  "reason": "optional human-readable message when not verified"
}
```
- `verified` = both checks passed. `sosUnlocked` = server's authoritative go-ahead to enable the SOS button.
- On failure, set `verified: false`, `sosUnlocked: false`, and a user-friendly `reason` (shown verbatim). The client will let the user retake the photo.
- **Invariant:** the client will not enable SOS unless `sosUnlocked === true`. Never unlock without a real accident + plate match.

---

## 4. Trigger SOS (emergency broadcast)
Fires the server-side telephony pipeline (SMS + IVR calls to the owner's emergency contacts). All dispatch is server-side; the client only calls this.

```
POST /api/v1/incidents/{incident_token}/sos
Content-Type: application/json
```
**Body:**
```json
{ "gps": { "lat": 12.34, "lng": 56.78, "accuracy": 20 } }
```
- `gps` may be `null` if location was unavailable. Use it for the location deep-link sent to contacts.

**200 response:**
```json
{ "dispatched": true }
```
- **Must be idempotent per `incident_token`** — the button can be tapped more than once; don't double-dispatch.
- **Must reject** (`4xx`) if the incident was never `verified` — do not rely on the client as the only gate.

---

## 5. Parking obstruction alert
Secondary utility: routes an anonymous "please move your vehicle" alert to the owner.

```
POST /api/v1/incidents/{token}/parking
Content-Type: application/json
```
**Body:**
```json
{ "message": "Vehicle is blocking my driveway / exit." }
```
`message` is one of a fixed set of presets (see `app/s/[token]/parking/page.tsx`), so it's safe to treat as an enum.

**200 response:**
```json
{ "queued": true }
```
- Enforce the **5-minute cooldown** and rate limits server-side (per `root.md` §4.1). On cooldown, return a `429` and we'll show a countdown.
- **⚠️ Open point:** the client currently sends the **`qr_token`** in this path (parking doesn't open a formal incident in the current flow). Confirm whether you want `qr_token` here or a dedicated `incident_token` — easy to change on our side.

---

## Not yet called by the client (planned — see SPEC.md §9)
- `GET /api/v1/incidents/{incident_token}/medical-passport` — read-only vitals to show responders **after** verification (blood group, allergies, organ-donor). We'll wire this once you confirm it should be exposed to the bystander. Returns **only** the `medical_passport` block — no other PII.

## Cross-cutting invariants (please enforce server-side)
1. **PII never reaches the bystander** — only `active`, tokens, verification booleans, and (later) the medical-passport block leave the server.
2. **SOS gating is authoritative on the server** — `verify-accident` must actually pass before `/sos` does anything.
3. **Plate identity comes from the QR** (`qr_token`), not from client-side OCR; the photo's plate is used only for the authenticity match.
4. **Idempotency + rate limits/cooldowns** are server responsibilities; the client reflects them in the UI.
