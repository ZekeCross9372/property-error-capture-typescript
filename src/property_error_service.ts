import { z } from "zod";
import { capture } from "./infrai_errors.js";

export const maintenanceRequest = z.object({ propertyId: z.string().min(1), tenantId: z.string().min(1), description: z.string().min(5), documentId: z.string().min(1), inspectionDue: z.string().datetime() });
export type MaintenanceRequest = z.infer<typeof maintenanceRequest>;

export async function recordMaintenance(input: unknown): Promise<{ status: "accepted"; requestId: string }> {
  const parsed = maintenanceRequest.safeParse(input);
  if (!parsed.success) throw Object.assign(new Error("invalid maintenance request"), { status: 400, issues: parsed.error.issues });
  const requestId = `${parsed.data.propertyId}:${parsed.data.tenantId}:${parsed.data.documentId}`;
  try {
    return { status: "accepted", requestId };
  } catch (error) {
    await capture(error, { propertyId: parsed.data.propertyId, requestId, stage: "record" });
    throw error;
  }
}

if (process.argv[1]?.endsWith("property_error_service.ts")) {
  const sample = { propertyId: "building-7", tenantId: "tenant-42", description: "Leaking kitchen faucet", documentId: "lease-42", inspectionDue: "2026-10-01T09:00:00.000Z" };
  recordMaintenance(sample)
    .then(async (result) => {
      await capture(new Error("sample maintenance capture"), { propertyId: sample.propertyId, requestId: result.requestId, stage: "sample" });
      console.log(result);
    })
    .catch((error) => { console.error(error); process.exitCode = 1; });
}
