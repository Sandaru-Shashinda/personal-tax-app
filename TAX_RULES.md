# Sri Lankan Personal Income Tax Rules — Research Register

**Last verified:** 2026-10-06
**Scope:** Individuals (resident and non-resident) under the Inland Revenue Act, No. 24 of 2017 ("IRA") as amended.
**Status of this document:** Research output for review. It is the human-readable twin of the seeded `TaxRule` / `TaxRuleSource` data. Nothing here is legal or tax advice.

Every rule carries a verification status:

| Status | Meaning |
|---|---|
| `VERIFIED` | Read directly in a primary source (IRD / Parliament / Gazette document), cited below. |
| `VERIFIED_SECONDARY` | Not read in a primary document; consistent across reputable secondary sources. Shown to users with a caveat. |
| `REQUIRES_VERIFICATION` | Primary sources are silent, unpublished, or conflict. Surfaced to administrators; the engine either refuses to apply the rule or applies the conservative default stated here. |

---

## 1. Year of assessment

A year of assessment (Y/A) runs **1 April – 31 March** (IRD Guide S4 §A.3, A.10).

| Y/A | Period | Governing amendments | Rule set status |
|---|---|---|---|
| 2024/2025 | 2024-04-01 → 2025-03-31 | IRA as amended up to Act No. 45 of 2022 / No. 04 of 2023 | Rates `VERIFIED` (S6) |
| 2025/2026 | 2025-04-01 → 2026-03-31 | + Inland Revenue (Amendment) Act, No. 02 of 2025 (certified 2025-03-20) | `VERIFIED` (S1, S3, S4) |
| **2026/2027 (current)** | 2026-04-01 → 2027-03-31 | + Inland Revenue (Amendment) Act, No. 11 of 2026 (certified 2026-06-03) | Rates carried forward — see U2 |

Today (2026-10-06) falls in Y/A 2026/2027. The return for Y/A 2025/2026 is due **30 November 2026**.

---

## 2. Computation structure (all years)

Source: IRD Guide to the individual return, Y/A 2025/2026 (S4), Return Parts A–C and Schedules 1–10.

```
Employment income (Sch. 1)  + Business income (Sch. 2)
+ Investment income (Sch. 3) + Other income (Sch. 4)
= ASSESSABLE INCOME                                   (cage 50)
− Reliefs (personal, rent, solar)                      (cage 90)
− Qualifying payments                                  (cage 100)
= TAXABLE INCOME                                       (cage 120)

Tax = terminal benefits at concessionary rates
    + gains on realisation of investment assets at the flat CGT rate
    + betting/gaming/liquor/tobacco business income at the flat special rate
    + foreign-currency remitted income at progressive rates capped at 15%
    + balance at progressive rates
    + tax on final-withholding payments where the agent failed to deduct

Balance payable = Tax − credits (APIT, AIT/WHT, foreign tax credit,
                  CGT paid, instalments, final payment)
```

Rules that shape the engine:

| # | Rule | Status | Source |
|---|---|---|---|
| C1 | Residents are assessed on worldwide income; non-residents on Sri Lanka-source income only. | VERIFIED | S4 §A.4 |
| C2 | Employment income is reported on a **cash basis** (amounts actually received in the Y/A). Expenses are **not deductible** against employment income. | VERIFIED | S4 Sch.1; Example 6 |
| C3 | Business income is declared net of allowable expenses and capital allowances. | VERIFIED | S4 Sch.2; Examples 2–4 |
| C4 | Dividends from a resident company are subject to **15% final WHT** and are *not* added to assessable income; no further tax. | VERIFIED | S4 Sch.3 §2, Annex 4(j), Example 5 |
| C5 | Interest: AIT is **not final** for residents — gross interest is assessable and the AIT is a credit. | VERIFIED | S4 Examples 1, 4, 5, 6 |
| C6 | Personal relief cannot be set against gains on realisation of investment assets. | VERIFIED | S4 Annex 1(a); S3 |
| C7 | Personal relief and qualifying payments may be set against either foreign-source or local income "to get maximum benefit for the taxpayer". | VERIFIED | S4 Example 3 & 6 remarks |
| C8 | Foreign tax credit is limited to Sri Lankan tax on that foreign income; excess is neither refundable nor usable against other tax. | VERIFIED | S4 Sch.9(a), Example 2 remark |
| C9 | Motor-vehicle disposal gains (non-trading, non-depreciable) are not "other income"; losses not deductible. Effective 2024-04-01. | VERIFIED | S2 §1 |
| C10 | Life-insurance proceeds on death, maturity or surrender are excluded (new s.52A). Effective 2025-04-01. | VERIFIED | S2 §5 |

