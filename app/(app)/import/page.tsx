import type { Metadata } from "next";
import { ImportWizard } from "@/components/import/import-wizard";
import { Disclaimer } from "@/components/shared/disclaimer";
import { PageHeader } from "@/components/shared/page";
import { requireUser } from "@/lib/auth/session";
import { getT } from "@/lib/i18n/server";
import { resolveTaxYear } from "@/lib/tax-year";
import { listIncomeSources } from "@/services/records/income-service";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("Import a statement") };
}

export default async function ImportPage() {
  const t = await getT();
  const user = await requireUser();
  const [taxYear, sources] = await Promise.all([resolveTaxYear(), listIncomeSources(user.id)]);

  return (
    <>
      <PageHeader
        title={t("Import a statement")}
        description={t("Bring in the transactions of {year} from a bank, card or sales statement instead of typing them. You check every row before anything is saved.", { year: taxYear.code })}
      />
      <ImportWizard taxYear={taxYear} sources={sources} />
      <Disclaimer>{t("A statement shows what moved through an account, not why. Keep the statement and the receipts behind it; the tax office can ask for them.")}</Disclaimer>
    </>
  );
}
