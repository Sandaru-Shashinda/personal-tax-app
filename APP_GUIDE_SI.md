# Ayakara — සම්පූර්ණ මාර්ගෝපදේශය (සිංහල)

> Sri Lanka හි පුද්ගලික income tax සඳහා වූ web app එකේ features, tax rules, නීති සහ sources සියල්ල, tax ගැන කිසිම දැනුමක් නැති කෙනෙකුට වුවත් තේරෙන ලෙස.

**අවසන් වරට rules verify කළ දිනය:** 2026-10-06
**අදාළ වන්නේ:** Individuals (පුද්ගලයන්) ට පමණි. Companies, partnerships, trusts මෙහි නැත.

> **වැදගත්:** මෙම app එක tax එක **estimate (ඇස්තමේන්තු)** කර records **organise** කරයි. එය IRD එකට return file කරන්නේ නැත, tax ගෙවන්නේ නැත, IRD සමඟ කිසිදු සම්බන්ධයක් නැත. මෙය legal හෝ tax advice එකක් නොවේ.

---

## පටුන

1. [මේ app එක මොකක්ද?](#1-මේ-app-එක-මොකක්ද)
2. [Tax ගැන මූලික දැනුම](#2-tax-ගැන-මූලික-දැනුම)
3. [Tax ගණනය වන හැටි — පියවරෙන් පියවර](#3-tax-ගණනය-වන-හැටි--පියවරෙන්-පියවර)
4. [Tax rates සහ personal relief](#4-tax-rates-සහ-personal-relief)
5. [Income වර්ග සහ ඒවාට tax වැටෙන හැටි](#5-income-වර්ග-සහ-ඒවාට-tax-වැටෙන-හැටි)
6. [Reliefs සහ qualifying payments (tax අඩු කරන දේ)](#6-reliefs-සහ-qualifying-payments-tax-අඩු-කරන-දේ)
7. [Exemptions (tax නැති income)](#7-exemptions-tax-නැති-income)
8. [Withholding — APIT, AIT, WHT](#8-withholding--apit-ait-wht)
9. [Expenses — deduct කළ හැකි සහ නොහැකි දේ](#9-expenses--deduct-කළ-හැකි-සහ-නොහැකි-දේ)
10. [Deadlines සහ instalments](#10-deadlines-සහ-instalments)
11. [Return file කළ යුත්තේ කවුද?](#11-return-file-කළ-යුත්තේ-කවුද)
12. [Penalties (දඩ) සහ interest](#12-penalties-දඩ-සහ-interest)
13. [Refunds](#13-refunds)
14. [Residency (නේවාසිකභාවය)](#14-residency-නේවාසිකභාවය)
15. [භාවිත කරන නීති, Acts සහ sources](#15-භාවිත-කරන-නීති-acts-සහ-sources)
16. [App එකේ සියලු features](#16-app-එකේ-සියලු-features)
17. [Security සහ privacy](#17-security-සහ-privacy)
18. [Admin සහ rule versioning](#18-admin-සහ-rule-versioning)
19. [Rules කොතරම් විශ්වාසදායකද? (verification)](#19-rules-කොතරම්-විශ්වාසදායකද-verification)
20. [App එක නොකරන දේ](#20-app-එක-නොකරන-දේ)
21. [Glossary — වචන මාලාව](#21-glossary--වචන-මාලාව)
22. [Disclaimer](#22-disclaimer)

---

## 1. මේ app එක මොකක්ද?

**Ayakara** යනු Sri Lanka හි පුද්ගලයෙකුට තම income tax කටයුතු පහසු කරගැනීමට ඇති web app එකකි. එයින් කළ හැකි දේ:

- ඔබේ **income** (ආදායම) සහ **expenses** (වියදම්) record කිරීම
- අදාළ වසරේ rules අනුව ඔබ ගෙවිය යුතු **tax එක estimate** කිරීම
- එම ගණන ආවේ **කොහොමද** කියා line එකෙන් line එක පැහැදිලි කිරීම ("Why?")
- දැනටමත් කපා ඇති tax (APIT, AIT) සහ ඔබ ගෙවූ payments **track** කිරීම
- Tax documents (T.10, bank statements, receipts) **ආරක්ෂිතව තබාගැනීම**
- **Deadlines** මතක් කිරීම
- IRD එකට return එක file කිරීමට **සූදානම් වීම**

App එක භාෂා තුනකින් ඇත: **English, සිංහල, தமிழ்**.

---

## 2. Tax ගැන මූලික දැනුම

Tax ගැන කිසිවක් නොදන්නේ නම් මෙම කොටස පළමුව කියවන්න.

### 2.1 Income tax කියන්නේ මොකක්ද?
ඔබ උපයන මුදලින් (salary, business, interest, rent ආදිය) රජයට ගෙවිය යුතු කොටසයි. Sri Lanka හි එය එකතු කරන්නේ **IRD (Inland Revenue Department — දේශීය ආදායම් දෙපාර්තමේන්තුව)** ය.

### 2.2 Year of assessment (Y/A) — තක්සේරු වර්ෂය
Tax ගණනය කරන්නේ calendar year එකට නොව, **1 April සිට ඊළඟ වසරේ 31 March දක්වා** කාලයටයි.

| Y/A | කාලය | App එකේ තත්ත්වය |
|---|---|---|
| 2024/2025 | 2024-04-01 → 2025-03-31 | Closed |
| 2025/2026 | 2025-04-01 → 2026-03-31 | Closed (return එක due: **2026-11-30**) |
| **2026/2027** | 2026-04-01 → 2027-03-31 | **Current (දැනට යන වසර)** |

### 2.3 TIN
**Taxpayer Identification Number** — IRD එක ඔබට දෙන අංකය. 2024-01-01 සිට වයස 18+ සෑම කෙනෙකුටම register වීම අනිවාර්යයි.

### 2.4 ප්‍රධාන සංකල්ප 6

| සංකල්පය | සරල තේරුම |
|---|---|
| **Assessable income** | Tax ගණනයට ගන්නා ඔබේ මුළු income එක |
| **Relief** | Tax නැතිව තබාගත හැකි කොටස. උදා: **personal relief** Rs. 1,800,000 — වසරකට මෙතෙක් income එකට tax නැත |
| **Taxable income** | Assessable income − reliefs. **Tax වැටෙන්නේ මේ කොටසට පමණි** |
| **Progressive rates** | Income වැඩි වන විට rate එකත් වැඩි වේ (6% → 18% → 24% → 30% → 36%) |
| **Withholding / Credit** | ඔබට මුදල් ලැබෙන්නට **පෙරම** කපා IRD එකට යවන tax (employer කපන APIT, bank කපන AIT). මෙය ඔබේ අවසන් tax එකෙන් **අඩු වේ** |
| **Balance payable** | මුළු tax − දැනටමත් ගෙවූ/කැපූ tax. ඔබ තව ගෙවිය යුතු ගණන (minus නම් ඔබ වැඩිපුර ගෙවා ඇත) |

### 2.5 Tax ගෙවන්නේ කොහොමද?
1. **Employees:** employer මාසිකව salary එකෙන් **APIT** කපා IRD එකට යවයි.
2. **Business / freelance / rent ආදිය ඇති අය:** වසරකට **quarterly instalments 4ක්** ගෙවයි, ඉතිරිය **final payment** ලෙස.
3. වසර අවසානයේ **return of income** එකක් IRD e-Services හරහා file කරයි.

---

## 3. Tax ගණනය වන හැටි — පියවරෙන් පියවර

App එකේ tax engine එක ([lib/tax/engine.ts](lib/tax/engine.ts)) IRD return form එකේ ව්‍යුහයම අනුගමනය කරයි.

```
පියවර 1  Income සියල්ල එකතු කරන්න
         Employment + Business + Investment + Other
         = ASSESSABLE INCOME

පියවර 2  Reliefs අඩු කරන්න
         − Personal relief, rent relief, solar relief

පියවර 3  Qualifying payments අඩු කරන්න
         − Donations ආදිය
         = TAXABLE INCOME

පියවර 4  Tax ගණනය කරන්න
           සාමාන්‍ය income         → progressive rates
         + Capital gains            → flat rate (10% / 15%)
         + Terminal benefits        → concessionary rates
         + Betting/liquor/tobacco   → special rate (45%)
         + Foreign-currency income  → progressive, උපරිම 15%
         = TOTAL TAX

පියවර 5  Credits අඩු කරන්න
         − APIT, AIT/WHT, foreign tax credit, CGT paid,
           instalments, final payment
         = BALANCE PAYABLE
```

### Example A — Salary පමණක් (Y/A 2026/2027)

මාසික salary Rs. 300,000 (වසරකට Rs. 3,600,000).

| පියවර | ගණනය | මුදල (Rs.) |
|---|---|---|
| Assessable income | 300,000 × 12 | 3,600,000 |
| Personal relief | | − 1,800,000 |
| **Taxable income** | | **1,800,000** |
| පළමු 1,000,000 @ 6% | | 60,000 |
| ඊළඟ 500,000 @ 18% | | 90,000 |
| ඊළඟ 300,000 @ 24% | | 72,000 |
| **Total tax** | | **222,000** |

මාසයකට Rs. 18,500. Employer මෙය APIT ලෙස හරියටම කපා ඇත්නම් balance payable = 0.

> **වැදගත්:** මුළු income එකටම 24% වැටෙන්නේ **නැත**. Band එකක් ඇතුළට වැටෙන කොටසට පමණක් ඒ band එකේ rate එක වැටේ.

මාසික salary Rs. 150,000 හෝ ඊට අඩු නම් (වසරකට Rs. 1,800,000) → tax **නැත**.

### Example B — Salary + bank interest (IRD Guide Example 1, Y/A 2025/2026)

| | Rs. |
|---|---|
| Salary (240,000 × 12) | 2,880,000 |
| Bank interest | 140,000 |
| **Assessable income** | **3,020,000** |
| Personal relief | − 1,800,000 |
| **Taxable income** | **1,220,000** |
| 1,000,000 @ 6% | 60,000 |
| 220,000 @ 18% | 39,600 |
| **Total tax** | **99,600** |
| APIT (employer කැපූ) | − 74,400 |
| AIT (bank කැපූ 10%) | − 14,000 |
| **Balance payable** | **11,200** |

### Example C — Freelancer, local + foreign clients

Local clients Rs. 2,400,000, foreign clients (foreign currency, bank හරහා) Rs. 3,000,000, business expenses Rs. 400,000.

| | Rs. |
|---|---|
| Local business income (2,400,000 − 400,000) | 2,000,000 |
| Foreign-currency income | 3,000,000 |
| Personal relief (local income එකෙන් පළමුව) | − 1,800,000 |
| Taxable local | 200,000 |
| Taxable foreign | 3,000,000 |
| Local: 200,000 @ 6% | 12,000 |
| Foreign: 800,000 @ 6% (6% band එකේ ඉතිරිය) | 48,000 |
| Foreign: 2,200,000 @ 15% (18%+ bands, 15% ට cap) | 330,000 |
| **Total tax** | **390,000** |

Foreign income එක local income එකට **උඩින්** bands වල තැබේ, නමුත් කිසිම band එකක rate එක 15% ඉක්මවන්නේ නැත.

---

## 4. Tax rates සහ personal relief

### 4.1 Personal relief

| Y/A | Personal relief |
|---|---|
| 2024/2025 | Rs. 1,200,000 (මාසයකට 100,000) |
| 2025/2026 | Rs. 1,800,000 (මාසයකට 150,000) |
| 2026/2027 | Rs. 1,800,000 |

- ලැබෙන්නේ **residents** ට සහ **non-resident citizens** (විදේශගත ශ්‍රී ලාංකික පුරවැසියන්) ට.
- Citizen නොවන non-resident කෙනෙකුට **නොලැබේ**.
- **Capital gains** වලින් අඩු කළ **නොහැක**.

### 4.2 Progressive rates (taxable income මත)

| Band | 2024/2025 | 2025/2026 සහ 2026/2027 |
|---|---|---|
| 1 | පළමු 500,000 @ **6%** | පළමු 1,000,000 @ **6%** |
| 2 | ඊළඟ 500,000 @ **12%** | ඊළඟ 500,000 @ **18%** |
| 3 | ඊළඟ 500,000 @ **18%** | ඊළඟ 500,000 @ **24%** |
| 4 | ඊළඟ 500,000 @ **24%** | ඊළඟ 500,000 @ **30%** |
| 5 | ඊළඟ 500,000 @ **30%** | ඉතිරිය @ **36%** |
| 6 | ඉතිරිය @ **36%** | — |

2026/2027 සඳහා IRD තවම tax chart එකක් publish කර නැත; 2025/2026 rates **carry forward** කර ඇත (19 වන කොටසේ U2 බලන්න).

### 4.3 Special rates

| Item | 2024/2025 | 2025/2026 | 2026/2027 |
|---|---|---|---|
| **Capital gains (CGT)** | 10% | 10% | 2026-06-02 දක්වා **10%**; 2026-06-03 සිට **15%** |
| Betting, gaming, liquor, tobacco business | 40% | 45% | 45% |
| Foreign-currency income (bank හරහා remit කළ) | Exempt | Progressive, උපරිම 15% | Progressive, උපරිම 15% |
| Terminal benefits | 0% / 6% / 12% | එසේම | එසේම |

---

## 5. Income වර්ග සහ ඒවාට tax වැටෙන හැටි

App එකේ income types 11ක් ඇත: `SALARY`, `FREELANCE`, `BUSINESS`, `PROFESSIONAL`, `RENTAL`, `INTEREST`, `DIVIDEND`, `INVESTMENT_OTHER`, `CAPITAL_GAIN`, `FOREIGN`, `OTHER`.

### 5.1 Employment income (Salary)
- **Cash basis:** වසර තුළ ඇත්තටම ලැබුණු මුදල.
- ඇතුළත් වන්නේ: basic salary, allowances, bonuses, overtime, taxable non-cash benefits (T.10 එකේ ඇති පරිදි).
- **Expenses deduct කළ නොහැක.** (Travel, clothes, laptop — කිසිවක් salary එකෙන් අඩු කළ නොහැක.)
- **Employee EPF** app එකේ record වන්නේ information එකක් ලෙස පමණි; tax එකෙන් අඩු **නොවේ**.
- Employer කපන **APIT** එක credit එකක් ලෙස ලැබේ.

### 5.2 Terminal benefits (සේවය අවසන් වීමේ ප්‍රතිලාභ)
Gratuity, commuted pension, approved compensation for loss of office, ETF payments. මේවාට වෙනම **concessionary rates**:

| කොටස | Rate |
|---|---|
| පළමු Rs. 10,000,000 | 0% |
| ඊළඟ Rs. 10,000,000 | 6% |
| ඉතිරිය | 12% |

උදා: gratuity Rs. 12,000,000 → පළමු 10M ට 0, ඉතිරි 2M @ 6% = **Rs. 120,000**.

### 5.3 Business / Freelance / Professional income
- **Net** අගයට tax: receipts − deductible business expenses.
- Expenses වැඩි වී **loss** එකක් ආවොත්: app එක එය zero ලෙස සලකා warning එකක් දෙයි. Loss එක වෙනත් income එකෙන් අඩු නොකරයි; carry-forward (වසර 6ක්) app එකේ ගණනය නොවේ — tax professional කෙනෙකුගෙන් අසන්න.

### 5.4 Rental income (කුලී ආදායම)
- මුළු rent එක assessable.
- **Rent relief:** rent එකෙන් **25%** ස්වයංක්‍රීයව අඩු වේ (residents ට). උදා: rent Rs. 3,000,000 → relief Rs. 750,000.
- Repair/maintenance වියදම් වෙනම deduct **නොකරයි** (25% relief එක පමණි).
- මාසයකට rent Rs. 100,000 ඉක්මවන්නේ නම් tenant 10% AIT කපයි (credit එකක්).

### 5.5 Interest (පොලී)
- **Gross interest** එක assessable income එකට එකතු වේ.
- Bank කපන **AIT** (2025/26 සිට 10%; 2024/25 දී 5%) **final නොවේ** — එය credit එකක්.
- **Self-declaration:** වසරට taxable income එකක් නැති resident කෙනෙකුට bank එකට self-declaration එකක් දී AIT නොකපා ගත හැක (2025-04-01 සිට). බොරු declaration එකකට දඩය Rs. 200,000 දක්වා.

### 5.6 Dividends (ලාභාංශ)
- Resident company එකකින් ලැබෙන dividend වලට **15% final WHT**.
- "Final" යනු: එය assessable income එකට **එකතු නොවේ**, නැවත tax **නැත**, credit එකක් ද **නැත**.
- Company එක WHT කපා නැත්නම්, ඔබ return එක හරහා 15% ගෙවිය යුතුය — app එක මෙය tax line එකක් ලෙස එකතු කරයි.

### 5.7 Capital gains (ප්‍රාග්ධන ලාභ)
ඉඩමක්, ගොඩනැගිල්ලක් වැනි investment asset එකක් විකුණා ලැබෙන ලාභය.

- Gain = disposal value − acquisition cost − allowable costs.
- **Flat rate** (progressive නොවේ): 10%, හෝ 2026-06-03 සිට 15%. Rate එක තීරණය වන්නේ **විකුණූ දිනය (realisation date)** අනුව.
- උදා: Rs. 2,000,000 gain → 2026-05-20 දී විකුණුවොත් Rs. 200,000; 2026-07-10 දී විකුණුවොත් Rs. 300,000.
- Personal relief මෙයින් අඩු කළ **නොහැක**.
- **Loss** එකක් නම්: app එක offset නොකරයි; warning එකක් දෙයි.
- Exemptions සඳහා 7 වන කොටස බලන්න.
- **Motor vehicle** (trading නොවන) විකිණීමේ gain එක income ලෙස නොසැලකේ (2024-04-01 සිට).

### 5.8 Foreign-currency income
Service exports සහ foreign-source income, **foreign currency වලින් ලැබී bank එකක් හරහා** Sri Lanka ට remit කළ විට:

- 2024/2025: **exempt**.
- 2025/2026 සිට: progressive rates, නමුත් **උපරිම 15%**.
- App එකේ income entry එකේ "foreign source" සහ "remitted via bank" tick කළ විට මෙය apply වේ.
- Original currency amount, exchange rate, rate source ඔබම enter කළ යුතුය (app එක auto convert නොකරයි).

### 5.9 Foreign tax credit
විදේශ රටක tax ගෙවා ඇත්නම් එය credit එකක් ලෙස ලැබේ — නමුත් **ඒ foreign income එක මත Sri Lankan tax එකට සීමා** වේ. වැඩිපුර ගෙවූ කොටස refund නොවේ, වෙනත් tax එකකින් අඩු කළ නොහැක.

### 5.10 Life insurance
Death, maturity හෝ surrender මත ලැබෙන life-insurance proceeds income ලෙස නොසැලකේ (2025-04-01 සිට).

---

## 6. Reliefs සහ qualifying payments (tax අඩු කරන දේ)

| Item | Rule | ලැබෙන්නේ |
|---|---|---|
| **Personal relief** | Rs. 1,800,000 (2025/26 සිට) | Residents + non-resident citizens |
| **Rent relief** | Rental income එකෙන් 25% | Residents |
| **Solar panel relief** | වසරකට උපරිම Rs. 600,000 (ඔබේ premises වල සවි කළ, national grid එකට connect කළ) | Residents |
| **Charity donation** (approved charity) | මේ තුනෙන් **අඩුම** අගය: (1) දුන් මුදල, (2) Rs. 75,000, (3) taxable income එකෙන් 1/3 | සියල්ලන්ට |
| **Government donation** (රජයට / specified institutions) | **සම්පූර්ණයෙන්ම** deductible; 2025-04-01 සිට ඉතිරිය carry-forward | සියල්ලන්ට |
| **Samurdhi shop contribution** | Samurdhi ප්‍රතිලාභී පවුලක කාන්තාවකට shop එකක් පිහිටුවීමට දුන් මුදල, සම්පූර්ණයෙන් deductible | Residents |

සටහන්:
- Reliefs සහ qualifying payments අඩු වන්නේ **සාමාන්‍ය income** එකෙන් පමණි — capital gains හෝ terminal benefits වලින් නොවේ.
- Deductions income එකට වඩා වැඩි නම් ඉතිරියෙන් ප්‍රයෝජනයක් නැත (app එක මෙය දන්වයි).
- Local income සහ foreign-currency income දෙකම ඇත්නම්, reliefs **local income එකෙන් පළමුව** අඩු වේ (taxpayer ට වාසිදායක ක්‍රමය).
- **Film industry** qualifying payments app එකේ **නැත**.

---

## 7. Exemptions (tax නැති income)

### App එක ස්වයංක්‍රීයව apply කරන

| Exemption | කොන්දේසිය |
|---|---|
| **Small capital gains** | එක් gain එකක් ≤ Rs. 50,000 **සහ** වසරේ total gains ≤ Rs. 600,000 (resident) |
| **Principal residence** | ඔබේ ප්‍රධාන නිවස — වසර 3ක් අඛණ්ඩව owned, ඒ 3න් 2ක් එහි ජීවත් වූ |
| **Listed shares** | SEC licence ඇති stock exchange එකක (CSE) quoted shares වල gains |
| **Lottery winnings** | Gross amount ≤ Rs. 500,000 |
| **Foreign-currency account interest** | Central Bank අනුමත foreign-currency accounts වල interest; Special Deposit Account interest |

### App එක information ලෙස පමණක් දන්නා (ඔබම "exempt" ලෙස mark කළ යුතු)
Government pension, approved provident fund retirement payments, personal injury/death compensation, senior citizen life annuities (වසර 10+), gem sales (2.5% WHT සමඟ), foreign-currency sovereign bond interest.

---

## 8. Withholding — APIT, AIT, WHT

**Withholding** යනු ඔබට මුදල් ගෙවන්නා (employer, bank, tenant) ගෙවීමට පෙරම tax කොටසක් කපා IRD එකට යැවීමයි.

- **Final නොවන** withholding → ඔබේ tax එකෙන් අඩු වන **credit** එකක්.
- **Final** withholding → එතැනින් ඉවරයි; income එක නැවත ගණනයට නොගැනේ, credit එකක් ද නැත.

### 8.1 APIT (Advance Personal Income Tax)
Employer salary එකෙන් මාසිකව කපන tax. IRD APIT Table 01 (2025/2026):

| මාසික employment income (P) | මාසික APIT |
|---|---|
| ≤ 150,000 | නැත |
| 150,001 – 233,333 | 6% × P − 9,000 |
| 233,334 – 275,000 | 18% × P − 37,000 |
| 275,001 – 316,667 | 24% × P − 53,500 |
| 316,668 – 358,333 | 30% × P − 72,500 |
| > 358,333 | 36% × P − 94,000 |

උදා: P = 300,000 → 24% × 300,000 − 53,500 = **Rs. 18,500**.

App එක මෙය භාවිත කරන්නේ ඔබ record කළ APIT එක "අපේක්ෂිත ගණනට වඩා අඩුද" යන්න **sanity-check** කිරීමට පමණි. Credit ලෙස ගන්නේ සැමවිටම ඔබේ **T.10 certificate** එකේ ඇති ගණනයි.

### 8.2 AIT / WHT rates

| ගෙවීම | 2024/2025 | 2025/2026 සිට | Final ද? |
|---|---|---|---|
| Interest (resident) | 5% | 10% | නැත (credit) |
| Dividends (resident company) | 15% | 15% | **Final** |
| Rent (මාසයකට > Rs. 100,000) | 10% | 10% | නැත |
| Service fees — resident individual, listed professions (මාසයකට > Rs. 100,000) | 5% | 5% | නැත |
| Lottery / betting / gambling winnings | 14% | 14% | **Final** |
| Royalty, natural-resource payment, premium | 14% | 14% | නැත |
| Interest to non-resident | — | 10% | Final |
| Other payments to non-residents | 14% | 14% | Final |
| Gems (NGJA auction) | 2.5% | 2.5% | ඉන්පසු exempt |

Exempt/excluded income එකක tax කපා ඇත්නම් app එක එය credit ලෙස නොගෙන "refund එකක් අදාළද බලන්න" යැයි warning එකක් දෙයි.

---

## 9. Expenses — deduct කළ හැකි සහ නොහැකි දේ

ඔබ expense එකක් enter කළ විට app එක ([lib/tax/expense-classifier.ts](lib/tax/expense-classifier.ts)) එය මේ හතරෙන් එකකට **classify** කර හේතුවත් පෙන්වයි. App එක classify කරයි; අවසන් තීරණය ඔබේ/IRD එකේ ය.

| Classification | කවදාද |
|---|---|
| ❌ `NON_DEDUCTIBLE` | Income source එකකට link කර නැති (personal/domestic) expense |
| ❌ `NON_DEDUCTIBLE` | **Salary** එකට link කළ expense |
| ❌ `NON_DEDUCTIBLE` | **Rental** income එකට link කළ expense (25% relief එක ඒ වෙනුවට ලැබේ) |
| ❌ `NON_DEDUCTIBLE` | **Capital** nature එකේ expense (උදා: machine එකක් මිලදී ගැනීම) — capital allowances app එකේ ගණනය නොවේ |
| ❌ `NON_DEDUCTIBLE` | **Cash** වලින් ගෙවූ **Rs. 500,000 හෝ ඊට වැඩි** payment (IRA s.10(2A)). Cheque, bank transfer, card ට බලපෑමක් නැත |
| ⏳ `REQUIRES_REVIEW` | Business expense එකක්, නමුත් "මෙය business income උපයීමට දැරූවක්" යැයි ඔබ තවම **confirm කර නැත** (default) |
| ◐ `PARTIALLY_DEDUCTIBLE` | Mixed-use — ඔබ business-use % එකක් දී ඇත (උදා: phone bill එකෙන් 60%) |
| ✅ `DEDUCTIBLE` | Business / freelance / professional income එකකට link කළ, ඔබ confirm කළ, capital නොවන, large cash නොවන expense |

**සරල නීතිය:** expenses deduct කළ හැක්කේ **business, freelance, professional** income වලින් පමණි.

---

## 10. Deadlines සහ instalments

### 10.1 Due dates

| Event | Y/A 2025/2026 | Y/A 2026/2027 |
|---|---|---|
| 1st instalment | 2025-08-15 | 2026-08-15 |
| 2nd instalment | 2025-11-15 | 2026-11-15 |
| 3rd instalment | 2026-02-15 | 2027-02-15 ⚠ |
| 4th instalment | 2026-05-15 | 2027-05-15 ⚠ |
| Final payment | 2026-09-30 | 2027-09-30 ⚠ |
| **Return of income** | **2026-11-30** | 2027-11-30 ⚠ |

⚠ = IRD Tax Calendar 2027 තවම publish වී නැත; statutory pattern එකෙන් ගත් dates (verify කළ යුතුය).

Pattern එක: instalments **15 Aug, 15 Nov, 15 Feb, 15 May**; final payment **30 Sep**; return **30 Nov**.

### 10.2 Instalment එකක ගණන තීරණය වන්නේ කොහොමද?

| Y/A | Basis |
|---|---|
| 2025/2026 දක්වා | **Statement of Estimated Tax (SET)** — ඔබම ඇස්තමේන්තු කර 15 August ට පෙර file කළ ගණන |
| 2026/2027 සිට | SET **අහෝසි කර ඇත**. **පෙර වසරේ income tax payable** මත |

පෙර වසරේ calculation එකක් app එකේ නැත්නම්, app එක current-year estimate ÷ 4 පෙන්වා "estimate" ලෙස label කරයි.

### 10.3 Employer deadlines (context සඳහා)
APIT remit කිරීම: ඊළඟ මාසයේ 15 වනදාට පෙර. Annual APIT statement: 30 April.

---

## 11. Return file කළ යුත්තේ කවුද?

- සෑම individual taxpayer කෙනෙක්ම return එක, schedules සහ **Statement of Assets and Liabilities** සමඟ file කළ යුතුය.
- **E-filing අනිවාර්යයි** (Y/A 2023/2024 සිට). Senior citizens ට 2025/2026 සිට paper වලින් file කළ හැක.

**File කිරීම අවශ්‍ය නැති අය** (2025-04-01 සිට):
- එකම income එක **APIT සම්පූර්ණයෙන් කපා ඇති employment income** වන, සහ
- instalments හෝ final payment due නැති අය,
- interest income එකක් තිබුණත් එය **Rs. 5,000 නොඉක්මවන්නේ** නම්,
- Commissioner-General ඔබ වෙනුවෙන් file එකක් open කර නැත්නම්.

**TIN:** 2026 Act එක අනුව bank accounts, vehicle/land registration, credit cards ආදියට TIN certificate එකක් අවශ්‍ය වේ (Commissioner-General verification procedure එක නිකුත් කළ පසු බලාත්මක වේ).

---

## 12. Penalties (දඩ) සහ interest

App එක මේවා **information ලෙස පෙන්වයි පමණි**; ගණනය **නොකරයි** (IRD තීරණ සහ waivers මත රඳා පවතින නිසා).

| වරද | ප්‍රතිඵලය |
|---|---|
| Return එක ප්‍රමාද වීම | මේ දෙකෙන් **වැඩි** අගය: (i) tax owing එකෙන් 5% + මාසයකට 1%, (ii) Rs. 50,000 + මාසයකට Rs. 10,000 |
| Instalment ප්‍රමාද වීම | නොගෙවූ ගණනින් **10%** |
| Tax ප්‍රමාද වීම (period / notice of assessment) | නොගෙවූ tax එකෙන් **20%** |
| Interest | මාසයකට (හෝ මාසයක කොටසකට) **1.5%** |
| False / misleading statement | Rs. 50,000 හෝ අඩුවෙන් පෙන්වූ tax එක — වැඩි අගය |
| Return file නොකිරීම | Rs. 1,000,000 දක්වා දඩ සහ/හෝ වසරක් දක්වා සිර දඬුවම |
| 30-day notice එකකට පසුත් non-compliance (2026 Act) | Rs. 400,000 දක්වා දඩ සහ/හෝ මාස 6ක් දක්වා |
| TIN ලබා නොගැනීම | Rs. 50,000 දක්වා |
| Interest self-declaration බොරු කිරීම | Rs. 200,000 දක්වා |

**Interest waiver:** Y/A 2024/2025 දක්වා වසර සඳහා principal එක 2026-12-02 ට පෙර settle කළහොත් interest waive වේ (2026 Act).

---

## 13. Refunds

- ඔබ වැඩිපුර tax ගෙවා/කපා ඇත්නම් app එක එය **minus balance** එකක් ලෙස පෙන්වයි. Refund එක ලබාගත හැක්කේ **IRD එකෙන්, return එක හරහා** පමණි.
- Resident individual කෙනෙකුගේ **Rs. 180,000 නොඉක්මවන** refund claim එකක් audit එකට පෙර මාස 3ක් ඇතුළත process වේ (Y/A 2025/2026 සිට).
- Claim කළ යුත්තේ වසර අවසානයේ සිට මාස 30ක් ඇතුළතය.
- **Safe harbour:** පෙර වසරේ tax එකෙන් **120% හෝ ඊට වැඩි** tax එකක් declare කර, සම්පූර්ණයෙන් ගෙවා, affidavit එකක් දුන් return එකක් amended assessment එකකින් තොරව පිළිගැනේ (2025-04-01 සිට).

---

## 14. Residency (නේවාසිකභාවය)

| Status | Tax වැටෙන්නේ |
|---|---|
| `RESIDENT` | **Worldwide income** (ලෝකයේ ඕනෑම තැනක උපයන) |
| `NON_RESIDENT_CITIZEN` | Sri Lanka-source income පමණි; personal relief **ලැබේ** |
| `NON_RESIDENT` | Sri Lanka-source income පමණි; personal relief **නොලැබේ** |

**Resident වන්නේ:** Sri Lanka හි පදිංචි නම්, හෝ Y/A එකේ ආරම්භ වන/අවසන් වන ඕනෑම මාස 12ක කාලයක් තුළ **දින 183ක් හෝ ඊට වැඩි** කාලයක් Sri Lanka හි සිටියේ නම්.

2025-04-01 සිට:
- Investor Category Residence Visa holders → non-resident.
- Unrelated foreign employer කෙනෙකු සමඟ contract එකක් යටතේ අවම වසරක් විදේශයේ වැඩට යන අය → contract කාලයට non-resident.

App එක residency **තීරණය නොකරයි** — ඔබ වසරකට වරක් **self-declare** කළ status එක භාවිත කරයි. Non-resident calculations සරල කර ඇත (tax treaty relief නැත).

---

## 15. භාවිත කරන නීති, Acts සහ sources

### 15.1 Acts (පාර්ලිමේන්තු පනත්)

| Act | කරන දේ |
|---|---|
| **Inland Revenue Act, No. 24 of 2017** (IRA) | ප්‍රධාන නීතිය (principal enactment). Income tax පිළිබඳ සියල්ල මෙහි පදනමයි |
| Act No. 45 of 2022 / No. 04 of 2023 | Y/A 2024/2025 සඳහා බලපැවැත්වූ amendments |
| **Inland Revenue (Amendment) Act, No. 02 of 2025** (2025-03-20) | Personal relief 1.2M → 1.8M; නව tax bands; interest AIT 5% → 10%; foreign-currency income 15% cap; filing exemption; life insurance; residency changes |
| **Inland Revenue (Amendment) Act, No. 11 of 2026** (2026-06-03) | CGT 10% → 15%; SET අහෝසි කිරීම; cash payment Rs. 500,000 limit; TIN certificate requirements; නව penalties; interest waiver |

App එක යොමු කරන IRA sections: **s.10** (deduct කළ නොහැකි දේ), **s.10(2A)** (cash payment limit), **s.11** (main deduction test), **s.16** (capital allowances — model කර නැත), **s.52A** (life insurance), **s.69** (residency), **s.195** (senior citizen — model කර නැත).

### 15.2 Bills
App එකේ database එකේ source type එකක් ලෙස `BILL` ඇතත්, **කිසිදු Bill එකක් (තවම සම්මත නොවූ පනත් කෙටුම්පතක්) rule එකක source ලෙස භාවිත කර නැත.** සියලු rules සම්මත වූ Acts සහ IRD documents මත පදනම් වේ.

### 15.3 Source register

| ID | Authority | Document | කියවූ ආකාරය |
|---|---|---|---|
| S1 | IRD | Notice PN/IT/2025-01 — 2025 Amendment Act changes | සම්පූර්ණයෙන් |
| S2 | IRD | Notice SEC/PN/IT/2026/02 — 2026 Amendment Act changes | සම්පූර්ණයෙන් |
| S3 | IRD | Tax Chart 2025/2026 | Web page |
| S4 | IRD | **Guide to fill the Return of Income — Individual, Y/A 2025/2026** (Asmt_IIT_004_E) — ප්‍රධාන source එක | සම්පූර්ණයෙන් |
| S5 | IRD | APIT Tax Table No. 01, 2025/2026 | Web page |
| S6 | IRD | Tax Chart 2024/2025 | Web page |
| S7 | IRD | Tax Calendar 2026 | සම්පූර්ණයෙන් |
| S8 | Parliament | Inland Revenue (Amendment) Act, No. 02 of 2025 | Section by section **කියවා නැත** |
| S9 | KPMG Sri Lanka | AIT procedures tax alert | Secondary |
| S10 | Press reports | Mandatory TIN registration | Secondary |
| S11 | taxadvisor.lk | Residency (IRA s.69) | Secondary |
| S12 | Parliament | Inland Revenue Act, No. 24 of 2017 | Section by section **කියවා නැත** |
| S13 | KPMG Sri Lanka | 2026 Amendment Act tax flash | Secondary |

URLs සම්පූර්ණ ලැයිස්තුව: [TAX_RULES.md](TAX_RULES.md) §10.

---

## 16. App එකේ සියලු features

### 16.1 Public pages (login අවශ්‍ය නැත)

| Page | කරන දේ |
|---|---|
| Home (`/`) | App එක ගැන හැඳින්වීම |
| **Tax calculator** (`/tax-calculator`) | Account එකක් නැතිව ඉක්මන් tax estimate එකක් |
| Sri Lanka income tax (`/sri-lanka-income-tax`) | Income tax ගැන පැහැදිලි කිරීම, rate tables |
| Tax guide (`/sri-lanka-tax-guide`) | මාර්ගෝපදේශය |
| Tax deadlines (`/tax-deadlines`) | Due dates |
| About (`/about`) | App එක ගැන |

සෑම public page එකක්ම භාෂා තුනෙන්ම ඇත (උදා: `/si/tax-calculator`, `/ta/tax-calculator`).

### 16.2 Account සහ sign-in
- **Register**, **login**, **email verification**, **forgot / reset password**
- **Two-factor authentication (2FA):** authenticator app එකක් (TOTP) + QR code + recovery codes
- **Demo account** එකක් ("Kasun Perera" — කල්පිත) sign-in page එකෙන් බැලිය හැක
- **Onboarding wizard:** පළමු වරට — residency status, employment status (`EMPLOYED`, `SELF_EMPLOYED`, `BOTH`, `RETIRED`, `NOT_EMPLOYED`), ඔබට ලැබෙන income types

### 16.3 Dashboard
- වසරේ tax estimate එකේ සාරාංශය (income, tax, credits, balance payable)
- **Monthly chart** සහ income share chart
- **Tax health card** (16.11 බලන්න)
- **Insights:** ඔබේ සංඛ්‍යා ගැන කරුණු — උදා: "ඔබේ effective tax rate එක ආසන්න වශයෙන් X%", "source එකේ කැපූ tax එක ඔබේ liability එකෙන් Y%", "interest records N කට tax කපා නැත". මේවා කරුණු පමණි; උපදෙස් නොවේ.
- ළඟම එන deadline එක

### 16.4 Income
- **Income sources** (employer, client base, property, bank account) සාදා ඒවා යටතේ entries එකතු කිරීම
- Entry period: `MONTHLY`, `ANNUAL`, `ONE_OFF`
- **Salary:** basic, allowances, bonuses, overtime, benefits, terminal benefits, EPF (information), APIT
- **Business:** client name, invoice number, service export ද, special-rate business ද
- **Rental:** property name, tenant, months
- **Investment:** interest / dividend / other; exempt ද සහ හේතුව
- **Capital gain:** asset name, acquired/disposed dates, cost, disposal value, allowable costs, exemption type, tax paid
- **Foreign currency:** currency, original amount, exchange rate, rate source, rate date, foreign source ද, bank හරහා remit කළාද, foreign tax paid
- Filters සහ search

### 16.5 Expenses
- Date, amount, category, description, payment method (`CASH`, `CARD`, `BANK_TRANSFER`, `CHEQUE`, `OTHER`)
- Income source එකකට link කිරීම, capital ද, business purpose confirm කිරීම, business-use %
- **ස්වයංක්‍රීය deductibility classification** + හේතුව (9 වන කොටස)
- **Qualifying payments** (charity, government donation, solar panel, Samurdhi shop) record කිරීම
- "Requires review" expenses filter කිරීම

### 16.6 Tax (calculation)
- සම්පූර්ණ **tax statement** එක: income → excluded income → reliefs → qualifying payments → taxable income → tax lines → credits → balance payable
- **"Why?"** — සෑම line එකකටම: සරල භාෂාවෙන් හේතුව, අදාළ rule එක, එහි tax year, source document, last verified date
- **Effective rate** (මුළු tax ÷ assessable income) සහ **marginal rate** (ඊළඟ රුපියලට වැටෙන rate)
- **Warnings:** උදා: business loss, capital loss offset නොකළ බව, verify නොකළ rule එකක් භාවිත වූ බව, foreign tax credit සීමා වූ බව
- **Rate tables** සහ **estimator**
- **Recalculate** button
- සෑම calculation එකක්ම **snapshot** එකක් ලෙස save වේ (inputs, result, භාවිත කළ rule versions). පසුව rules වෙනස් වුවත් පැරණි calculations **වෙනස් නොවේ**.
- Tax ගණනය වන්නේ **server එකේ පමණි**; browser එකේ නොවේ.

### 16.7 Return preparation (`/tax/return`)
IRD එකට file කිරීමට පෙර ඔබේ දත්ත review කිරීමේ පියවර 8ක checklist එකක්:

1. Review taxpayer details
2. Review income
3. Review deductions
4. Review reliefs
5. Review tax calculation
6. Review payments
7. Final validation
8. Generate summary and export

- **Issues** පෙන්වයි: *blockers* (TIN නැත, income නැත) සහ *warnings* (T.10 නැත, review නොකළ expenses ආදිය)
- Filing status: `NOT_STARTED` → `IN_PROGRESS` → `READY_TO_FILE` → `FILED_BY_USER`
- ඔබ IRD e-Services හරහා **ඔබම** file කළ පසු, filed date සහ acknowledgement number එක මෙහි record කළ හැක. (Return එකක් file කළ හැක්කේ වසර 31 March දිනෙන් අවසන් වූ පසුව පමණි.)

### 16.8 Payments
- Payment types: `INSTALMENT` (1–4), `FINAL_PAYMENT`, `CAPITAL_GAINS_TAX`, `APIT`, `WITHHOLDING`, `OTHER`
- Date, amount, reference, bank, notes
- **Instalment schedule** (due vs paid) සහ overdue instalments
- මෙහි record කරන්නේ income entry එකක withholding ලෙස දැනටමත් ඇතුළත් **නොවූ** payments

### 16.9 Documents
- Categories: `PAYSLIP`, `TAX_CERTIFICATE`, `APIT_DOCUMENT`, `BANK_STATEMENT`, `RECEIPT`, `INVOICE`, `RENTAL_DOCUMENT`, `INVESTMENT_STATEMENT`, `TAX_RETURN`, `PAYMENT_PROOF`, `OTHER`
- Income source / income entry / expense / payment එකකට link කළ හැක
- **10 MB** limit; file type එක content එකෙන් හඳුනාගනී; owner ට පමණක් බැලිය හැක
- Tax certificates (T.10, AIT/WHT, dividend WHT) — issuer, certificate number, gross amount, tax deducted

### 16.10 Reports
- **CSV export:** income, expenses, payments, tax summary
- **PDF:** Annual tax summary (නම, TIN, residency, සම්පූර්ණ statement, rates, භාවිත කළ rules සහ sources, disclaimer)
- PDF එක ඔබේම working paper එකකි — IRD form එකක් **නොවේ**. PDF එක English අකුරින් පමණි.
- **Print** button

### 16.11 Tax health
Record-keeping checklist එකක් — **legal/compliance score එකක් නොවේ.** Score = pass වූ checks වල weighted %.

| Check | Weight |
|---|---|
| Income records සම්පූර්ණද (onboarding හි කී සියලු types record කර ඇත්ද) | 25 |
| Overdue instalments නැත්ද | 20 |
| Salary එකට APIT record කර ඇත්ද | 15 |
| TIN enter කර ඇත්ද | 10 |
| Employer tax certificate (T.10) upload කර ඇත්ද | 10 |
| Email verify කර ඇත්ද | 5 |
| Interest / AIT certificate upload කර ඇත්ද | 5 |
| Rental records upload කර ඇත්ද | 5 |
| Review බලාපොරොත්තු expenses නැත්ද | 5 |

(අදාළ income type එක ඇත්නම් පමණක් ඒ check එක පෙන්වයි.)

### 16.12 Calendar සහ reminders
- සියලු deadlines එක තැනක
- Reminders: deadline එකට දින **30, 14, 7, 1** කට පෙර
- Channels: **in-app notifications** සහ **email** (email verified නම්)
- Notification types: deadline approaching, payment due, missing document, calculation changed, new tax year, tax rule updated, security
- සීමාව: reminders raise වන්නේ ඔබ app එක **open කළ විට** ය (scheduled job එකක් තවම නැත), සහ email ඇත්තටම යැවෙන්නේ නැත (20 වන කොටස)

### 16.13 Settings
- Profile (නම ආදිය), TIN, NIC/passport (encrypt කර; masked ලෙස පමණක් පෙන්වයි)
- Residency (වසරින් වසර වෙනස් කළ හැක), employment status, income types
- Reminder preferences (in-app / email)
- 2FA enable/disable, password change
- **Language** (English / සිංහල / தமிழ்), **theme** (light / dark)
- **Account data export** (ඔබේ සියලු දත්ත download)
- **Account delete**

### 16.14 වෙනත්
- **Global search** — records හරහා
- **Tax year switcher** — වසර අතර මාරු වීම
- **Mobile-friendly** — phone වල bottom navigation
- සෑම තැනකම **disclaimer** එක

---

## 17. Security සහ privacy

| Area | කරන දේ |
|---|---|
| Passwords | **Argon2id** hashing |
| Sessions | Random 256-bit tokens; database එකේ SHA-256 hash එක පමණි; `HttpOnly`, `SameSite=Lax` cookies |
| 2FA | TOTP + recovery codes |
| Encryption | **NIC** සහ **TOTP secrets** AES-256-GCM වලින් encrypt |
| Data isolation | සෑම query එකක්ම signed-in user ගේ id එකෙන් scope වේ — වෙනත් user කෙනෙකුගේ records බැලීම, වෙනස් කිරීම, delete කිරීම කළ නොහැක (tests වලින් තහවුරු කර ඇත) |
| Rate limiting | Sign-in, registration, password reset, 2FA, uploads, public calculator |
| Account lockout | නැවත නැවත fail වුවහොත් මිනිත්තු 15ක් lock |
| Privacy | Sign-in / password reset වලදී email එකක් register වී ඇත්ද යන්න හෙළි නොකරයි |
| Uploads | Web root එකෙන් පිටත, opaque key එකක් යටතේ; `nosniff` + restrictive CSP |
| CSRF | Origin checks |
| CSV | Formula injection neutralise කරයි |
| Audit log | Sign-ins, record changes, exports, සෑම tax-rule change එකක්ම (secrets redact කර) |

**දන්නා gaps** (public launch එකට පෙර විසඳිය යුතු): CSP එක inline scripts ඉඩ දෙයි; uploads virus scan නොකරයි; rate limits edge එකේ නොව database එකේ; independent security review එකක් කර නැත.

---

## 18. Admin සහ rule versioning

Tax rules code එකේ hard-code කර **නැත** — ඒවා database එකේ **versions** ලෙස ඇත. ඒ නිසා නීතිය වෙනස් වූ විට code වෙනස් නොකර rule එක update කළ හැක.

### ව්‍යුහය
- **TaxYear** — උදා: "2026/2027"
- **TaxRuleSource** — rule එක ආ document එක (Act, IRD notice ආදිය)
- **TaxRule** — (tax year, rule type, key) — උදා: (2026/2027, `CAPITAL_GAINS_RATE`, individual)
- **TaxRuleVersion** — parameters, effective from/to, status (`DRAFT` / `ACTIVE` / `SUPERSEDED`), verification, source

Rule types 18: `PERSONAL_RELIEF`, `TAX_BANDS`, `CAPITAL_GAINS_RATE`, `CAPITAL_GAINS_EXEMPTION`, `FOREIGN_INCOME_CAP`, `SPECIAL_RATE`, `TERMINAL_BENEFIT_BANDS`, `RENT_RELIEF`, `SOLAR_RELIEF`, `CHARITY_DONATION`, `GOVERNMENT_DONATION`, `WITHHOLDING_RATE`, `DIVIDEND_TREATMENT`, `EXPENSE_DEDUCTIBILITY`, `INSTALMENT_BASIS`, `FILING_REQUIREMENT`, `PENALTY_INFO`, `EXEMPTION`.

### Admin workflow (`/admin`)
1. Rule එකක **නව version එකක් draft** කිරීම
2. Fixed **scenarios 8ක්** මත run කර **old vs new result** සසඳා බැලීම (උදා: "Employee, Rs. 300,000 a month", "Freelancer with local and foreign-currency clients", "Landlord", IRD examples)
3. **Activate** කිරීම — පැරණි version එක `SUPERSEDED` වේ; before/after audit log එකට යයි

### වැදගත් ගුණාංග
- Active version එකක් **වෙනස් කළ නොහැක** (immutable) — වෙනසක් නව version එකකි.
- **Mid-year changes:** එකම වසර තුළ versions දෙකක් තිබිය හැක. Y/A 2026/2027 හි CGT: 10% (2026-06-02 දක්වා) සහ 15% (2026-06-03 සිට) — transaction date එක අනුව නිවැරදි version එක තෝරයි.
- Admin වන්නේ `ADMIN_EMAILS` හි ඇති email addresses.

---

## 19. Rules කොතරම් විශ්වාසදායකද? (verification)

සෑම rule එකකටම status එකක් ඇත, user ට එය පෙන්වයි:

| Status | තේරුම |
|---|---|
| ✅ `VERIFIED` | Primary source එකක (IRD / Parliament document) කෙලින්ම කියවා ඇත |
| 🟡 `VERIFIED_SECONDARY` | Primary document එක කියවා නැත; විශ්වාසදායක secondary sources එකඟ වේ |
| ⚠️ `REQUIRES_VERIFICATION` | Primary sources නිහඬයි, publish වී නැත, හෝ ගැටේ. Calculation එකේ warning එකක් පෙන්වයි |

### Open uncertainties (විවෘත ගැටලු 9)

| ID | ගැටලුව | App එක කරන දේ |
|---|---|---|
| **U1** | Foreign income **15% cap** එක bands සමඟ ක්‍රියා කරන හරි ආකාරය. IRD Guide එකේ Annexure 7 සහ worked examples එකිනෙකට වෙනස් ලෙස පෙනේ | Local income පහළ bands ගනී; foreign income ඊට උඩින්, සෑම band rate එකක්ම 15% ට cap. Annexure 7 සහ examples 3ම reproduce වේ |
| **U2** | Y/A 2026/2027 සඳහා IRD tax chart / APIT tables publish කර නැත | 2025/2026 rates සහ relief carry forward |
| **U3** | CGT 10% → 15% වසර මැද වෙනස් වීම; Act එකේ transitional wording කියවා නැත | Realisation date අනුව rate |
| **U4** | 2026/2027 හි prior-year liability නැති විට instalment ගණන — IRD procedure එක publish වී නැත | Current-year estimate ÷ 4, "estimate" ලෙස |
| **U5** | 2027 due dates publish වී නැත | Statutory pattern |
| **U6** | 25% rent relief ට **අමතරව** rental expenses claim කළ හැකිද | Relief පමණි |
| **U7** | Employer EPF/ETF contributions සහ non-cash benefits valuation | T.10 හි ඇති taxable benefits user enter කරයි; employee EPF deduct නොකරයි |
| **U8** | "Senior citizen" වයස් සීමාව | Senior-citizen ගණනයක් නැත |
| **U9** | 2024/2025 foreign-currency income exemption (secondary reading මත) | Exempt ලෙස සලකා flag කරයි |

### Testing
IRD Guide (S4, pp. 39–49) හි **worked examples 6ම** engine tests ලෙස ඇත ([tests/unit/tax/ird-examples.test.ts](tests/unit/tax/ird-examples.test.ts)) — IRD ගේම ගණන් රුපියලටම ගැලපිය යුතුය. අපේක්ෂිත balances payable:

| Example | Balance payable (Rs.) |
|---|---|
| 1 — Salary + interest | 11,200 |
| 2 — Foreign + local lecturing fees, foreign tax credit | 22,000 |
| 3 — Content creator, local + foreign | 16,835,900 |
| 4 — Employment, business, interest, rent, solar, donations | 5,910,084 |
| 5 | 544,600 |
| 6 | 22,600 |

---

## 20. App එක නොකරන දේ

### කිසිදා නොකරන
- IRD එකට return **file කිරීම**
- Tax **ගෙවීම**
- IRD සමඟ ඕනෑම connection එකක් (third parties සඳහා official IRD API එකක් නැත)
- Tax/legal **advice** දීම
- Residency **තීරණය** කිරීම

### තවම build කර නැති
| Feature | තත්ත්වය |
|---|---|
| Email delivery | Verification/reset links සහ reminders server log එකට print වේ පමණි |
| Receipt OCR | Interface එක පමණි |
| AI tax assistant | Interface එක පමණි; model එකක් call නොකරයි |
| Bank feeds, exchange rates | නැත — user අතින් enter කරයි |
| SMS / WhatsApp reminders | නැත |
| Payment gateway | නැත |
| OAuth sign-in (Google ආදිය) | නැත |
| Scheduled jobs (cron) | නැත |
| Cloud (S3) document storage | Local disk පමණි |
| Accountant / family / business accounts | සැලසුම් පමණි |

### Tax engine එකේ නැති
- **Capital allowances** (IRA s.16)
- **Loss carry-forward** (වසර 6)
- **Penalties සහ interest ගණනය** (පෙන්වයි පමණි)
- **Senior-citizen** provisions
- **Film-industry** qualifying payments
- **Partnership** සහ **trust** income
- Entertainment සහ වෙනත් specific expense restrictions, thin capitalisation
- **Tax treaty** relief (non-residents)
- Capital losses offset කිරීම

> සටහන: [README.md](README.md) හි "Languages: English only" කියා ඇතත් එය outdated — Sinhala සහ Tamil code එකේ ඇත ([lib/i18n/config.ts](lib/i18n/config.ts)).

---

## 21. Glossary — වචන මාලාව

| වචනය | තේරුම |
|---|---|
| **AIT** (Advance Income Tax) | Interest, rent, service fees වලින් ගෙවන්නා කපන tax. Residents ට credit එකක් |
| **APIT** (Advance Personal Income Tax) | Employer salary එකෙන් මාසිකව කපන tax |
| **Assessable income** | Tax ගණනයට ගන්නා මුළු income |
| **Balance payable** | තව ගෙවිය යුතු tax |
| **Capital gain** | Asset එකක් විකුණා ලැබෙන ලාභය |
| **CGT** (Capital Gains Tax) | Capital gains මත tax |
| **Concessionary rate** | සාමාන්‍ය rate එකට වඩා අඩු විශේෂ rate |
| **Credit** | ඔබේ tax එකෙන් අඩු වන, දැනටමත් ගෙවූ/කැපූ tax |
| **Deductible** | Income එකෙන් අඩු කළ හැකි |
| **Effective rate** | මුළු tax ÷ මුළු assessable income |
| **EPF / ETF** | Employees' Provident Fund / Employees' Trust Fund |
| **Exempt** | Tax නැති |
| **Final withholding** | කැපූ පසු එතැනින් ඉවර; නැවත tax නැත, credit නැත |
| **Instalment** | වසරකට 4 වරක් ගෙවන tax කොටස |
| **IRA** | Inland Revenue Act, No. 24 of 2017 |
| **IRD** | Inland Revenue Department (දේශීය ආදායම් දෙපාර්තමේන්තුව) |
| **Marginal rate** | ඔබ උපයන ඊළඟ රුපියලට වැටෙන tax rate |
| **NIC** | National Identity Card |
| **Personal relief** | සෑම කෙනෙකුටම tax නැතිව ලැබෙන මූලික ප්‍රමාණය |
| **Progressive rates** | Income වැඩි වන විට වැඩි වන rates |
| **Qualifying payment** | Taxable income අඩු කරන අනුමත ගෙවීම් (donations ආදිය) |
| **Realisation** | Asset එකක් විකිණීම / බැහැර කිරීම |
| **Relief** | Taxable income අඩු කරන සහනය |
| **Remitted** | විදේශයෙන් Sri Lanka ට bank එකක් හරහා ගෙන ආ |
| **Resident** | Tax කටයුතු සඳහා Sri Lanka හි නේවාසික |
| **Return of income** | වසරකට වරක් IRD එකට file කරන income/tax ප්‍රකාශය |
| **SET** | Statement of Estimated Tax (2026/2027 සිට අහෝසි) |
| **T.10** | Employer දෙන APIT certificate එක |
| **Taxable income** | Reliefs අඩු කළ පසු tax වැටෙන income |
| **Terminal benefits** | සේවය අවසානයේ ලැබෙන gratuity, pension, ETF ආදිය |
| **TIN** | Taxpayer Identification Number |
| **WHT** (Withholding Tax) | Source එකේදීම කපන tax |
| **Y/A** (Year of assessment) | 1 April – 31 March tax වර්ෂය |

---

## 22. Disclaimer

මෙම application එක, ලබාගත හැකි Sri Lankan tax rules මත පදනම්ව **estimates සහ organisational tools** සපයයි. එය professional tax, legal හෝ accounting advice සඳහා ආදේශකයක් **නොවේ**. Tax laws වෙනස් විය හැක. වැදගත් කරුණු සෑම විටම **Inland Revenue Department** එකෙන් හෝ සුදුසුකම් ලත් tax professional කෙනෙකුගෙන් තහවුරු කරගන්න.

---

*මූලාශ්‍ර files: [TAX_RULES.md](TAX_RULES.md) (research register, English), [README.md](README.md), [lib/tax/data/rules.ts](lib/tax/data/rules.ts), [lib/tax/data/sources.ts](lib/tax/data/sources.ts), [lib/tax/data/deadlines.ts](lib/tax/data/deadlines.ts), [lib/tax/engine.ts](lib/tax/engine.ts), [prisma/schema.prisma](prisma/schema.prisma).*
