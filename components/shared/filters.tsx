import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getT } from "@/lib/i18n/server";
import { nativeSelectClass } from "./form-classes";

export interface FilterSelect {
  name: string;
  label: string;
  value?: string;
  options: { value: string; label: string }[];
}

/**
 * A GET form: filters live in the URL, so they are applied on the server, survive a reload
 * and work without JavaScript.
 */
export async function FilterBar({ action, q, placeholder, selects = [] }: { action: string; q?: string; placeholder: string; selects?: FilterSelect[] }) {
  const t = await getT();
  return (
    <form action={action} method="get" role="search" className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <div className="relative flex-1">
        <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <Input type="search" name="q" defaultValue={q} placeholder={placeholder} aria-label={placeholder} className="pl-8" />
      </div>
      {selects.map((select) => (
        <select key={select.name} name={select.name} defaultValue={select.value ?? ""} aria-label={select.label} className={`${nativeSelectClass} sm:w-48`}>
          <option value="">{t("{label}: all", { label: select.label })}</option>
          {select.options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      ))}
      <Button type="submit" variant="outline">
        {t("Apply")}
      </Button>
    </form>
  );
}
