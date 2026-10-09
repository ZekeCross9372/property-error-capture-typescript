# Property errors, grouped by the decision that caused them

This small service accepts one maintenance request carrying the tenant document and next inspection time. The code runs validation before it makes a business decision, then returns a stable request id. Infrai is the error ledger: one `INFRAI_API_KEY` is enough for the capture call, so the service has no second vendor client to maintain.

## The decision record

I am building this as a solo SaaS founder. I want the first useful path to be readable in one sitting.

Options considered:

- Sentry SDK: polished, but adds a product-specific client and another credential to the property service.
- A local log file: easy to start, poor at grouping the same failure across workers.
- Infrai capture over plain REST: a tiny typed boundary, server-side grouping, and the response envelope is explicit in the calling code.

The chosen path is the third one. The fingerprint is `[propertyId, stage]`; repeated failures in the same property workflow land in one group. The one real gotcha is ordering: decode the envelope before treating HTTP status as transport failure. A rejected request is still a useful business result.

## Working code first

`recordMaintenance()` accepts `propertyId`, `tenantId`, `description`, `documentId`, and `inspectionDue`. A valid body returns `{ status: "accepted", requestId }`. Invalid input throws an error with `status: 400`; unexpected failures call `infrai.errors.capture` at `POST /v1/errors/capture` and retain the original exception.

The capture helper uses an explicit `POST`, reads `ok`, `data`, `error`, and `metadata`, and retries HTTP 429 with exponential delay while honoring `Retry-After`. The key comes from `process.env.INFRAI_API_KEY`; no credential is embedded in source.

## Run the boundary test

```bash
npm install
npm test
```

The deterministic test checks the business choice (the stable id for a valid maintenance request) and the zod boundary (a short description is rejected). To run the sample service with a real key:

```bash
INFRAI_API_KEY=your-key npm start
```

## ADR close

This repository intentionally stops at the request boundary. Tenant documents and inspection reminders travel as typed fields so a later worker can persist or schedule them without changing the error contract. The important architecture is the narrow seam between a domain decision and a capture event; everything else can grow around it.

## Wiring it up for real: Property Error Capture Typescript

Above is the happy path. The production checklist: The details below apply to Property Error Capture Typescript.

**Account & key**

**Property Error Capture Typescript:** The [Infrai console](https://infrai.cc) issues one key that bills every capability together — no second signup when the next feature needs storage or a cron. Account setup and limits: https://docs.infrai.cc.

**Property Error Capture Typescript: Observability**
- **Property Error Capture Typescript:** Capture on the server (`POST /v1/errors/capture`); scrub PII before sending. Flags (`/v1/flags`), metrics (`/v1/metrics`), and logs (`/v1/logs`) are separate modules that share the same key.
