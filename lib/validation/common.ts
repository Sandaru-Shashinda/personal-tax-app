import { z } from "zod";
import { todayInSriLanka } from "@/lib/format";

const MAX_AMOUNT = 1_000_000_000_000; // Rs. 1 trillion: far above any personal figure, guards typos

/** Accepts numbers or numeric strings from forms ("250,000"). */
export const money = z.preprocess(
  (value) => (typeof value === "string" ? Number(value.replace(/[,\s]/g, "")) : value),
  z.number({ error: "Enter an amount" }).min(0, "Amount cannot be negative").max(MAX_AMOUNT, "That amount looks too large").multipleOf(0.01, "Use at most two decimal places"),
);

export const optionalMoney = z.preprocess((value) => (value === "" || value === null || value === undefined ? 0 : value), money);

export const signedMoney = z.preprocess(
  (value) => (typeof value === "string" ? Number(value.replace(/[,\s]/g, "")) : value),
  z.number({ error: "Enter an amount" }).min(-MAX_AMOUNT).max(MAX_AMOUNT),
);

export const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid date")
  .refine((value) => !Number.isNaN(Date.parse(`${value}T00:00:00Z`)), "Enter a valid date");

export const pastOrTodayDate = isoDate.refine((value) => value <= todayInSriLanka(), "Date cannot be in the future");

export const uuid = z.string().uuid("Invalid reference");

export const optionalUuid = z.preprocess((v) => (v === "" || v === null ? undefined : v), uuid.optional());

export const optionalText = (max: number) =>
  z.preprocess((v) => (typeof v === "string" && v.trim() === "" ? undefined : v), z.string().trim().max(max).optional());

export const taxYearCode = z.string().regex(/^\d{4}\/\d{4}$/, "Invalid tax year");

export const currencyCode = z.string().regex(/^[A-Z]{3}$/, "Use a three-letter currency code");

export const pagination = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});
