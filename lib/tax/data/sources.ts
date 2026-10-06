// Source register. Mirrors TAX_RULES.md §10; `ref` is the stable key rules point at.

export type SourceDocumentType = "ACT" | "GAZETTE" | "CIRCULAR" | "GUIDELINE" | "BILL" | "IRD_NOTICE" | "OTHER";

export interface SourceSeed {
  ref: string;
  title: string;
  authority: string;
  url: string;
  documentType: SourceDocumentType;
  publicationDate: string | null;
  notes?: string;
}

export const LAST_VERIFIED = "2026-10-06";

export const SOURCES: SourceSeed[] = [
  {
    ref: "S1",
    title: "Notice PN/IT/2025-01 — Amendments under Inland Revenue (Amendment) Act, No. 02 of 2025",
    authority: "Inland Revenue Department",
    url: "https://www.ird.gov.lk/en/Lists/Latest%20News%20%20Notices/Attachments/666/PN_IT_2025-01_26032025_E.pdf",
    documentType: "IRD_NOTICE",
    publicationDate: "2025-03-26",
  },
  {
    ref: "S2",
    title: "Notice SEC/PN/IT/2026/02 — Amendments under Inland Revenue (Amendment) Act, No. 11 of 2026",
    authority: "Inland Revenue Department",
    url: "https://www.ird.gov.lk/en/Lists/Latest%20News%20%20Notices/Attachments/788/SEC_PN_IT_2026-02.pdf",
    documentType: "IRD_NOTICE",
    publicationDate: "2026-06-08",
  },
  {
    ref: "S3",
    title: "Tax Chart 2025/2026",
    authority: "Inland Revenue Department",
    url: "https://www.ird.gov.lk/en/publications/SitePages/tax_chart_2526.aspx?menuid=1404",
    documentType: "GUIDELINE",
    publicationDate: null,
  },
  {
    ref: "S4",
    title: "Guide to fill the Return of Income, Schedules & Statement of Assets and Liabilities — Individual, Y/A 2025/2026 (Asmt_IIT_004_E)",
    authority: "Inland Revenue Department",
    url: "https://www.ird.gov.lk/en/Downloads/IT_Individuals_Doc/Asmt_IIT_004_2025_2026_E.pdf",
    documentType: "GUIDELINE",
    publicationDate: null,
  },
  {
    ref: "S5",
    title: "APIT Tax Table No. 01 — Monthly tax deductions from regular profits from employment, 2025/2026",
    authority: "Inland Revenue Department",
    url: "https://www.ird.gov.lk/en/publications/APIT_Tax_Tables/2025-2026/Table%20-%201/02.%20APIT_2526_Table_01_Text.pdf",
    documentType: "GUIDELINE",
    publicationDate: null,
  },
  {
    ref: "S6",
    title: "Tax Chart 2024/2025",
    authority: "Inland Revenue Department",
    url: "https://www.ird.gov.lk/en/publications/SitePages/Tax_Chart_2425.aspx?menuid=140407",
    documentType: "GUIDELINE",
    publicationDate: null,
  },
  {
    ref: "S7",
    title: "Tax Calendar 2026 — last dates for making payments and filing returns",
    authority: "Inland Revenue Department",
    url: "https://www.ird.gov.lk/en/publications/Tax%20Calendar_Documents/Tax_Calendar_2026_E.pdf",
    documentType: "GUIDELINE",
    publicationDate: null,
  },
  {
    ref: "S8",
    title: "Inland Revenue (Amendment) Act, No. 02 of 2025",
    authority: "Parliament of Sri Lanka",
    url: "https://documents.gov.lk/view/acts/2025/3/02-2025_E.pdf",
    documentType: "ACT",
    publicationDate: "2025-03-20",
  },
  {
    ref: "S9",
    title: "KPMG Sri Lanka — guidance on Advance Income Tax procedures (April 2025)",
    authority: "KPMG Sri Lanka (secondary source)",
    url: "https://kpmg.com/us/en/taxnewsflash/news/2025/04/sri-lanka-guidance-advance-income-tax-procedures.html",
    documentType: "OTHER",
    publicationDate: "2025-04-01",
    notes: "Secondary source. Used only where no IRD document was read directly.",
  },
  {
    ref: "S12",
    title: "Inland Revenue Act, No. 24 of 2017",
    authority: "Parliament of Sri Lanka",
    url: "https://www.documents.gov.lk/view/acts/2017/10/24-2017_E.pdf",
    documentType: "ACT",
    publicationDate: "2017-10-24",
    notes: "Principal enactment. Cited as the governing law; not read section by section for this register.",
  },
];
