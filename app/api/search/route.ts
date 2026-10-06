import { authed, json } from "@/lib/api";
import { search } from "@/services/search/search-service";

export const GET = authed("Search is unavailable right now.", async (request, user) =>
  json({ items: await search(user.id, request.nextUrl.searchParams.get("q") ?? "") }),
);
