import type { Locale } from "../config";
import type { Catalog } from "../translate";
import * as si from "./si";
import * as ta from "./ta";

/**
 * `client` is the part sent to the browser for Client Components; `all` adds the text that only
 * Server Components render. English is the source text itself, so it has no catalog.
 */
export const catalogs: Partial<Record<Locale, { client: Catalog; all: Catalog }>> = { si, ta };
