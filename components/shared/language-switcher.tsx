"use client";

import { Check, Languages } from "lucide-react";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useLocale, useT } from "@/lib/i18n/client";
import { LOCALE_NAMES, LOCALES, splitLocale } from "@/lib/i18n/config";

/**
 * Switches language by visiting the page's address under the chosen language's prefix. The
 * proxy saves the choice and either serves the page there (public pages) or returns to the
 * unprefixed address. A full navigation, so every component picks up the new language.
 */
export function LanguageSwitcher() {
  const t = useT();
  const locale = useLocale();
  const { path } = splitLocale(usePathname());
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={t("Change language")}>
          <Languages aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        {LOCALES.map((code) => (
          // A document navigation on purpose: the proxy has to see the request to save the choice.
          // eslint-disable-next-line @next/next/no-location-assign-relative-destination
          <DropdownMenuItem key={code} lang={code} onSelect={() => window.location.assign(`/${code}${path === "/" ? "" : path}${window.location.search}`)}>
            <span className="flex-1">{LOCALE_NAMES[code]}</span>
            {code === locale && <Check className="size-4" aria-hidden />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
