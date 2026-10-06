import type { Metadata } from "next";
import { Download, FileImage, FileText, FolderLock, ScanLine } from "lucide-react";
import { deleteDocumentAction } from "@/app/actions/records";
import { UploadForm } from "@/components/documents/upload-form";
import { FilterBar } from "@/components/shared/filters";
import { EmptyState, PageHeader, Pagination } from "@/components/shared/page";
import { DeleteButton } from "@/components/shared/record-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { requireUser } from "@/lib/auth/session";
import { formatDate } from "@/lib/format";
import { ocrProvider } from "@/lib/integrations/ocr";
import { resolveTaxYear } from "@/lib/tax-year";
import { DOCUMENT_CATEGORIES, DOCUMENT_CATEGORY_LABELS } from "@/lib/validation/records";
import { listDocuments } from "@/services/documents/document-service";
import { listIncomeSources } from "@/services/records/income-service";
import { getT } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("Documents") };
}

const one = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);
const size = (bytes: number) => (bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(Math.round(bytes / 1024), 1)} KB`);

export default async function DocumentsPage({ searchParams }: PageProps<"/documents">) {
  const t = await getT();
  const user = await requireUser();
  const params = await searchParams;
  const taxYear = await resolveTaxYear();
  const q = one(params.q)?.slice(0, 80);
  const category = DOCUMENT_CATEGORIES.find((c) => c === one(params.category));
  const scope = one(params.scope) === "all" ? "all" : "year";
  const page = Math.max(Number(one(params.page)) || 1, 1);

  const [list, sources] = await Promise.all([
    listDocuments(user.id, { taxYear: scope === "year" ? taxYear.code : undefined, category, q, page, pageSize: 18 }),
    listIncomeSources(user.id),
  ]);
  const filtered = Boolean(q || category);

  return (
    <>
      <PageHeader title={t("Documents")} description={t("Payslips, T.10 and AIT certificates, receipts and statements, kept privately with the year they belong to.")}>
        <UploadForm taxYear={taxYear.code} sources={sources} />
      </PageHeader>

      <FilterBar
        action="/documents"
        q={q}
        placeholder={t("Search documents by title or file name")}
        selects={[
          { name: "category", label: t("Category"), value: category, options: DOCUMENT_CATEGORIES.map((c) => ({ value: c, label: t(DOCUMENT_CATEGORY_LABELS[c]) })) },
          { name: "scope", label: t("Year ({year})", { year: taxYear.code }), value: scope === "all" ? "all" : undefined, options: [{ value: "all", label: t("All years") }] },
        ]}
      />

      {list.items.length === 0 ? (
        <EmptyState
          icon={FolderLock}
          title={filtered ? t("No documents match those filters") : t("No documents yet")}
          description={filtered ? t("Try a different search, or clear the filters.") : t("Upload your employer's T.10 certificate, bank AIT certificates and receipts so everything is in one place at filing time.")}
        />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {list.items.map((doc) => {
            const Icon = doc.mimeType === "application/pdf" ? FileText : FileImage;
            return (
              <li key={doc.id}>
                <Card className="h-full shadow-xs">
                  <CardContent className="flex h-full flex-col gap-3">
                    <div className="flex items-start gap-3">
                      <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-secondary text-secondary-foreground">
                        <Icon className="size-4" aria-hidden />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">{doc.title}</p>
                        <p className="truncate text-xs text-muted-foreground">{doc.originalName}</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      <Badge variant="secondary">{t(DOCUMENT_CATEGORY_LABELS[doc.category])}</Badge>
                      {doc.taxYear && <Badge variant="outline">{doc.taxYear}</Badge>}
                      {doc.incomeSourceName && <Badge variant="outline">{doc.incomeSourceName}</Badge>}
                    </div>
                    <div className="mt-auto flex items-center justify-between pt-1 text-xs text-muted-foreground">
                      <span>
                        {size(doc.sizeBytes)} · {formatDate(doc.createdAt)}
                      </span>
                      <span className="flex items-center">
                        <Button asChild variant="ghost" size="icon-sm">
                          <a href={`/api/documents/${doc.id}`} aria-label={t("Download {name}", { name: doc.title })}>
                            <Download aria-hidden />
                          </a>
                        </Button>
                        <DeleteButton label={t("Delete {name}", { name: doc.title })} description={t("The file will be permanently removed from storage. This cannot be undone.")} action={deleteDocumentAction.bind(null, doc.id)} />
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
      <Pagination page={list.page} pageSize={list.pageSize} total={list.total} basePath="/documents" params={{ q, category, scope: scope === "all" ? "all" : undefined }} />

      {!ocrProvider() && (
        <p className="flex items-start gap-2 text-xs text-muted-foreground">
          <ScanLine className="mt-0.5 size-3.5 shrink-0" aria-hidden />
          {t("Receipt scanning is not available yet. Uploaded receipts are stored as they are; enter the expense details yourself.")}
        </p>
      )}
    </>
  );
}
