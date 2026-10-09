import assert from "node:assert/strict";
import { maintenanceRequest, recordMaintenance } from "../src/property_error_service.js";

const valid = { propertyId: "building-7", tenantId: "tenant-42", description: "Leaking kitchen faucet", documentId: "lease-42", inspectionDue: "2026-10-01T09:00:00.000Z" };
assert.equal(maintenanceRequest.safeParse(valid).success, true);
const result = await recordMaintenance(valid);
assert.deepEqual(result, { status: "accepted", requestId: "building-7:tenant-42:lease-42" });
assert.equal(maintenanceRequest.safeParse({ ...valid, description: "bad" }).success, false);
console.log("property decision test passed");
