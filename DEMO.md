# Power Atlas — 5-Minute Demo Walkthrough (v0.6)

A guided tour of what's built. The throughline: **every output is candidate / estimated /
derived, and the tool is explicit about what it does *not* know.** The honest posture is the product.

> Setup: `npm install && npm run dev`, then open http://localhost:3000. The default `georgia-demo`
> dataset is committed, so the map works immediately — no ingestion needed.

---

### 1. Load the app — confirm the data is real and local
The map loads substations + transmission lines for the Atlanta / North Georgia corridor. Click
**Ingestion Center** (top-right) to see the source manifest: real OpenStreetMap (power/water) + FEMA
NFHL (flood) feature counts, the bounding box, last-synced date, and each layer's warnings +
limitations. Everything is fetched from local GeoJSON — there are no live Overpass/FEMA calls from
the browser.

### 2. Observe the placed campus + candidate power path
A campus marker sits at the default downtown location. A red **candidate power path** runs from it to
the nearest *plausible* substation. The right-hand **Candidate Power Dependency** panel reports the
substation, distance, raw OSM voltage tag, load class, reason codes, and posture badges
(Source / Path / Capacity).

### 3. Move the campus — watch the power candidate re-resolve
Click anywhere on the map to reposition the campus. The candidate substation, distance, and path
re-resolve live. (Distance is measured from each feature's representative coordinate, computed from
full-resolution geometry — display simplification can't move a result.)

### 4. Change campus size 100 MW → 250 MW — watch load class + candidate change
In the **Scenario** panel, bump the size. The **Load Class** escalates and, where a closer
low-voltage substation is no longer plausible for the larger load, the candidate jumps to a
transmission-voltage one. A less-suitable source is never hidden — it's surfaced and flagged.

### 5. Enable Water, switch cooling Air → Evaporative — the cross-layer cascade
Toggle **Water** on (left panel, "Water" group). A candidate water source resolves. Now switch
**Cooling type** Air → Evaporative: the qualitative **Water Demand** class rises, and a nearby minor
stream can flip from plausible to insufficient, re-resolving to a larger source. **This is the
digital-twin moment** — a choice in one layer (cooling) cascades into another (water). It is
direction and class only; no consumption magnitude is ever claimed.

### 6. Enable Flood — site-risk + the FEMA caveat
Toggle **Flood Zones (FEMA)** on (the "Risk" group). The **Flood Risk** panel reports the campus's
relationship to mapped zones — *inside* / *near* (with nearest-edge distance) / *none* — plus the
qualitative FEMA zone class and severity. Every flood result carries the caveat that the data is
**statically cached, not current or authoritative**, and must be verified against the official FEMA
Flood Map Service Center (msc.fema.gov). "None" is always qualified: absence of a mapped zone is not
proof of no risk.

### 7. Scrub the construction timeline — assets reveal by phase
Use the **Build Phase** scrubber at the bottom (`Site Prep → Power → Water + Cooling → Operational`).
Scrubbing reveals the campus's build features in sequence, and the **Campus Massing** 3D inset
(top-right) visibly assembles. Phases are an ordinal **sequence, not a schedule** — no durations or
dates. The 3D is **schematic massing** (representative blocks, not real dimensions or layout).

### 8. Open the Explain drawer — read the reasoning
Click **Explain this candidate ▸** on any panel. A drawer slides in surfacing exactly what the
resolver already produced: human-readable reason codes (with the raw code shown), the verbatim raw
OSM/FEMA tags, source/path/risk confidence, capacity/risk status, and the layer's caveats. It
computes nothing new — it makes the existing rationale legible.

### 9. Say what it IS and IS NOT claiming — end here
Power Atlas shows **candidate / estimated / derived** dependencies and site-risk from public data. It
does **not** represent official utility capacity, interconnection feasibility, grid connectivity,
water rights or withdrawal capacity, or current/authoritative flood determinations — and it never
emits a consumption or capacity magnitude. Everything shown requires professional, external
verification. The posture — confident where the domain is confident, explicit about what it can't
know — is the point.
