import type { NextRequest } from "next/server";
import { failure, json } from "@/lib/api";
import { estimateSchema, publicEstimate } from "@/services/tax/public-estimate";

/** Public, unauthenticated, rate-limited. Reads no user data and stores nothing. */
export async function POST(request: NextRequest) {
  try {
    return json({ result: await publicEstimate(estimateSchema.parse(await request.json())) });
  } catch (error) {
    return failure(error, "We couldn't calculate an estimate just now. Please try again.");
  }
}
