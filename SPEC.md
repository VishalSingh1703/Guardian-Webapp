# Guardian-Webapp — Product Spec & Flow (v0)

> Requirements captured for the bystander web app. Platform context: `root.md` (workspace root). Component context: [`CLAUDE.md`](./CLAUDE.md). This doc is the source of truth for **screens, flow, and the backend integration seams** the webapp needs. Backend endpoints below are intentionally **left open** — client wires to placeholders now, real server later.

---

## 1. Scope of this version
Zero-install web app that a bystander at a scene opens by **scanning a QR code** on the vehicle. First cut focuses on the **Accident/Safety** path end-to-end; **Parking** is stubbed.

## 2. Platform & design principles
- **Mobile-phone-centric. Not laptop/tablet.** Design for a portrait phone held one-handed by a stressed bystander.
- Large touch targets, high contrast, minimal steps, no dead ends.
- Every screen assumes flaky mobile data and possible permission denials — always show a clear next step / fallback.
- PWA-style, but the emergency flow needs the network.

## 3. Entry point — QR code
- A QR sticker lives on the car / bike / helmet. Scanning it **auto-opens the web app** in the phone browser (no install).
- The QR encodes a URL carrying a token, e.g. `https://<webapp>/s/{qr_token}`.
- The `qr_token` is what maps to the specific vehicle/owner on the server. The webapp reads it from the URL and carries it through the whole flow.
- **[OPEN — server]** Resolve the token to session context (is it active, which categories are enabled). Endpoint kept open (§7).

## 4. Landing screen
Two options, **vertically stacked**, full-width buttons:
1. **🚨 Safety / Accident** → accident flow (§5)
2. **🅿️ Parking Issue** → parking flow (§6)

## 5. Accident / Safety flow (primary)
```
QR scan → Landing → [Accident] → Camera screen → live capture → upload
        → server verifies (accident? + plate match?) 
        → if verified → SOS screen → [SOS] → all calls/alerts triggered
```

1. **Choose Accident** on the landing screen → route to the camera screen.
2. **Camera capture screen**
   - Prompt the user to open the camera / show an in-page camera view.
   - The user must capture the accident photo **live, right now**.
   - **No gallery uploads.** Photos must come from the live camera at that moment — not the photo library. (Authenticity guard; see §8 for how this is actually enforced.)
3. **Upload** the captured frame to the server.
4. **Server-side verification (image verification pipeline)** — two checks, both must pass:
   - a. **Accident check** — does the image actually depict an accident / vehicle damage?
   - b. **License-plate match** — does the plate visible in the photo match the plate mapped to `qr_token`? (confirms the photo is of *this* vehicle, not a random one)
   - **[OPEN — server]** This is the image-verification endpoint; keep it open (§7).
5. **Result**
   - **Both pass →** show the **SOS screen** with a single big **SOS** button.
   - **Any fail →** show a clear "couldn't verify" state with the option to retake the photo (no alert is triggered).
6. **SOS action** — one tap on **SOS** triggers everything (calls / SMS / IVR to emergency contacts). All dispatch happens server-side (Twilio, etc.); the webapp just calls the trigger endpoint.
   - **[OPEN — server]** SOS/trigger endpoint kept open (§7).
   - Also send the bystander's live **GPS** with the trigger (for the location deep-link to contacts).

## 6. Parking flow (stub for now)
- Second landing option. Detailed UX TBD.
- Intent: report a parking obstruction against the QR-mapped vehicle → server routes an anonymous alert to the owner (see `root.md` §4.1, with the 5-minute cooldown).
- **[OPEN — server]** Parking-alert endpoint kept open (§7).

---

## 7. Backend integration seams (KEEP OPEN — wire later)
The webapp should call these through a single API client module with the base URL in an env var (`NEXT_PUBLIC_API_BASE`) and clearly-marked TODO stubs so nothing hard-blocks on the server being ready. Names align with / refine `root.md` §6.2.

| # | Method | Path (proposed) | Purpose | Returns (proposed) |
|---|--------|-----------------|---------|--------------------|
| 1 | `GET` | `/api/v1/qr/{qr_token}` | Resolve the scanned QR → session/vehicle context. | `{ active, categories_enabled }` — **no PII** |
| 2 | `POST` | `/api/v1/incidents/init` | Open an incident for this token; get an `incident_token`. *(May be merged into #1.)* | `{ incident_token }` |
| 3 | `POST` | `/api/v1/incidents/{token}/verify-accident` | **Image verification pipeline** — multipart photo in; runs accident-detection **and** plate-match against the QR-mapped plate. | `{ is_accident, plate_match, verified, sos_unlocked }` |
| 4 | `POST` | `/api/v1/incidents/{token}/sos` | Fire all calls/SMS/IVR. Send bystander GPS. Idempotent per token. | `{ dispatched: true }` |
| 5 | `POST` | `/api/v1/incidents/{token}/parking` | Parking-obstruction alert to owner (cooldown enforced server-side). | `{ queued: true }` |

Mapping to existing contract: #3 refines `root.md` §6.2 `/incidents/{token}/verify` (now also does plate-match, since the QR — not a separate OCR scan — identifies the vehicle); #4 is `trigger-emergency`. **Action item:** update `root.md` §6.2 + `Guardian-Server/CLAUDE.md` to reflect QR-based entry (QR replaces the bystander OCR plate-lookup for *identification*; the photo's plate is used only for *authenticity*).

---

## 8. Key technical flags (decide before building)
- **Enforcing "camera only, no gallery" is not free on the web.**
  - `<input type="file" accept="image/*" capture="environment">` only *hints* the camera — many phones/browsers still let the user pick from the gallery. It is **not** a hard guarantee.
  - The reliable approach is an **in-page live camera** via `getUserMedia({ video: { facingMode: 'environment' } })`, drawing to a `<canvas>` and uploading that frame — the user never gets a file picker.
  - Even then, true authenticity is enforced **server-side** (the verification pipeline: accident detection + plate match, and optionally EXIF/liveness signals). Treat the client restriction as UX, the server check as the real gate.
- **Permissions:** camera and location prompts will be the top failure points — handle denial with a clear recovery message on every step.
- **HTTPS required** for `getUserMedia` and geolocation.
- **Anonymous:** the bystander has no account; the `qr_token` + `incident_token` carry all state. Never request or display owner PII.
- **No client-side trust:** the SOS button stays disabled until the server returns `sos_unlocked: true`; the client never decides "verified" on its own.

## 9. Open questions (for the team)
- QR token format & lifetime — static per vehicle, or rotating? (server decision)
- Does SOS also expose the read-only medical passport to the bystander (per `root.md` §3.1 step 5)? Assumed yes — confirm.
- Parking flow detail: preset messages? photo required? cooldown UX.
- Any consent/legal copy needed before capturing/uploading a photo?