---

## 3. Rates and thresholds by year

### 3.1 Personal relief and progressive rates

| | 2024/2025 | 2025/2026 | 2026/2027 |
|---|---|---|---|
| Personal relief (resident, or non-resident citizen) | Rs. 1,200,000 | Rs. 1,800,000 | Rs. 1,800,000 |
| Band 1 | first 500,000 @ 6% | first 1,000,000 @ 6% | first 1,000,000 @ 6% |
| Band 2 | next 500,000 @ 12% | next 500,000 @ 18% | next 500,000 @ 18% |
| Band 3 | next 500,000 @ 18% | next 500,000 @ 24% | next 500,000 @ 24% |
| Band 4 | next 500,000 @ 24% | next 500,000 @ 30% | next 500,000 @ 30% |
| Band 5 | next 500,000 @ 30% | balance @ 36% | balance @ 36% |
| Band 6 | balance @ 36% | — | — |
| Status | VERIFIED (S6) | VERIFIED (S1, S3, S4 Annex 7) | See U2 |

The 2025 notice words the relief as applying to "any year of assessment (commencing from the Y/A 2025/2026)", and Act No. 11 of 2026 does not alter rates or relief (S2). No Y/A 2026/2027 IRD tax chart or APIT tables had been published as of the verification date.

### 3.2 Special rates

| Item | 2024/2025 | 2025/2026 | 2026/2027 | Status / source |
|---|---|---|---|---|
| Gains on realisation of investment assets (CGT), individuals | 10% | 10% | **10% for realisations to 2026-06-02; 15% from 2026-06-03** | VERIFIED (S6, S4 Sch.8(c), S2 §20). Mid-year split: see U3 |
| Betting & gaming / liquor / tobacco business | 40% | 45% | 45% | VERIFIED (S6, S1 §2.1(c)) |
| Service exports & foreign-source income received in foreign currency and remitted through a bank | Exempt | Progressive, **max 15%** | Progressive, max 15% | 2025/26: VERIFIED (S1 §2.1(b), §3). 2024/25 exemption: VERIFIED_SECONDARY. Mechanics: U1 |
| Terminal benefits (commuted pension, retiring gratuity, approved compensation, ETF) | 0% first 10M / 6% next 10M / 12% balance | same | same | VERIFIED (S6, S4 Annex 5–6) |

### 3.3 Reliefs and qualifying payments

| Item | Rule | Years | Status / source |
|---|---|---|---|
| Rent relief | 25% of total rental income from an investment asset (resident individuals) | all three | VERIFIED (S4 Annex 1(b), S3, S6) |
| Solar panel relief | Rs. 600,000 per Y/A, up to total expenditure / loan repayments, resident individual, grid-connected | all three | VERIFIED (S4 Annex 1(c)) |
| Donation — approved charity | Lowest of: amount donated, Rs. 75,000, one-third of taxable income | all three | VERIFIED (S4 Annex 3(a); Examples 5, 6) |
| Donation — Government / specified institutions | Deductible in full; unutilised balance carried forward from 2025-04-01 | 2025/26+ for carry-forward | VERIFIED (S4 Annex 3(b),(f); S2 §4) |
| Samurdhi shop contribution | Deductible (resident individual), from 2021-04-01 | all three | VERIFIED (S4 Annex 3(d), Example 4) |
| Film production / cinema | Capped at one-third of taxable income, carry-forward | all three | VERIFIED (S4 Annex 3(e)) — *not implemented in v1; flagged for manual entry* |

### 3.4 Exemptions relevant to individuals (selected)

VERIFIED from S4 Annex 2. Seeded as `EXEMPTION` rules and used by the "Why?" explanations; the engine applies those marked ⚙.

