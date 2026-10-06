import type { Metadata } from "next";
import { ExternalLink, TriangleAlert } from "lucide-react";
import { DeadlineForm, DraftActions, DraftVersionForm, NewTaxYearForm, SourceForm } from "@/components/admin/admin-controls";
import { PageHeader } from "@/components/shared/page";
import { VerificationBadge } from "@/components/shared/why";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { requireAdmin } from "@/lib/auth/session";
import { formatDate } from "@/lib/format";
import { resolveTaxYear } from "@/lib/tax-year";
import { listAuditLog, listDeadlinesForAdmin, listRulesForAdmin, listSources } from "@/services/admin/rule-admin-service";
import { listTaxYears } from "@/services/tax/rule-repository";

export const metadata: Metadata = { title: "Tax rules administration" };

const STATUS_VARIANT = { ACTIVE: "secondary", DRAFT: "default", SUPERSEDED: "outline" } as const;

export default async function AdminPage() {
  // The page, and every action it can trigger, checks the ADMIN role on the server.
  await requireAdmin();
  const taxYear = await resolveTaxYear();
  const [rules, sources, deadlines, years, auditLog] = await Promise.all([
    listRulesForAdmin(taxYear.code),
    listSources(),
    listDeadlinesForAdmin(taxYear.code),
    listTaxYears(),
    listAuditLog({ actionPrefix: "tax" }, 60),
  ]);
  const sourceOptions = sources.map((s) => ({ id: s.id, ref: s.ref, title: s.title }));
  const attention = rules.flatMap((rule) =>
    rule.versions.filter((v) => v.status !== "SUPERSEDED" && (v.status === "DRAFT" || v.verification === "REQUIRES_VERIFICATION")).map((v) => ({ rule, version: v })),
  );
  const unverifiedDeadlines = deadlines.filter((d) => d.verification === "REQUIRES_VERIFICATION");
  const latest = years[0];
  const suggested = latest ? `${Number(latest.code.slice(0, 4)) + 1}/${Number(latest.code.slice(5)) + 1}` : "";

  return (
    <>
      <PageHeader title="Tax rules administration" description={`Rules, sources and deadlines for ${taxYear.code}. Use the tax year switcher above to work on another year. Every change is audited.`}>
        <NewTaxYearForm suggested={suggested} />
        <SourceForm />
      </PageHeader>

      {(attention.length > 0 || unverifiedDeadlines.length > 0) && (
        <Card className="border-warning/40 shadow-xs">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TriangleAlert className="size-4 text-warning" aria-hidden /> Needs your attention
            </CardTitle>
            <CardDescription>Drafts waiting to be activated, and rules or dates that could not be confirmed against an official source.</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              {attention.map(({ rule, version }) => (
                <li key={version.id} className="flex flex-wrap items-center gap-2">
                  <Badge variant={STATUS_VARIANT[version.status]}>{version.status === "DRAFT" ? "Draft" : "Active"}</Badge>
                  <span className="font-medium">{rule.name}</span>
                  <span className="text-muted-foreground">v{version.version}</span>
                  {version.notes && <span className="basis-full text-muted-foreground">{version.notes}</span>}
                </li>
              ))}
              {unverifiedDeadlines.map((d) => (
                <li key={d.id} className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline">Deadline</Badge>
                  <span className="font-medium">{d.title}</span>
                  <span className="text-muted-foreground">{formatDate(d.dueOn)} — follows the statutory pattern; not yet in a published IRD calendar.</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="rules">
        <TabsList className="h-auto flex-wrap">
          <TabsTrigger value="rules">Rules ({rules.length})</TabsTrigger>
          <TabsTrigger value="sources">Sources ({sources.length})</TabsTrigger>
          <TabsTrigger value="deadlines">Deadlines</TabsTrigger>
          <TabsTrigger value="years">Tax years</TabsTrigger>
          <TabsTrigger value="audit">Audit log</TabsTrigger>
        </TabsList>

        <TabsContent value="rules" className="space-y-4">
          {rules.map((rule) => {
            const current = rule.versions.find((v) => v.status === "ACTIVE") ?? rule.versions[0];
            return (
              <Card key={rule.id} className="shadow-xs">
                <CardHeader className="flex flex-row items-start justify-between gap-4">
                  <div className="space-y-1">
                    <CardTitle className="text-base">{rule.name}</CardTitle>
                    <CardDescription>
                      <span className="font-mono text-xs">
                        {rule.ruleType} / {rule.key}
                      </span>
                      <span className="mt-1 block">{rule.description}</span>
                    </CardDescription>
                  </div>
                  {current && <DraftVersionForm rule={{ id: rule.id, name: rule.name }} base={current} sources={sourceOptions} taxYear={taxYear} />}
                </CardHeader>
                <CardContent>
                  <ul className="divide-y rounded-xl border">
                    {rule.versions.map((v) => (
                      <li key={v.id} className="space-y-2 px-4 py-3 text-sm">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium">Version {v.version}</span>
                          <Badge variant={STATUS_VARIANT[v.status]}>{v.status.charAt(0) + v.status.slice(1).toLowerCase()}</Badge>
                          <VerificationBadge status={v.verification} />
                          <span className="tabular text-xs text-muted-foreground">
                            {formatDate(v.effectiveFrom)} → {v.effectiveTo ? formatDate(v.effectiveTo) : "end of year"}
                          </span>
                          {v.status === "DRAFT" && (
                            <span className="ml-auto">
                              <DraftActions versionId={v.id} ruleName={rule.name} />
                            </span>
                          )}
                        </div>
                        <pre className="overflow-x-auto rounded-lg bg-muted px-3 py-2 font-mono text-xs">{JSON.stringify(v.parameters)}</pre>
                        <p className="text-xs text-muted-foreground">
                          {v.sourceUrl ? (
                            <a href={v.sourceUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary underline-offset-4 hover:underline">
                              {v.sourceRef}: {v.sourceTitle?.slice(0, 90)} <ExternalLink className="size-3" aria-hidden />
                            </a>
                          ) : (
                            "No source recorded"
                          )}
                          {v.sourceLocator && ` · ${v.sourceLocator}`}
                          {v.lastVerifiedAt && ` · last verified ${formatDate(v.lastVerifiedAt)}`}
                        </p>
                        {v.notes && <p className="text-xs text-muted-foreground">{v.notes}</p>}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>

        <TabsContent value="sources">
          <Card className="shadow-xs">
            <CardContent>
              <ul className="divide-y">
                {sources.map((s) => (
                  <li key={s.id} className="space-y-1 py-3 text-sm first:pt-0 last:pb-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="secondary">{s.ref}</Badge>
                      <Badge variant="outline">{s.documentType.replace("_", " ")}</Badge>
                      <a href={s.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-medium text-primary underline-offset-4 hover:underline">
                        {s.title} <ExternalLink className="size-3 shrink-0" aria-hidden />
                      </a>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {s.authority}
                      {s.publicationDate && ` · published ${formatDate(s.publicationDate)}`}
                      {s.lastCheckedAt && ` · last checked ${formatDate(s.lastCheckedAt)}`} · supports {s.ruleVersions} rule version{s.ruleVersions === 1 ? "" : "s"}
                    </p>
                    {s.notes && <p className="text-xs text-muted-foreground">{s.notes}</p>}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="deadlines">
          <Card className="shadow-xs">
            <CardContent>
              <ul className="divide-y">
                {deadlines.map((d) => (
                  <li key={d.id} className="flex flex-wrap items-center gap-3 py-2.5 text-sm first:pt-0 last:pb-0">
                    <span className="tabular w-28 shrink-0">{formatDate(d.dueOn)}</span>
                    <span className="flex-1 font-medium">{d.title}</span>
                    <VerificationBadge status={d.verification} />
                    {d.sourceRef && <Badge variant="outline">{d.sourceRef}</Badge>}
                    <DeadlineForm deadline={d} />
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="years">
          <Card className="shadow-xs">
            <CardContent>
              <ul className="divide-y">
                {years.map((y) => (
                  <li key={y.id} className="flex items-center gap-3 py-2.5 text-sm first:pt-0 last:pb-0">
                    <span className="tabular font-medium">{y.code}</span>
                    <span className="flex-1 text-muted-foreground">
                      {formatDate(y.startsOn)} – {formatDate(y.endsOn)}
                    </span>
                    <Badge variant={y.status === "CURRENT" ? "default" : "outline"}>{y.status.charAt(0) + y.status.slice(1).toLowerCase()}</Badge>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="audit">
          <Card className="shadow-xs">
            <CardHeader>
              <CardDescription>Changes to tax rules, sources, years and deadlines, newest first.</CardDescription>
            </CardHeader>
            <CardContent>
              {auditLog.length === 0 ? (
                <p className="text-sm text-muted-foreground">No tax-rule changes have been made yet.</p>
              ) : (
                <ul className="divide-y">
                  {auditLog.map((entry) => (
                    <li key={entry.id} className="space-y-1 py-3 text-sm first:pt-0 last:pb-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs">{entry.action}</span>
                        <span className="text-muted-foreground">{entry.userEmail ?? "deleted user"}</span>
                        <span className="tabular ml-auto text-xs text-muted-foreground">
                          {new Date(entry.createdAt).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Colombo" })}
                        </span>
                      </div>
                      {entry.before !== null && <pre className="overflow-x-auto rounded-lg bg-muted px-3 py-1.5 font-mono text-xs">before: {JSON.stringify(entry.before)}</pre>}
                      {entry.after !== null && <pre className="overflow-x-auto rounded-lg bg-muted px-3 py-1.5 font-mono text-xs">after: {JSON.stringify(entry.after)}</pre>}
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </>
  );
}
