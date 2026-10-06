"use client";

import { Loader2, Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Field, FormError, nativeSelectClass } from "@/components/shared/form";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { DOCUMENT_CATEGORIES, DOCUMENT_CATEGORY_LABELS } from "@/lib/validation/records";
import { useT } from "@/lib/i18n/client";

const MAX_BYTES = 10 * 1024 * 1024;
const ACCEPT = "application/pdf,image/png,image/jpeg,image/webp";

export function UploadForm({ taxYear, sources }: { taxYear: string; sources: { id: string; name: string }[] }) {
  const t = useT();
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const file = data.get("file");
    setFieldErrors({});
    if (!(file instanceof File) || file.size === 0) return setError(t("Choose a file to upload."));
    if (file.size > MAX_BYTES) return setError(t("Files can be up to 10 MB."));
    if (!data.get("title")) data.set("title", file.name.replace(/\.[^.]+$/, ""));
    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/documents", { method: "POST", body: data });
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string; fieldErrors?: Record<string, string[]> } | null;
        setFieldErrors(body?.fieldErrors ?? {});
        setError(body?.error ?? t("We couldn't upload this document. Please try again."));
        return;
      }
      toast.success(t("Document uploaded."));
      formRef.current?.reset();
      setOpen(false);
      router.refresh();
    } catch {
      setError("We couldn't reach the server. Check your connection and try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Upload aria-hidden /> {t("Upload document")}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("Upload a document")}</DialogTitle>
          <DialogDescription>{t("PDF, PNG, JPEG or WebP, up to 10 MB. Stored privately; only you can open it.")}</DialogDescription>
        </DialogHeader>
        <form ref={formRef} onSubmit={onSubmit} className="space-y-4" noValidate>
          <FormError message={error} />
          <Field label={t("File")} error={fieldErrors.file?.[0]}>
            {(p) => <Input type="file" name="file" accept={ACCEPT} required {...p} />}
          </Field>
          <Field label={t("Title")} error={fieldErrors.title?.[0]} optional hint={t("Defaults to the file name")}>
            {(p) => <Input name="title" maxLength={200} {...p} />}
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t("Category")} error={fieldErrors.category?.[0]}>
              {(p) => (
                <select name="category" defaultValue="RECEIPT" className={nativeSelectClass} {...p}>
                  {DOCUMENT_CATEGORIES.map((category) => (
                    <option key={category} value={category}>
                      {t(DOCUMENT_CATEGORY_LABELS[category])}
                    </option>
                  ))}
                </select>
              )}
            </Field>
            <Field label={t("Related income source")} error={fieldErrors.incomeSourceId?.[0]} optional>
              {(p) => (
                <select name="incomeSourceId" defaultValue="" className={nativeSelectClass} {...p}>
                  <option value="">{t("None")}</option>
                  {sources.map((source) => (
                    <option key={source.id} value={source.id}>
                      {source.name}
                    </option>
                  ))}
                </select>
              )}
            </Field>
          </div>
          <label className="flex items-center gap-2.5 text-sm">
            <input type="checkbox" name="taxYear" value={taxYear} defaultChecked className="size-4 accent-primary" />
            {t("File under tax year {year}", { year: taxYear })}
          </label>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              {t("Cancel")}
            </Button>
            <Button type="submit" disabled={pending}>
              {pending && <Loader2 className="animate-spin" aria-hidden />}
              {t("Upload")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
