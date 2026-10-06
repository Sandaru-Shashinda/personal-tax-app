-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('USER', 'ADMIN');

-- CreateEnum
CREATE TYPE "AuthTokenType" AS ENUM ('EMAIL_VERIFICATION', 'PASSWORD_RESET');

-- CreateEnum
CREATE TYPE "ResidencyStatus" AS ENUM ('RESIDENT', 'NON_RESIDENT_CITIZEN', 'NON_RESIDENT');

-- CreateEnum
CREATE TYPE "EmploymentStatus" AS ENUM ('EMPLOYED', 'SELF_EMPLOYED', 'BOTH', 'RETIRED', 'NOT_EMPLOYED');

-- CreateEnum
CREATE TYPE "FilingStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'READY_TO_FILE', 'FILED_BY_USER');

-- CreateEnum
CREATE TYPE "TaxYearStatus" AS ENUM ('UPCOMING', 'CURRENT', 'CLOSED');

-- CreateEnum
CREATE TYPE "SourceDocumentType" AS ENUM ('ACT', 'GAZETTE', 'CIRCULAR', 'GUIDELINE', 'BILL', 'IRD_NOTICE', 'OTHER');

-- CreateEnum
CREATE TYPE "TaxRuleType" AS ENUM ('PERSONAL_RELIEF', 'TAX_BANDS', 'CAPITAL_GAINS_RATE', 'CAPITAL_GAINS_EXEMPTION', 'FOREIGN_INCOME_CAP', 'SPECIAL_RATE', 'TERMINAL_BENEFIT_BANDS', 'RENT_RELIEF', 'SOLAR_RELIEF', 'CHARITY_DONATION', 'GOVERNMENT_DONATION', 'WITHHOLDING_RATE', 'DIVIDEND_TREATMENT', 'EXPENSE_DEDUCTIBILITY', 'INSTALMENT_BASIS', 'FILING_REQUIREMENT', 'PENALTY_INFO', 'EXEMPTION');

-- CreateEnum
CREATE TYPE "RuleVersionStatus" AS ENUM ('DRAFT', 'ACTIVE', 'SUPERSEDED');

-- CreateEnum
CREATE TYPE "VerificationStatus" AS ENUM ('VERIFIED', 'VERIFIED_SECONDARY', 'REQUIRES_VERIFICATION');

-- CreateEnum
CREATE TYPE "DeadlineType" AS ENUM ('INSTALMENT', 'FINAL_PAYMENT', 'RETURN_FILING', 'APIT_REMITTANCE', 'ANNUAL_STATEMENT', 'OTHER');

-- CreateEnum
CREATE TYPE "IncomeType" AS ENUM ('SALARY', 'FREELANCE', 'BUSINESS', 'PROFESSIONAL', 'RENTAL', 'INTEREST', 'DIVIDEND', 'INVESTMENT_OTHER', 'CAPITAL_GAIN', 'FOREIGN', 'OTHER');

-- CreateEnum
CREATE TYPE "EntryPeriod" AS ENUM ('MONTHLY', 'ANNUAL', 'ONE_OFF');

-- CreateEnum
CREATE TYPE "InvestmentKind" AS ENUM ('INTEREST', 'DIVIDEND_RESIDENT_COMPANY', 'DIVIDEND_OTHER', 'OTHER');

-- CreateEnum
CREATE TYPE "CapitalGainExemption" AS ENUM ('NONE', 'LISTED_SHARES', 'PRINCIPAL_RESIDENCE');

-- CreateEnum
CREATE TYPE "Deductibility" AS ENUM ('DEDUCTIBLE', 'PARTIALLY_DEDUCTIBLE', 'NON_DEDUCTIBLE', 'REQUIRES_REVIEW');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'CARD', 'BANK_TRANSFER', 'CHEQUE', 'OTHER');

-- CreateEnum
CREATE TYPE "QualifyingPaymentType" AS ENUM ('CHARITY_DONATION', 'GOVERNMENT_DONATION', 'SOLAR_PANEL', 'SAMURDHI_SHOP');

-- CreateEnum
CREATE TYPE "CalculationItemKind" AS ENUM ('INCOME', 'EXCLUDED', 'RELIEF', 'QUALIFYING_PAYMENT', 'TAX', 'CREDIT', 'TOTAL');

