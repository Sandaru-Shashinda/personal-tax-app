import { z } from "zod";
import { authed, json } from "@/lib/api";
import { taxYearCode } from "@/lib/validation/common";
import { recalculate } from "@/services/tax/tax-service";

const body = z.object({ taxYear: taxYearCode });

/** Calculates on the server from stored records and saves a snapshot if anything changed. */
export const POST = authed("We couldn't calculate your tax. Please try again.", async (request, user) => {
  const { taxYear } = body.parse(await request.json());
  const { summary, calculationId, changed } = await recalculate(user.id, taxYear, "user");
  return json({ calculationId, changed, taxYear: summary.taxYear, result: summary.result }, changed ? 201 : 200);
});