- ⚙ Capital gain ≤ Rs. 50,000 per realisation where total gains in the Y/A ≤ Rs. 600,000 (resident individual).
- ⚙ Gain on principal residence owned continuously 3 years and lived in for 2 of those 3.
- ⚙ Gains on shares quoted on a stock exchange licensed by the SEC of Sri Lanka.
- ⚙ Lottery winnings where the gross amount ≤ Rs. 500,000.
- ⚙ Interest on foreign-currency accounts approved by the Central Bank; Special Deposit Account interest.
- Government pension; retirement payments from approved provident funds / ETF investment income; compensation for personal injury or death; senior citizen life annuities (≥10 years); gem sales with 2.5% WHT; sovereign-bond interest in foreign currency.

---

## 4. Withholding: APIT and AIT/WHT

### 4.1 APIT (employment)

APIT Tax Table 01, Y/A 2025/2026 (S5) — monthly regular profits from primary employment, relief of Rs. 150,000/month already built in:

| Monthly profits from employment | Monthly APIT |
|---|---|
| ≤ 150,000 | nil |
| 150,001 – 233,333 | 6% × P − 9,000 |
| 233,334 – 275,000 | 18% × P − 37,000 |
| 275,001 – 316,667 | 24% × P − 53,500 |
| 316,668 – 358,333 | 30% × P − 72,500 |
| > 358,333 | 36% × P − 94,000 |

Status: VERIFIED. The table is algebraically the annual schedule ÷ 12, so the engine derives expected APIT from the year's bands and relief rather than storing a second copy. The app uses this only to **sanity-check** recorded APIT ("your APIT looks lower than expected"); the credit claimed is always the amount on the employee's T.10 certificate.

Employer obligations (context for the calendar): APIT remitted by the 15th of the following month; annual APIT statement by 30 April (S7).

### 4.2 AIT / WHT rates

| Payment | 2024/2025 | 2025/2026 → | Final? | Status / source |
|---|---|---|---|---|
| Interest / discount (resident) | 5% | 10% | No (credit) | 10%: VERIFIED (S1 §2.3, S3). 5%: VERIFIED_SECONDARY (S9) |
| Dividends from resident company | 15% | 15% | **Final** | VERIFIED (S4 Annex 4(j)) |
| Rent to a resident, aggregate > Rs. 100,000 per calendar month | 10% of full payment | 10% | No | VERIFIED (S3, S4 Annex 4(g)) |
| Service fees to a resident individual (non-employee), > Rs. 100,000 per calendar month, listed professions | 5% of full payment | 5% | No | VERIFIED (S3, S4 Annex 4(e)); list expanded from 2026-06-03 (S2 §10.3) |
| Lottery / betting / gambling winnings | 14% | 14% | Final | VERIFIED (S4 Annex 4(a)) |
| Royalty; natural-resource payment; premium | 14% | 14% | No | VERIFIED (S4 Annex 4(h),(i)) |
| Interest to non-resident | — | 10% | Final | VERIFIED (S4 Annex 4(c)) |
| Other payments to non-residents | 14% | 14% | Final | VERIFIED (S4 Annex 4(b)) |
| Gems sold at NGJA auction | 2.5% | 2.5% | Exempt thereafter | VERIFIED (S4 Annex 2(o), 4(d)) |

Interest self-declaration: a resident individual with no taxable income for the Y/A may give the bank a self-declaration so AIT is not deducted (effective 2025-04-01). A false declaration carries a penalty of up to Rs. 200,000 (S2 §10.2). VERIFIED.

---

## 5. Filing, payment, penalties

### 5.1 Who must file

- Every individual taxpayer files a return, with schedules and a Statement of Assets and Liabilities; e-filing is mandatory from Y/A 2023/2024 (senior citizens may file on paper from 2025/2026). VERIFIED (S4 §A.1, S2 §12).
- **Not required to file:** an individual whose only income is employment income fully subject to APIT, with no instalments or final payment due — also where interest income does not exceed Rs. 5,000 — unless the Commissioner-General has opened a file. Effective 2025-04-01. VERIFIED (S2 §12).
- TIN: registration is mandatory for individuals aged 18+ from 2024-01-01; penalty up to Rs. 50,000. VERIFIED_SECONDARY (S10). From 2026 a TIN certificate is required for bank accounts, vehicle and land registration, credit cards etc., effective once the Commissioner-General issues the verification procedure. VERIFIED (S2 §15).

