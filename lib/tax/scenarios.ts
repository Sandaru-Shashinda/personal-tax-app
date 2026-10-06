import type { TaxInputs } from "./types";

// Fixed scenarios an administrator runs a draft rule against before activating it. Figures are
// illustrative people, not real taxpayers. The last two mirror worked examples in the IRD Guide.

export interface Scenario {
  id: string;
  name: string;
  inputs: TaxInputs;
}

const base: TaxInputs = { residency: "RESIDENT", income: [], deductibleExpenses: [], qualifyingPayments: [], payments: [] };

export const SCENARIOS: Scenario[] = [
  {
    id: "salary-150k",
    name: "Employee, Rs. 150,000 a month",
    inputs: { ...base, income: [{ label: "Salary", kind: "SALARY", amount: 1_800_000 }] },
  },
  {
    id: "salary-300k",
    name: "Employee, Rs. 300,000 a month",
    inputs: { ...base, income: [{ label: "Salary", kind: "SALARY", amount: 3_600_000 }] },
  },
  {
    id: "salary-750k",
    name: "Senior employee, Rs. 750,000 a month, with interest",
    inputs: {
      ...base,
      income: [
        { label: "Salary", kind: "SALARY", amount: 9_000_000 },
        { label: "Interest", kind: "INTEREST", amount: 600_000 },
      ],
    },
  },
  {
    id: "freelancer-export",
    name: "Freelancer with local and foreign-currency clients",
    inputs: {
      ...base,
      income: [
        { label: "Local clients", kind: "BUSINESS", amount: 2_400_000 },
        { label: "Foreign clients", kind: "BUSINESS", amount: 3_000_000, foreignSource: true, foreignCurrencyRemitted: true },
      ],
      deductibleExpenses: [{ label: "Running costs", amount: 400_000, pool: "LOCAL" }],
    },
  },
  {
    id: "landlord",
    name: "Landlord with rent of Rs. 250,000 a month and deposit interest",
    inputs: {
      ...base,
      income: [
        { label: "Rent", kind: "RENT", amount: 3_000_000 },
        { label: "Interest", kind: "INTEREST", amount: 1_200_000 },
      ],
    },
  },
  {
    id: "land-sale-early",
    name: "Employee who realised a Rs. 2M gain on land early in the year",
    inputs: {
      ...base,
      income: [
        { label: "Salary", kind: "SALARY", amount: 3_000_000 },
        { label: "Land", kind: "CAPITAL_GAIN", amount: 2_000_000 },
      ],
    },
  },
  {
    id: "ird-example-1",
    name: "IRD Guide example 1 — salary Rs. 240,000 a month and interest",
    inputs: {
      ...base,
      income: [
        { label: "Salary", kind: "SALARY", amount: 2_880_000 },
        { label: "Interest", kind: "INTEREST", amount: 140_000 },
      ],
    },
  },
  {
    id: "ird-example-4",
    name: "IRD Guide example 4 — employment, business, interest and rent",
    inputs: {
      ...base,
      income: [
        { label: "Employment", kind: "SALARY", amount: 7_500_000 },
        { label: "Business", kind: "BUSINESS", amount: 11_740_000 },
        { label: "Interest", kind: "INTEREST", amount: 8_000_000 },
        { label: "Rent", kind: "RENT", amount: 1_900_000 },
      ],
      qualifyingPayments: [
        { label: "Hospital", kind: "GOVERNMENT_DONATION", amount: 1_000_000 },
        { label: "Samurdhi shop", kind: "SAMURDHI_SHOP", amount: 800_000 },
        { label: "Solar", kind: "SOLAR_PANEL", amount: 200_000 },
      ],
    },
  },
];
