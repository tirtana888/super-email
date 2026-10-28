// Variables appear as {{name}} in a template subject, and as {{name}} or
// {{name,fallback=Value}} in the HTML the editor saves (text and link hrefs).
const VARIABLE_PATTERN = /\{\{\s*([^{},\s]+)\s*(?:,\s*fallback=[^}]*)?\}\}/g;

/**
 * The variable names a template uses, in order of first appearance and without
 * duplicates. These are the keys to pass in `variables` when sending with the
 * template ID.
 */
export function extractTemplateVariables(
  ...sources: Array<string | null | undefined>
): string[] {
  const seen = new Set<string>();
  for (const source of sources) {
    if (!source) continue;
    for (const match of source.matchAll(VARIABLE_PATTERN)) {
      const name = match[1];
      if (name) seen.add(name);
    }
  }
  return [...seen];
}

/** Example request body for sending with a template, for the API snippet. */
export function templateSendExample({
  templateId,
  variables,
  from = "you@your-domain.com",
  to = "user@example.com",
}: {
  templateId: string;
  variables: string[];
  from?: string;
  to?: string;
}) {
  return JSON.stringify(
    {
      from,
      to,
      templateId,
      variables: Object.fromEntries(variables.map((name) => [name, `<${name}>`])),
    },
    null,
    2,
  );
}