### 5.2 Due dates

| Event | Y/A 2025/2026 | Y/A 2026/2027 | Source |
|---|---|---|---|
| 1st instalment | 2025-08-15 | 2026-08-15 | S4 §A.8, S7 |
| 2nd instalment | 2025-11-15 | 2026-11-15 | S4 §A.8, S7 |
| 3rd instalment | 2026-02-15 | 2027-02-15 ⚠ | S7 / pattern |
| 4th instalment | 2026-05-15 | 2027-05-15 ⚠ | S7 / pattern |
| Final payment | 2026-09-30 | 2027-09-30 ⚠ | S7 / pattern |
| Return of income | 2026-11-30 | 2027-11-30 ⚠ | S4 §A.7, S7 / pattern |

⚠ = statutory pattern; the IRD Tax Calendar 2027 was not published at verification. See U5. Y/A 2024/2025 dates follow the same pattern one year earlier (VERIFIED_SECONDARY).

**Instalment basis.** Up to Y/A 2025/2026 instalments were based on a Statement of Estimated Tax (SET) filed by 15 August. From Y/A 2026/2027 the SET is **discontinued**; each instalment is based on the income tax payable for the immediately preceding Y/A (S2 §11). VERIFIED. Procedure where there was no prior-year taxable income or lower income is expected: "will be published in due course" — U4.

### 5.3 Penalties and interest

VERIFIED from S4 §A.9 unless noted.

| Default | Consequence |
|---|---|
| Late filing of return | Greater of (i) 5% of tax owing + 1% per month or part, and (ii) Rs. 50,000 + Rs. 10,000 per month or part |
| Late instalment | 10% of the amount due but not paid |
| Late tax for a period / per notice of assessment | 20% of tax due but not paid |
| Interest | 1.5% per month or part of a month |
| False or misleading statement | Greater of Rs. 50,000 and the tax under-stated |
| Failure to file | Fine up to Rs. 1,000,000 and/or up to one year's imprisonment |
| Non-compliance after 30-day notice (2026 Act) | Fine up to Rs. 400,000 and/or up to six months (S2 §19) |

The app **displays** these as information. It does not compute penalties in v1: the amount depends on IRD's determination and on waivers (for example the interest waiver for years up to 2024/2025 where principal is settled by 2026-12-02, S2 §22).

### 5.4 Refunds and safe harbour

- Refund ≤ Rs. 180,000 claimed by a resident individual is processed within three months before audit (from Y/A 2025/2026); claims within 30 months of year-end. VERIFIED (S1 §4).
- Returns declaring ≥ 120% of the prior year's tax, fully paid, with an affidavit, are accepted without amended assessment (from 2025-04-01). VERIFIED (S2 §16).

---

## 6. Residence

- Resident if the individual resides in Sri Lanka, or is present for 183 days or more in aggregate in any 12-month period that commences or ends during the Y/A (IRA s.69). VERIFIED_SECONDARY (S11).
- From 2025-04-01: Investor Category Residence Visa holders are non-resident; an individual leaving to work abroad for at least one year under a contract with an unrelated foreign employer is non-resident for the contract period; non-citizen crew of Sri Lankan ships are taxed as residents only on that employment income. VERIFIED (S2 §8).

The app records the user's **self-declared** residency status per tax year. It does not determine residency.

---

## 7. Deductibility of expenses

This is the area with the most judgement. The app classifies; it does not decide.

| Classification | When the app applies it | Basis |
|---|---|---|
| `NON_DEDUCTIBLE` | Any expense linked to employment income; domestic or personal expenses | C2 (VERIFIED); IRA s.10 (VERIFIED_SECONDARY, S12) |
| `REQUIRES_REVIEW` (default) | Business/professional expenses until the user confirms they were incurred in producing that income | IRA s.11 main deduction test |
| `DEDUCTIBLE` | User-confirmed business expense, non-capital, linked to a business/professional/rental income source | s.11 |
| `PARTIALLY_DEDUCTIBLE` | User supplies a business-use percentage (mixed-use costs) | apportionment |
| `NON_DEDUCTIBLE` | Cash payments of Rs. 500,000 or more in a day / single transaction, other than by permitted methods | IRA s.10(2A): VERIFIED (S2 §2) |

