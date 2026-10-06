"use client";

import { FlaskConical, Loader2, Plus, Rocket, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useForm, type FieldValues } from "react-hook-form";
import { toast } from "sonner";
import { activateVersionAction, createDraftVersionAction, createSourceAction, createTaxYearAction, discardDraftAction, previewDraftVersionAction, updateDeadlineAction } from "@/app/actions/admin";
import { Field, fieldError, nativeSelectClass } from "@/components/shared/form";
import { RecordDialog } from "@/components/shared/record-dialog";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { formatLKR } from "@/lib/format";
import { deadlineUpdateSchema, draftVersionSchema, newTaxYearSchema, sourceSchema, type AdminRule, type ScenarioPreview } from "@/lib/admin-schemas";

type Version = AdminRule["versions"][number];
type SourceOption = { id: string; ref: string; title: string };

const VERIFICATION_OPTIONS = [
  { value: "VERIFIED", label: "Verified against an official source" },
  { value: "VERIFIED_SECONDARY", label: "Based on a secondary source" },
  { value: "REQUIRES_VERIFICATION", label: "Requires verification" },
];

export function DraftVersionForm({ rule, base, sources, taxYear }: { rule: { id: string; name: string }; base: Version; sources: SourceOption[]; taxYear: { startsOn: string; endsOn: string } }) {
  const form = useForm<FieldValues>({
    defaultValues: {
      parametersJson: JSON.stringify(base.parameters, null, 2),
      effectiveFrom: base.effectiveFrom,
      effectiveTo: base.effectiveTo ?? "",
      verification: "REQUIRES_VERIFICATION",
      sourceId: base.sourceId ?? "",
      sourceLocator: base.sourceLocator ?? "",
      notes: "",
    },
  });
  const err = (name: string) => fieldError(form.formState.errors as Record<string, unknown>, name);
  return (
    <RecordDialog
      trigger={
        <Button variant="outline" size="sm">
          <Plus aria-hidden /> New version
        </Button>
      }
      title={`New version of “${rule.name}”`}
      description="Saved as a draft. Nothing changes for users until you test and activate it. Existing versions are never edited."
      form={form}
      schema={draftVersionSchema}
      prepare={(values) => ({ ...values, ruleId: rule.id })}
      action={async (data) => {
        const result = await createDraftVersionAction(data);
        return result.ok ? { ok: true, data: undefined, message: result.message } : result;
      }}
      submitLabel="Save draft"
    >
      <Field label="Parameters (JSON)" error={err("parametersJson")} hint="Validated against this rule type's schema. Rates are decimals: 0.18 for 18%.">
        {(p) => <Textarea rows={10} spellCheck={false} className="font-mono text-xs" {...p} {...form.register("parametersJson")} />}
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Effective from" error={err("effectiveFrom")}>
          {(p) => <Input type="date" min={taxYear.startsOn} max={taxYear.endsOn} {...p} {...form.register("effectiveFrom")} />}
        </Field>
        <Field label="Effective to" error={err("effectiveTo")} optional hint="Blank = until the end of the tax year">
          {(p) => <Input type="date" min={taxYear.startsOn} max={taxYear.endsOn} {...p} {...form.register("effectiveTo")} />}
        </Field>
        <Field label="Verification" error={err("verification")}>
          {(p) => (
            <select className={nativeSelectClass} {...p} {...form.register("verification")}>
              {VERIFICATION_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          )}
        </Field>
        <Field label="Supporting source" error={err("sourceId")}>
          {(p) => (
            <select className={nativeSelectClass} {...p} {...form.register("sourceId")}>
              <option value="">None</option>
              {sources.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.ref} — {s.title.slice(0, 60)}
                </option>
              ))}
            </select>
          )}
        </Field>
      </div>
      <Field label="Where in the source" error={err("sourceLocator")} optional hint="Section, paragraph or table">
        {(p) => <Input {...p} {...form.register("sourceLocator")} />}
      </Field>
      <Field label="Notes" error={err("notes")} optional>
        {(p) => <Textarea rows={2} {...p} {...form.register("notes")} />}
      </Field>
    </RecordDialog>
  );
}

