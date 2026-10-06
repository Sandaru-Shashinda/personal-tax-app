import { Fragment, type ReactNode } from "react";

export type RichTags = Record<string, (children: string) => ReactNode>;

/**
 * Renders the tags in a translated sentence — "<b>…</b>", "<a>…</a>" — as elements, so emphasis
 * and links can sit wherever each language's word order puts them. Tags do not nest.
 */
export function rich(text: string, tags: RichTags): ReactNode {
  const parts: ReactNode[] = [];
  const pattern = /<(\w+)>([\s\S]*?)<\/\1>/g;
  let last = 0;
  for (let match = pattern.exec(text); match; match = pattern.exec(text)) {
    if (match.index > last) parts.push(text.slice(last, match.index));
    const render = tags[match[1]];
    parts.push(<Fragment key={match.index}>{render ? render(match[2]) : match[2]}</Fragment>);
    last = match.index + match[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}
