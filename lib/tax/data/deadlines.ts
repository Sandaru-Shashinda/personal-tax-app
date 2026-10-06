// Statutory due dates for individuals. 2025/2026 and the 2026 dates of 2026/2027 are read from
// IRD's Guide (S4) and Tax Calendar 2026 (S7). 2027 dates follow the statutory pattern and are
// flagged until IRD publishes its 2027 calendar (TAX_RULES.md U5).

import type { Verification } from "../types";

export type DeadlineType = "INSTALMENT" | "FINAL_PAYMENT" | "RETURN_FILING" | "APIT_REMITTANCE" | "ANNUAL_STATEMENT" | "OTHER";

export interface DeadlineSeed {
  taxYear: string;
  type: DeadlineType;
  title: string;
  description: string;
  dueOn: string;
  appliesTo: "INDIVIDUAL" | "EMPLOYER";
  verification: Verification;
  sourceRef: string;
}

function yearDeadlines(taxYear: string, verified: (dueOn: string) => { verification: Verification; sourceRef: string }): DeadlineSeed[] {
  const [startYear, endYear] = taxYear.split("/").map(Number);
  const make = (type: DeadlineType, title: string, description: string, dueOn: string): DeadlineSeed => ({
    taxYear,
    type,
    title,
    description,
    dueOn,
    appliesTo: "INDIVIDUAL",
    ...verified(dueOn),
  });
  const instalment = "Quarterly self-assessment instalment of income tax.";
  return [
    make("INSTALMENT", "1st instalment", instalment, `${startYear}-08-15`),
    make("INSTALMENT", "2nd instalment", instalment, `${startYear}-11-15`),
    make("INSTALMENT", "3rd instalment", instalment, `${endYear}-02-15`),
    make("INSTALMENT", "4th instalment", instalment, `${endYear}-05-15`),
    make("FINAL_PAYMENT", "Final payment", "Balance of income tax for the year of assessment.", `${endYear}-09-30`),
    make("RETURN_FILING", "Return of income", "File the return of income, schedules and statement of assets and liabilities through IRD e-Services.", `${endYear}-11-30`),
  ];
}

export const DEADLINES: DeadlineSeed[] = [
  ...yearDeadlines("2024/2025", () => ({ verification: "VERIFIED_SECONDARY", sourceRef: "S4" })),
  ...yearDeadlines("2025/2026", () => ({ verification: "VERIFIED", sourceRef: "S4" })),
  ...yearDeadlines("2026/2027", (dueOn) =>
    dueOn.startsWith("2026") ? { verification: "VERIFIED", sourceRef: "S7" } : { verification: "REQUIRES_VERIFICATION", sourceRef: "S7" },
  ),
];