/** Test a draft against the fixed scenarios, see old vs new tax, then activate or discard. */
export function DraftActions({ versionId, ruleName }: { versionId: string; ruleName: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [preview, setPreview] = useState<ScenarioPreview[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const runPreview = () =>
    startTransition(async () => {
      setError(null);
      const result = await previewDraftVersionAction(versionId);
      if (result.ok) setPreview(result.data.scenarios);
      else setError(result.error);
    });
  const finish = (action: typeof activateVersionAction) =>
    startTransition(async () => {
      const result = await action(versionId);
      if (result.ok) {
        toast.success(result.message ?? "Done.");
        setOpen(false);
        router.refresh();
      } else setError(result.error);
    });

  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        setOpen(value);
        if (value && !preview) runPreview();
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm">
          <FlaskConical aria-hidden /> Test &amp; activate
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Test draft: {ruleName}</DialogTitle>
          <DialogDescription>Total tax for each predefined scenario under the current rules and with this draft applied. Nothing is saved by running the test.</DialogDescription>
        </DialogHeader>
        {error && (
          <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}
        {!preview ? (
          <p className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" aria-hidden /> Running scenarios…
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="tabular w-full min-w-[30rem] text-sm">
              <thead className="text-left text-muted-foreground">
                <tr>
                  <th scope="col" className="py-2 font-medium">Scenario</th>
                  <th scope="col" className="py-2 text-right font-medium">Old result</th>
                  <th scope="col" className="py-2 text-right font-medium">New result</th>
                  <th scope="col" className="py-2 text-right font-medium">Difference</th>
                </tr>
              </thead>
              <tbody>
                {preview.map((s) => (
                  <tr key={s.id} className="border-t align-top">
                    <th scope="row" className="py-2 pr-3 text-left font-normal">{s.name}</th>
                    {s.error ? (
                      <td colSpan={3} className="py-2 text-right text-destructive">
                        {s.error}
                      </td>
                    ) : (
                      <>
                        <td className="py-2 text-right">{formatLKR(s.before ?? 0)}</td>
                        <td className="py-2 text-right">{formatLKR(s.after ?? 0)}</td>
                        <td className={`py-2 text-right font-medium ${s.difference ? "" : "text-muted-foreground"}`}>
                          {s.difference ? `${s.difference > 0 ? "+" : "−"}${formatLKR(Math.abs(s.difference))}` : "No change"}
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <DialogFooter className="gap-2">
          <Button variant="ghost" disabled={pending} onClick={() => finish(discardDraftAction)}>
            <Trash2 aria-hidden /> Discard draft
          </Button>
          <Button variant="outline" disabled={pending} onClick={runPreview}>
            Run again
          </Button>
          <Button disabled={pending || !preview || preview.some((s) => s.error)} onClick={() => finish(activateVersionAction)}>
            {pending ? <Loader2 className="animate-spin" aria-hidden /> : <Rocket aria-hidden />}
            Activate
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function SourceForm() {
  const form = useForm<FieldValues>({ defaultValues: { ref: "", title: "", authority: "Inland Revenue Department", url: "", documentType: "IRD_NOTICE", publicationDate: "", notes: "" } });
  const err = (name: string) => fieldError(form.formState.errors as Record<string, unknown>, name);
  return (
    <RecordDialog
      trigger={
        <Button variant="outline">
          <Plus aria-hidden /> Add source
        </Button>
      }
      title="Add a source"
      description="An act, gazette, circular, notice or guideline that tax rules can cite."
      form={form}
      schema={sourceSchema}
      action={createSourceAction}
      submitLabel="Add source"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Reference" error={err("ref")} hint="Short and unique, e.g. S14">
          {(p) => <Input className="uppercase" {...p} {...form.register("ref", { setValueAs: (v: string) => String(v ?? "").toUpperCase() })} />}
        </Field>
        <Field label="Document type" error={err("documentType")}>
          {(p) => (
            <select className={nativeSelectClass} {...p} {...form.register("documentType")}>
              {["ACT", "GAZETTE", "CIRCULAR", "GUIDELINE", "BILL", "IRD_NOTICE", "OTHER"].map((t) => (
                <option key={t} value={t}>
                  {t.replace("_", " ")}
                </option>
              ))}
            </select>
          )}
        </Field>
      </div>
      <Field label="Title" error={err("title")}>
        {(p) => <Input {...p} {...form.register("title")} />}
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Authority" error={err("authority")}>
          {(p) => <Input {...p} {...form.register("authority")} />}
        </Field>
        <Field label="Publication date" error={err("publicationDate")} optional>
          {(p) => <Input type="date" {...p} {...form.register("publicationDate")} />}
        </Field>
      </div>
      <Field label="URL" error={err("url")}>
        {(p) => <Input type="url" {...p} {...form.register("url")} />}
      </Field>
      <Field label="Notes" error={err("notes")} optional>
        {(p) => <Textarea rows={2} {...p} {...form.register("notes")} />}
      </Field>
    </RecordDialog>
  );
}

export function NewTaxYearForm({ suggested }: { suggested: string }) {
  const form = useForm<FieldValues>({ defaultValues: { code: suggested } });
  return (
    <RecordDialog
      trigger={
        <Button variant="outline">
          <Plus aria-hidden /> New tax year
        </Button>
      }
      title="Open a new tax year"
      description="Rules are copied from the previous year as drafts marked “requires verification”. Check each against that year's law, then activate it."
      form={form}
      schema={newTaxYearSchema}
      action={createTaxYearAction}
      submitLabel="Create tax year"
    >
      <Field label="Year of assessment" error={fieldError(form.formState.errors as Record<string, unknown>, "code")} hint="In the form 2027/2028">
        {(p) => <Input className="tabular" {...p} {...form.register("code")} />}
      </Field>
    </RecordDialog>
  );
}

export function DeadlineForm({ deadline }: { deadline: { id: string; title: string; dueOn: string; verification: string } }) {
  const form = useForm<FieldValues>({ defaultValues: { dueOn: deadline.dueOn, verification: deadline.verification } });
  const err = (name: string) => fieldError(form.formState.errors as Record<string, unknown>, name);
  return (
    <RecordDialog
      trigger={
        <Button variant="ghost" size="sm">
          Edit
        </Button>
      }
      title={`Edit ${deadline.title}`}
      form={form}
      schema={deadlineUpdateSchema}
      prepare={(values) => ({ ...values, id: deadline.id })}
      action={updateDeadlineAction}
      submitLabel="Save"
    >
      <Field label="Due date" error={err("dueOn")}>
        {(p) => <Input type="date" {...p} {...form.register("dueOn")} />}
      </Field>
      <Field label="Verification" error={err("verification")}>
        {(p) => (
          <select className={nativeSelectClass} {...p} {...form.register("verification")}>
            {VERIFICATION_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        )}
      </Field>
    </RecordDialog>
  );
}
