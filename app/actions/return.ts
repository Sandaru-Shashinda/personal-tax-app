"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { run } from "@/lib/action";
import { authenticate } from "@/lib/auth/session";
import type { ActionResult } from "@/lib/errors";
import { optionalText, pastOrTodayDate, taxYearCode } from "@/lib/validation/common";
import { recordFiledByUser, setSectionReviewed } from "@/services/tax/return-service";
import { recalculate } from "@/services/tax/tax-service";

const sectionSchema = z.object({
  taxYear: taxYearCode,
  key: z.enum(["TAXPAYER_DETAILS", "INCOME", "DEDUCTIONS", "RELIEFS", "CALCULATION", "PAYMENTS", "VALIDATION", "SUMMARY"]),
  reviewed: z.boolean(),
});

export async function setSectionReviewedAction(input: unknown): Promise<ActionResult> {
  return run(async () => {
    const user = await authenticate();
    const data = sectionSchema.parse(input);
    // Generating the summary saves the calculation it is based on.
    if (data.key === "SUMMARY" && data.reviewed) await recalculate(user.id, data.taxYear, "user");
    await setSectionReviewed(user.id, data.taxYear, data.key, data.reviewed);
    revalidatePath("/", "layout");
  }, "We couldn't update this step. Please try again.");
}

const filedSchema = z.object({ taxYear: taxYearCode, filedOn: pastOrTodayDate, acknowledgementNo: optionalText(80) });

export async function recordFiledAction(input: unknown): Promise<ActionResult> {
  return run(
    async () => {
      const user = await authenticate();
      const { taxYear, ...rest } = filedSchema.parse(input);
      await recordFiledByUser(user.id, taxYear, rest);
      revalidatePath("/", "layout");
    },
    "We couldn't save this. Please try again.",
    "Recorded. Your filing status now shows as filed.",
  );
}