Not modelled in v1 and stated as such in the UI: capital allowances (s.16), entertainment and other specific restrictions, thin capitalisation, loss carry-forward (six years; business losses against business or investment income, investment losses against investment income only — VERIFIED_SECONDARY, S12). A net business loss is floored at zero for the year and reported as an un-utilised loss requiring professional review.

Rental income: the 25% rent relief (§3.3) is applied. Whether actual repair/maintenance costs may be claimed *in addition* is not addressed in the primary sources read — U6. The engine applies the 25% relief only.

---

## 8. Open uncertainties (surfaced in the admin area)

| ID | Issue | What the engine does |
|---|---|---|
| **U1** | **15% cap mechanics.** The Guide's Annexure 7 shows "first Rs. 1,000,000 @ 6%, balance @ 15%" for foreign-currency income, while Examples 2, 3 and 6 tax it at a flat 15% when local income is also present. | One progressive schedule; local income occupies the lower bands first; foreign-currency income sits on top with each band's rate capped at 15%. This reproduces Annexure 7 (no local income) and all three examples. Reliefs are set against local income first, then foreign-currency income; under this stacking model that is never worse for the taxpayer (C7). Marked `REQUIRES_VERIFICATION`. |
| **U2** | No IRD tax chart or APIT tables published for Y/A 2026/2027. | 2025/2026 rates and relief carried forward on the wording of the 2025 Act; rule version flagged "carried forward — confirm on publication". |
| **U3** | CGT moved from 10% to 15% on 2026-06-03, inside Y/A 2026/2027. The Notice gives the date; transitional wording in the Act was not read. | Rate chosen by **realisation date** (two rule versions within one tax year). Flagged. |
| **U4** | Instalment amount for 2026/2027 where there was no prior-year liability — procedure not yet published. | Shows prior-year-based instalments when a prior-year calculation exists; otherwise shows the current-year estimate ÷ 4, labelled as an estimate. |
| **U5** | 2027 due dates not in a published calendar. | Seeded from the statutory pattern, flagged. |
| **U6** | Rental expenses in addition to the 25% relief. | Relief only. |
| **U7** | Employment income: treatment of employer EPF/ETF contributions and valuation of non-cash benefits were not read in a primary source. | User enters taxable benefits as shown on their T.10; employee EPF is recorded for information and **not** deducted. Flagged. |
| **U8** | "Senior citizen" (IRA s.195) age threshold not read in a primary source. | No senior-citizen-specific computation in v1. |
| **U9** | Y/A 2024/2025 treatment of service-export / foreign-currency income (exempt before 2025-04-01) rests on secondary reading of the 2025 notice ("exemptions … have been removed"). | Treated as exempt for 2024/2025 and flagged on any calculation that uses it. |

---

## 9. Regression fixtures from the IRD Guide

The six worked examples in S4 (pp. 39–49) are encoded as engine tests. Expected balances payable: Ex.1 Rs. 11,200 · Ex.2 Rs. 22,000 · Ex.3 Rs. 16,835,900 · Ex.4 Rs. 5,910,084 · Ex.5 Rs. 544,600 · Ex.6 Rs. 22,600.

---

## 10. Source register

