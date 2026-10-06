"use server";

import { run } from "@/lib/action";
import type { ActionResult } from "@/lib/errors";
import type { TaxResult } from "@/lib/tax/types";
import { estimateSchema, publicEstimate } from "@/services/tax/public-estimate";

export async function estimateAction(input: unknown): Promise<ActionResult<TaxResult>> {
  return run(() => publicEstimate(estimateSchema.parse(input)), "We couldn't calculate an estimate just now. Please try again.");
}
