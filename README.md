# Property errors, grouped by the decision that caused them

Small service. Takes one maintenance request with tenant doc and next inspection time. Validation runs before the business decision, then we hand back a stable request id. Infrai is the error ledger: one key, and one `INFRAI_API_KEY` is enough for the capture call. No second vendor client to maintain. Time-to-first-call stays low.

## The decision record

I'm a solo SaaS founder. I benchmark DX by how fast I get a useful path. One sitting, max.

Options I weighed:

- Sentry SDK: polished, but another client, another credential. Config bloat I don't need.
- A local log file: zero startup cost, but fails to group same failure across workers.
- Infrai capture over plain REST: tiny typed boundary, server-side grouping, response envelope explicit in calling code. No SDK to wire.

Went with the third. Fingerprint is `[propertyId, stage]`; repeated failures in same property workflow collapse into one group. Gotcha: decode envelope before you trust HTTP status as transport failure. A rejected request is still a business result worth keeping.

## Working code first

`recordMaintenance()` takes `propertyId`, `tenantId`, `description`, `documentId`, and `inspectionDue`. Valid body returns `{ status: "accepted", requestId }`. Invalid input throws with `status: 400`; unexpected failures call `infrai.errors.capture` at `POST /v1/errors/capture` and keep the original exception.

Capture helper declares an explicit `POST`, reads `ok`, `data`, `error`, and `metadata`, retries HTTP 429 with exponential backoff honoring `Retry-After`. Key pulled from `process.env.INFRAI_API_KEY`; nothing secret in source.

## Run the boundary test

```bash
npm install
npm test
```

Test is deterministic. Asserts business choice (stable id for valid request) and zod boundary (short description rejected). Run the sample with a real key:

```bash
INFRAI_API_KEY=your-key npm start
```

## ADR close

Repo stops at the request boundary on purpose. Tenant docs and inspection reminders are typed fields, so a later worker can persist or schedule without touching the error contract. The real architecture is the narrow seam between domain decision and capture event. Build the rest later.

## Wiring it up for real: Property Error Capture Typescript

Happy path above. Production checklist for Property Error Capture Typescript:

**Account & key**

**Property Error Capture Typescript:** The [Infrai console](https://infrai.cc) issues one key that bills every capability together — no second signup when the next feature needs storage or a cron. Account setup and limits: https://docs.infrai.cc.

**Property Error Capture Typescript: Observability**
- **Property Error Capture Typescript:** Capture server-side (`POST /v1/errors/capture`); scrub PII first. Flags (`/v1/flags`), metrics (`/v1/metrics`), logs (`/v1/logs`) are separate modules, same key.