-- CreateEnum
CREATE TYPE "TaxPaymentType" AS ENUM ('INSTALMENT', 'FINAL_PAYMENT', 'CAPITAL_GAINS_TAX', 'APIT', 'WITHHOLDING', 'OTHER');

-- CreateEnum
CREATE TYPE "CertificateType" AS ENUM ('APIT_T10', 'AIT_WHT', 'DIVIDEND_WHT', 'OTHER');

-- CreateEnum
CREATE TYPE "DocumentCategory" AS ENUM ('PAYSLIP', 'TAX_CERTIFICATE', 'APIT_DOCUMENT', 'BANK_STATEMENT', 'RECEIPT', 'INVOICE', 'RENTAL_DOCUMENT', 'INVESTMENT_STATEMENT', 'TAX_RETURN', 'PAYMENT_PROOF', 'OTHER');

-- CreateEnum
CREATE TYPE "OcrStatus" AS ENUM ('NOT_REQUESTED', 'PENDING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "ReturnSectionKey" AS ENUM ('TAXPAYER_DETAILS', 'INCOME', 'DEDUCTIONS', 'RELIEFS', 'CALCULATION', 'PAYMENTS', 'VALIDATION', 'SUMMARY');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('DEADLINE_APPROACHING', 'PAYMENT_DUE', 'MISSING_DOCUMENT', 'CALCULATION_CHANGED', 'NEW_TAX_YEAR', 'TAX_RULE_UPDATED', 'SECURITY');

-- CreateEnum
CREATE TYPE "ReminderChannel" AS ENUM ('IN_APP', 'EMAIL');

-- CreateTable
CREATE TABLE "User" (
    "id" UUID NOT NULL,
    "email" VARCHAR(254) NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'USER',
    "emailVerifiedAt" TIMESTAMP(3),
    "twoFactorSecret" TEXT,
    "twoFactorEnabled" BOOLEAN NOT NULL DEFAULT false,
    "onboardingDoneAt" TIMESTAMP(3),
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "failedLoginCount" INTEGER NOT NULL DEFAULT 0,
    "lockedUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "userAgent" VARCHAR(400),
    "ipAddress" VARCHAR(64),
    "twoFactorOk" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuthToken" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "type" "AuthTokenType" NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuthToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecoveryCode" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "codeHash" TEXT NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RecoveryCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RateLimit" (
    "key" VARCHAR(200) NOT NULL,
    "count" INTEGER NOT NULL,
    "windowStart" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RateLimit_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "Profile" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "fullName" VARCHAR(200) NOT NULL,
    "dateOfBirth" DATE,
    "phone" VARCHAR(30),
    "addressLine1" VARCHAR(200),
    "addressLine2" VARCHAR(200),
    "city" VARCHAR(100),
    "district" VARCHAR(60),
    "province" VARCHAR(60),
    "postalCode" VARCHAR(10),
    "emailReminders" BOOLEAN NOT NULL DEFAULT true,
    "inAppReminders" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Profile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Taxpayer" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "tin" VARCHAR(20),
    "nicEncrypted" TEXT,
    "residencyStatus" "ResidencyStatus" NOT NULL DEFAULT 'RESIDENT',
    "employmentStatus" "EmploymentStatus" NOT NULL DEFAULT 'EMPLOYED',
    "incomeTypes" "IncomeType"[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Taxpayer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaxpayerYear" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "taxYearId" UUID NOT NULL,
    "residencyStatus" "ResidencyStatus" NOT NULL DEFAULT 'RESIDENT',
    "filingStatus" "FilingStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TaxpayerYear_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaxYear" (
    "id" UUID NOT NULL,
    "code" VARCHAR(9) NOT NULL,
    "startsOn" DATE NOT NULL,
    "endsOn" DATE NOT NULL,
    "status" "TaxYearStatus" NOT NULL DEFAULT 'UPCOMING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TaxYear_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaxRuleSource" (
    "id" UUID NOT NULL,
    "ref" VARCHAR(20) NOT NULL,
    "title" VARCHAR(400) NOT NULL,
    "authority" VARCHAR(200) NOT NULL,
    "url" VARCHAR(1000) NOT NULL,
    "documentType" "SourceDocumentType" NOT NULL,
    "publicationDate" DATE,
    "effectiveDate" DATE,
    "contentHash" VARCHAR(64),
    "lastCheckedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TaxRuleSource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaxRule" (
    "id" UUID NOT NULL,
    "taxYearId" UUID NOT NULL,
    "ruleType" "TaxRuleType" NOT NULL,
    "key" VARCHAR(80) NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "description" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TaxRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaxRuleVersion" (
    "id" UUID NOT NULL,
    "ruleId" UUID NOT NULL,
    "version" INTEGER NOT NULL,
    "parameters" JSONB NOT NULL,
    "effectiveFrom" DATE NOT NULL,
    "effectiveTo" DATE,
    "status" "RuleVersionStatus" NOT NULL DEFAULT 'DRAFT',
    "verification" "VerificationStatus" NOT NULL DEFAULT 'REQUIRES_VERIFICATION',
    "sourceId" UUID,
    "sourceLocator" VARCHAR(200),
    "notes" TEXT,
    "lastVerifiedAt" TIMESTAMP(3),
    "createdById" UUID,
    "activatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TaxRuleVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaxDeadline" (
    "id" UUID NOT NULL,
    "taxYearId" UUID NOT NULL,
    "type" "DeadlineType" NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "dueOn" DATE NOT NULL,
    "appliesTo" VARCHAR(40) NOT NULL DEFAULT 'INDIVIDUAL',
    "verification" "VerificationStatus" NOT NULL DEFAULT 'VERIFIED',
    "sourceId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TaxDeadline_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Employer" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "tin" VARCHAR(20),
    "address" VARCHAR(300),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Employer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IncomeSource" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "type" "IncomeType" NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "employerId" UUID,
    "isPrimaryEmployment" BOOLEAN NOT NULL DEFAULT true,
    "institution" VARCHAR(200),
    "reference" VARCHAR(100),
    "startedOn" DATE,
    "endedOn" DATE,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "IncomeSource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IncomeEntry" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "taxYearId" UUID NOT NULL,
    "sourceId" UUID NOT NULL,
    "type" "IncomeType" NOT NULL,
    "period" "EntryPeriod" NOT NULL DEFAULT 'ONE_OFF',
    "receivedOn" DATE NOT NULL,
    "description" VARCHAR(300),
    "grossAmount" DECIMAL(18,2) NOT NULL,
    "withholdingTax" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "currency" CHAR(3) NOT NULL DEFAULT 'LKR',
    "originalAmount" DECIMAL(18,2),
    "exchangeRate" DECIMAL(18,6),
    "exchangeRateSource" VARCHAR(120),
    "exchangeRateDate" DATE,
    "isForeignSource" BOOLEAN NOT NULL DEFAULT false,
    "remittedViaBank" BOOLEAN NOT NULL DEFAULT false,
    "foreignTaxPaid" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "IncomeEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalaryIncome" (
    "entryId" UUID NOT NULL,
    "basicSalary" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "allowances" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "bonuses" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "overtime" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "benefits" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "otherEmployment" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "terminalBenefits" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "epfEmployee" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "otherDeductions" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "months" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "SalaryIncome_pkey" PRIMARY KEY ("entryId")
);

-- CreateTable
CREATE TABLE "BusinessIncome" (
    "entryId" UUID NOT NULL,
    "clientName" VARCHAR(200),
    "invoiceNumber" VARCHAR(80),
    "isServiceExport" BOOLEAN NOT NULL DEFAULT false,
    "isSpecialRateBusiness" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "BusinessIncome_pkey" PRIMARY KEY ("entryId")
);

-- CreateTable
CREATE TABLE "RentalIncome" (
    "entryId" UUID NOT NULL,
    "propertyName" VARCHAR(200) NOT NULL,
    "tenantName" VARCHAR(200),
    "months" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "RentalIncome_pkey" PRIMARY KEY ("entryId")
);

-- CreateTable
CREATE TABLE "InvestmentIncome" (
    "entryId" UUID NOT NULL,
    "kind" "InvestmentKind" NOT NULL,
    "accountRef" VARCHAR(100),
    "isExempt" BOOLEAN NOT NULL DEFAULT false,
    "exemptReason" VARCHAR(200),

    CONSTRAINT "InvestmentIncome_pkey" PRIMARY KEY ("entryId")
);

-- CreateTable
CREATE TABLE "CapitalGain" (
    "entryId" UUID NOT NULL,
    "assetName" VARCHAR(200) NOT NULL,
    "acquiredOn" DATE NOT NULL,
    "acquisitionCost" DECIMAL(18,2) NOT NULL,
    "disposedOn" DATE NOT NULL,
    "disposalValue" DECIMAL(18,2) NOT NULL,
    "allowableCosts" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "exemption" "CapitalGainExemption" NOT NULL DEFAULT 'NONE',
    "taxPaid" DECIMAL(18,2) NOT NULL DEFAULT 0,

    CONSTRAINT "CapitalGain_pkey" PRIMARY KEY ("entryId")
);

-- CreateTable
CREATE TABLE "Expense" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "taxYearId" UUID NOT NULL,
    "incomeSourceId" UUID,
    "incurredOn" DATE NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "category" VARCHAR(60) NOT NULL,
    "description" VARCHAR(300) NOT NULL,
    "paymentMethod" "PaymentMethod" NOT NULL DEFAULT 'BANK_TRANSFER',
    "isCapital" BOOLEAN NOT NULL DEFAULT false,
    "userConfirmedBusinessPurpose" BOOLEAN NOT NULL DEFAULT false,
    "businessUsePercent" INTEGER NOT NULL DEFAULT 100,
    "deductibility" "Deductibility" NOT NULL DEFAULT 'REQUIRES_REVIEW',
    "deductibleAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "deductibilityReason" VARCHAR(500) NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Expense_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QualifyingPayment" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "taxYearId" UUID NOT NULL,
    "type" "QualifyingPaymentType" NOT NULL,
    "paidOn" DATE NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "recipient" VARCHAR(200) NOT NULL,
    "description" VARCHAR(300),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "QualifyingPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaxCalculation" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "taxYearId" UUID NOT NULL,
    "isLatest" BOOLEAN NOT NULL DEFAULT true,
    "engineVersion" VARCHAR(20) NOT NULL,
    "assessableIncome" DECIMAL(18,2) NOT NULL,
    "taxableIncome" DECIMAL(18,2) NOT NULL,
    "totalTax" DECIMAL(18,2) NOT NULL,
    "totalCredits" DECIMAL(18,2) NOT NULL,
    "balancePayable" DECIMAL(18,2) NOT NULL,
    "inputs" JSONB NOT NULL,
    "result" JSONB NOT NULL,
    "ruleSnapshot" JSONB NOT NULL,
    "inputHash" VARCHAR(64) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TaxCalculation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaxCalculationItem" (
    "id" UUID NOT NULL,
    "calculationId" UUID NOT NULL,
    "position" INTEGER NOT NULL,
    "kind" "CalculationItemKind" NOT NULL,
    "code" VARCHAR(60) NOT NULL,
    "label" VARCHAR(200) NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "rate" DECIMAL(7,4),
    "ruleVersionId" UUID,

    CONSTRAINT "TaxCalculationItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaxPayment" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "taxYearId" UUID NOT NULL,
    "type" "TaxPaymentType" NOT NULL,
    "paidOn" DATE NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "reference" VARCHAR(100),
    "bank" VARCHAR(120),
    "instalmentNo" INTEGER,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "TaxPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaxInstalment" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "taxYearId" UUID NOT NULL,
    "instalmentNo" INTEGER NOT NULL,
    "dueOn" DATE NOT NULL,
    "amountDue" DECIMAL(18,2) NOT NULL,
    "basis" VARCHAR(40) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TaxInstalment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaxCertificate" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "taxYearId" UUID NOT NULL,
    "incomeSourceId" UUID,
    "documentId" UUID,
    "type" "CertificateType" NOT NULL,
    "issuer" VARCHAR(200) NOT NULL,
    "certificateNo" VARCHAR(80),
    "grossAmount" DECIMAL(18,2) NOT NULL,
    "taxDeducted" DECIMAL(18,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "TaxCertificate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Document" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "taxYearId" UUID,
    "incomeSourceId" UUID,
    "incomeEntryId" UUID,
    "expenseId" UUID,
    "paymentId" UUID,
    "category" "DocumentCategory" NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "originalName" VARCHAR(255) NOT NULL,
    "mimeType" VARCHAR(100) NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "storageKey" VARCHAR(300) NOT NULL,
    "sha256" VARCHAR(64) NOT NULL,
    "ocrStatus" "OcrStatus" NOT NULL DEFAULT 'NOT_REQUESTED',
    "ocrResult" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaxReturn" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "taxYearId" UUID NOT NULL,
    "calculationId" UUID,
    "currentStep" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TaxReturn_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaxReturnSection" (
    "id" UUID NOT NULL,
    "taxReturnId" UUID NOT NULL,
    "key" "ReturnSectionKey" NOT NULL,
    "reviewedAt" TIMESTAMP(3),
    "issues" JSONB,

    CONSTRAINT "TaxReturnSection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaxReturnSubmission" (
    "id" UUID NOT NULL,
    "taxReturnId" UUID NOT NULL,
    "filedOn" DATE NOT NULL,
    "acknowledgementNo" VARCHAR(80),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TaxReturnSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "body" VARCHAR(600) NOT NULL,
    "href" VARCHAR(300),
    "dedupeKey" VARCHAR(200),
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Reminder" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "deadlineId" UUID NOT NULL,
    "channel" "ReminderChannel" NOT NULL,
    "daysBefore" INTEGER NOT NULL,
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Reminder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" UUID NOT NULL,
    "userId" UUID,
    "action" VARCHAR(80) NOT NULL,
    "entity" VARCHAR(60),
    "entityId" VARCHAR(60),
    "before" JSONB,
    "after" JSONB,
    "ipAddress" VARCHAR(64),
    "userAgent" VARCHAR(400),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Session_tokenHash_key" ON "Session"("tokenHash");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE INDEX "Session_expiresAt_idx" ON "Session"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "AuthToken_tokenHash_key" ON "AuthToken"("tokenHash");

-- CreateIndex
CREATE INDEX "AuthToken_userId_type_idx" ON "AuthToken"("userId", "type");

-- CreateIndex
CREATE INDEX "RecoveryCode_userId_idx" ON "RecoveryCode"("userId");

-- CreateIndex
CREATE INDEX "RateLimit_expiresAt_idx" ON "RateLimit"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "Profile_userId_key" ON "Profile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Taxpayer_userId_key" ON "Taxpayer"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "TaxpayerYear_userId_taxYearId_key" ON "TaxpayerYear"("userId", "taxYearId");

-- CreateIndex
CREATE UNIQUE INDEX "TaxYear_code_key" ON "TaxYear"("code");

-- CreateIndex
CREATE INDEX "TaxYear_startsOn_endsOn_idx" ON "TaxYear"("startsOn", "endsOn");

-- CreateIndex
CREATE UNIQUE INDEX "TaxRuleSource_ref_key" ON "TaxRuleSource"("ref");

-- CreateIndex
CREATE UNIQUE INDEX "TaxRule_taxYearId_ruleType_key_key" ON "TaxRule"("taxYearId", "ruleType", "key");

-- CreateIndex
CREATE INDEX "TaxRuleVersion_ruleId_status_effectiveFrom_idx" ON "TaxRuleVersion"("ruleId", "status", "effectiveFrom");

-- CreateIndex
CREATE UNIQUE INDEX "TaxRuleVersion_ruleId_version_key" ON "TaxRuleVersion"("ruleId", "version");

-- CreateIndex
CREATE INDEX "TaxDeadline_dueOn_idx" ON "TaxDeadline"("dueOn");

-- CreateIndex
CREATE UNIQUE INDEX "TaxDeadline_taxYearId_type_title_key" ON "TaxDeadline"("taxYearId", "type", "title");

-- CreateIndex
CREATE INDEX "Employer_userId_idx" ON "Employer"("userId");

-- CreateIndex
CREATE INDEX "IncomeSource_userId_type_idx" ON "IncomeSource"("userId", "type");

-- CreateIndex
CREATE INDEX "IncomeEntry_userId_taxYearId_type_idx" ON "IncomeEntry"("userId", "taxYearId", "type");

-- CreateIndex
CREATE INDEX "IncomeEntry_userId_taxYearId_receivedOn_idx" ON "IncomeEntry"("userId", "taxYearId", "receivedOn");

-- CreateIndex
CREATE INDEX "IncomeEntry_sourceId_idx" ON "IncomeEntry"("sourceId");

-- CreateIndex
CREATE INDEX "Expense_userId_taxYearId_incurredOn_idx" ON "Expense"("userId", "taxYearId", "incurredOn");

-- CreateIndex
CREATE INDEX "Expense_userId_taxYearId_category_idx" ON "Expense"("userId", "taxYearId", "category");

-- CreateIndex
CREATE INDEX "Expense_incomeSourceId_idx" ON "Expense"("incomeSourceId");

-- CreateIndex
CREATE INDEX "QualifyingPayment_userId_taxYearId_idx" ON "QualifyingPayment"("userId", "taxYearId");

-- CreateIndex
CREATE INDEX "TaxCalculation_userId_taxYearId_isLatest_idx" ON "TaxCalculation"("userId", "taxYearId", "isLatest");

-- CreateIndex
CREATE INDEX "TaxCalculation_userId_taxYearId_createdAt_idx" ON "TaxCalculation"("userId", "taxYearId", "createdAt");

-- CreateIndex
CREATE INDEX "TaxCalculationItem_calculationId_position_idx" ON "TaxCalculationItem"("calculationId", "position");

-- CreateIndex
CREATE INDEX "TaxPayment_userId_taxYearId_paidOn_idx" ON "TaxPayment"("userId", "taxYearId", "paidOn");

-- CreateIndex
CREATE UNIQUE INDEX "TaxInstalment_userId_taxYearId_instalmentNo_key" ON "TaxInstalment"("userId", "taxYearId", "instalmentNo");

-- CreateIndex
CREATE UNIQUE INDEX "TaxCertificate_documentId_key" ON "TaxCertificate"("documentId");

-- CreateIndex
CREATE INDEX "TaxCertificate_userId_taxYearId_idx" ON "TaxCertificate"("userId", "taxYearId");

-- CreateIndex
CREATE UNIQUE INDEX "Document_storageKey_key" ON "Document"("storageKey");

-- CreateIndex
CREATE INDEX "Document_userId_taxYearId_category_idx" ON "Document"("userId", "taxYearId", "category");

-- CreateIndex
CREATE INDEX "Document_expenseId_idx" ON "Document"("expenseId");

-- CreateIndex
CREATE UNIQUE INDEX "TaxReturn_userId_taxYearId_key" ON "TaxReturn"("userId", "taxYearId");

-- CreateIndex
CREATE UNIQUE INDEX "TaxReturnSection_taxReturnId_key_key" ON "TaxReturnSection"("taxReturnId", "key");

-- CreateIndex
CREATE INDEX "TaxReturnSubmission_taxReturnId_idx" ON "TaxReturnSubmission"("taxReturnId");

-- CreateIndex
CREATE INDEX "Notification_userId_readAt_createdAt_idx" ON "Notification"("userId", "readAt", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Notification_userId_dedupeKey_key" ON "Notification"("userId", "dedupeKey");

-- CreateIndex
CREATE UNIQUE INDEX "Reminder_userId_deadlineId_channel_daysBefore_key" ON "Reminder"("userId", "deadlineId", "channel", "daysBefore");

-- CreateIndex
CREATE INDEX "AuditLog_userId_createdAt_idx" ON "AuditLog"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_entity_entityId_idx" ON "AuditLog"("entity", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_action_createdAt_idx" ON "AuditLog"("action", "createdAt");

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuthToken" ADD CONSTRAINT "AuthToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecoveryCode" ADD CONSTRAINT "RecoveryCode_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Profile" ADD CONSTRAINT "Profile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Taxpayer" ADD CONSTRAINT "Taxpayer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaxpayerYear" ADD CONSTRAINT "TaxpayerYear_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaxpayerYear" ADD CONSTRAINT "TaxpayerYear_taxYearId_fkey" FOREIGN KEY ("taxYearId") REFERENCES "TaxYear"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaxRule" ADD CONSTRAINT "TaxRule_taxYearId_fkey" FOREIGN KEY ("taxYearId") REFERENCES "TaxYear"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaxRuleVersion" ADD CONSTRAINT "TaxRuleVersion_ruleId_fkey" FOREIGN KEY ("ruleId") REFERENCES "TaxRule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaxRuleVersion" ADD CONSTRAINT "TaxRuleVersion_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "TaxRuleSource"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaxDeadline" ADD CONSTRAINT "TaxDeadline_taxYearId_fkey" FOREIGN KEY ("taxYearId") REFERENCES "TaxYear"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaxDeadline" ADD CONSTRAINT "TaxDeadline_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "TaxRuleSource"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Employer" ADD CONSTRAINT "Employer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IncomeSource" ADD CONSTRAINT "IncomeSource_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IncomeSource" ADD CONSTRAINT "IncomeSource_employerId_fkey" FOREIGN KEY ("employerId") REFERENCES "Employer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IncomeEntry" ADD CONSTRAINT "IncomeEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IncomeEntry" ADD CONSTRAINT "IncomeEntry_taxYearId_fkey" FOREIGN KEY ("taxYearId") REFERENCES "TaxYear"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IncomeEntry" ADD CONSTRAINT "IncomeEntry_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "IncomeSource"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalaryIncome" ADD CONSTRAINT "SalaryIncome_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "IncomeEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusinessIncome" ADD CONSTRAINT "BusinessIncome_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "IncomeEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RentalIncome" ADD CONSTRAINT "RentalIncome_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "IncomeEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvestmentIncome" ADD CONSTRAINT "InvestmentIncome_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "IncomeEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CapitalGain" ADD CONSTRAINT "CapitalGain_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "IncomeEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_taxYearId_fkey" FOREIGN KEY ("taxYearId") REFERENCES "TaxYear"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_incomeSourceId_fkey" FOREIGN KEY ("incomeSourceId") REFERENCES "IncomeSource"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QualifyingPayment" ADD CONSTRAINT "QualifyingPayment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QualifyingPayment" ADD CONSTRAINT "QualifyingPayment_taxYearId_fkey" FOREIGN KEY ("taxYearId") REFERENCES "TaxYear"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaxCalculation" ADD CONSTRAINT "TaxCalculation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaxCalculation" ADD CONSTRAINT "TaxCalculation_taxYearId_fkey" FOREIGN KEY ("taxYearId") REFERENCES "TaxYear"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaxCalculationItem" ADD CONSTRAINT "TaxCalculationItem_calculationId_fkey" FOREIGN KEY ("calculationId") REFERENCES "TaxCalculation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaxPayment" ADD CONSTRAINT "TaxPayment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaxPayment" ADD CONSTRAINT "TaxPayment_taxYearId_fkey" FOREIGN KEY ("taxYearId") REFERENCES "TaxYear"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaxInstalment" ADD CONSTRAINT "TaxInstalment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaxInstalment" ADD CONSTRAINT "TaxInstalment_taxYearId_fkey" FOREIGN KEY ("taxYearId") REFERENCES "TaxYear"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaxCertificate" ADD CONSTRAINT "TaxCertificate_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaxCertificate" ADD CONSTRAINT "TaxCertificate_taxYearId_fkey" FOREIGN KEY ("taxYearId") REFERENCES "TaxYear"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaxCertificate" ADD CONSTRAINT "TaxCertificate_incomeSourceId_fkey" FOREIGN KEY ("incomeSourceId") REFERENCES "IncomeSource"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaxCertificate" ADD CONSTRAINT "TaxCertificate_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_taxYearId_fkey" FOREIGN KEY ("taxYearId") REFERENCES "TaxYear"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_incomeSourceId_fkey" FOREIGN KEY ("incomeSourceId") REFERENCES "IncomeSource"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_incomeEntryId_fkey" FOREIGN KEY ("incomeEntryId") REFERENCES "IncomeEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_expenseId_fkey" FOREIGN KEY ("expenseId") REFERENCES "Expense"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "TaxPayment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaxReturn" ADD CONSTRAINT "TaxReturn_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaxReturn" ADD CONSTRAINT "TaxReturn_taxYearId_fkey" FOREIGN KEY ("taxYearId") REFERENCES "TaxYear"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaxReturnSection" ADD CONSTRAINT "TaxReturnSection_taxReturnId_fkey" FOREIGN KEY ("taxReturnId") REFERENCES "TaxReturn"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaxReturnSubmission" ADD CONSTRAINT "TaxReturnSubmission_taxReturnId_fkey" FOREIGN KEY ("taxReturnId") REFERENCES "TaxReturn"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reminder" ADD CONSTRAINT "Reminder_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