| ID | Authority | Document | Type | Date | URL |
|---|---|---|---|---|---|
| S1 | IRD | Notice PN/IT/2025-01 — changes under Inland Revenue (Amendment) Act, No. 02 of 2025 | IRD_NOTICE | 2025-03-26 | https://www.ird.gov.lk/en/Lists/Latest%20News%20%20Notices/Attachments/666/PN_IT_2025-01_26032025_E.pdf |
| S2 | IRD | Notice SEC/PN/IT/2026/02 — changes under Inland Revenue (Amendment) Act, No. 11 of 2026 | IRD_NOTICE | 2026-06-08 | https://www.ird.gov.lk/en/Lists/Latest%20News%20%20Notices/Attachments/788/SEC_PN_IT_2026-02.pdf |
| S3 | IRD | Tax Chart 2025/2026 | GUIDELINE | — | https://www.ird.gov.lk/en/publications/SitePages/tax_chart_2526.aspx?menuid=1404 |
| S4 | IRD | Guide to fill the Return of Income — Individual, Y/A 2025/2026 (Asmt_IIT_004_E) | GUIDELINE | 2026 | https://www.ird.gov.lk/en/Downloads/IT_Individuals_Doc/Asmt_IIT_004_2025_2026_E.pdf |
| S5 | IRD | APIT Tax Table No. 01, 2025/2026 | GUIDELINE | 2025 | https://www.ird.gov.lk/en/publications/APIT_Tax_Tables/2025-2026/Table%20-%201/02.%20APIT_2526_Table_01_Text.pdf |
| S6 | IRD | Tax Chart 2024/2025 | GUIDELINE | — | https://www.ird.gov.lk/en/publications/SitePages/Tax_Chart_2425.aspx?menuid=140407 |
| S7 | IRD | Tax Calendar 2026 | GUIDELINE | 2026 | https://www.ird.gov.lk/en/publications/Tax%20Calendar_Documents/Tax_Calendar_2026_E.pdf |
| S8 | Parliament | Inland Revenue (Amendment) Act, No. 02 of 2025 | ACT | 2025-03-20 | https://documents.gov.lk/view/acts/2025/3/02-2025_E.pdf |
| S9 | KPMG Sri Lanka | Tax alerts on the 2025 Amendment Act and AIT procedures | OTHER | 2025 | https://kpmg.com/us/en/taxnewsflash/news/2025/04/sri-lanka-guidance-advance-income-tax-procedures.html |
| S10 | Press reports of IRD notice | Mandatory TIN registration from 2024-01-01 | OTHER | 2023-12 | https://www.adaderana.lk/news/96101/penalty-up-to-rs-50000-for-failing-to-obtain-tin- |
| S11 | taxadvisor.lk | Individual residency for tax purposes (IRA s.69) | OTHER | — | https://www.taxadvisor.lk/article/rr |
| S12 | Parliament | Inland Revenue Act, No. 24 of 2017 (principal enactment) | ACT | 2017-10-24 | https://www.documents.gov.lk/view/acts/2017/10/24-2017_E.pdf |
| S13 | KPMG Sri Lanka | Inland Revenue (Amendment) Act No. 11 of 2026 — Tax Flash | OTHER | 2026-06 | https://kpmg.com/us/en/taxnewsflash/news/2026/06/sri-lanka-tax-amendments-enacted.html |

S1, S2, S4 and S7 were read in full from the IRD PDFs; S3, S5 and S6 from the IRD web pages. S8 and S12 are cited as the governing enactments but were not read section by section — rules that rest on them alone are marked `VERIFIED_SECONDARY`.

---

## 11. Rule versioning model

```
TaxYear        code "2026/2027", startsOn, endsOn, status
TaxRuleSource  authority, title, url, documentType, publicationDate, contentHash, lastCheckedAt
TaxRule        stable identity: (taxYear, ruleType, key)       e.g. (2026/2027, CAPITAL_GAINS_RATE, "individual")
TaxRuleVersion version n, parameters (JSON, schema per ruleType), effectiveFrom, effectiveTo,
               status DRAFT | ACTIVE | SUPERSEDED | REQUIRES_VERIFICATION,
               verification VERIFIED | VERIFIED_SECONDARY | REQUIRES_VERIFICATION,
               source → TaxRuleSource, lastVerifiedAt, notes
```

- Resolution: `resolve(taxYear, ruleType, key, asOf)` returns the ACTIVE version whose `[effectiveFrom, effectiveTo]` contains `asOf`. `asOf` defaults to the last day of the tax year; date-sensitive rules (CGT) pass the transaction date. This is what lets Y/A 2026/2027 hold a 10% version to 2026-06-02 and a 15% version from 2026-06-03.
- Versions are immutable once ACTIVE. An edit creates version n+1 as DRAFT; activation supersedes the previous version and writes an audit record with before/after parameters.
- Every `TaxCalculation` stores a **snapshot** of the exact rule-version ids and parameters it used, plus full inputs and outputs. Historical calculations are re-displayed from the snapshot, never recomputed, so later rule changes cannot alter them.
- The engine is a pure function `compute(inputs, ruleSet) → result`; it never reads the database. Admin preview runs the same function against the draft rule set and predefined scenarios (including the six IRD examples) and shows the difference before activation.
