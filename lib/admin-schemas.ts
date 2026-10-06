import { z } from "zod";
import { isoDate, optionalText, optionalUuid, taxYearCode } from "@/lib/validation/common";

// Validation for the tax-rule administration forms, shared by the browser and the server.

export type { AdminRule, ScenarioPreview } from "@/services/admin/rule-admin-service";

const verification = z.enum(["VERIFIED", "VERIFIED_SECONDARY", "REQUIRES_VERIFICATION"]);

export const draftVersionSchema = z.object({
  ruleId: z.string().uuid(),
  parametersJson: z.string().min(2, "Enter the parameters as JSON"),
  effectiveFrom: isoDate,
  effectiveTo: z.preprocess((v) => (v === "" ? undefined : v), isoDate.optional()),
  verification,
  sourceId: optionalUuid,
  sourceLocator: optionalText(200),
  notes: optionalText(2000),
});

export const sourceSchema = z.object({
  ref: z.string().trim().regex(/^[A-Z0-9-]{1,20}$/, "Use a short reference such as S14"),
  title: z.string().trim().min(3, "Enter the document's title").max(400),
  authority: z.string().trim().min(2, "Enter the issuing authority").max(200),
  url: z.string().trim().url("Enter a full URL").max(1000),
  documentType: z.enum(["ACT", "GAZETTE", "CIRCULAR", "GUIDELINE", "BILL", "IRD_NOTICE", "OTHER"]),
  publicationDate: z.preprocess((v) => (v === "" ? undefined : v), isoDate.optional()),
  notes: optionalText(2000),
});

export const newTaxYearSchema = z.object({ code: taxYearCode });

export const deadlineUpdateSchema = z.object({ id: z.string().uuid(), dueOn: isoDate, verification });
