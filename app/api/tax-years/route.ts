import { authed, json } from "@/lib/api";
import { listTaxYears } from "@/services/tax/rule-repository";

export const GET = authed("We couldn't load tax years.", async () => json({ items: await listTaxYears() }));
