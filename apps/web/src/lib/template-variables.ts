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

export type SnippetLanguage = "curl" | "node" | "python" | "php";

export const SNIPPET_LANGUAGES: Array<{ id: SnippetLanguage; label: string }> = [
  { id: "curl", label: "cURL" },
  { id: "node", label: "Node.js" },
  { id: "python", label: "Python" },
  { id: "php", label: "PHP" },
];

const API_KEY_PLACEHOLDER = "YOUR_API_KEY";

function indent(text: string, spaces: number) {
  const pad = " ".repeat(spaces);
  return text
    .split("\n")
    .map((line, i) => (i === 0 ? line : pad + line))
    .join("\n");
}

/**
 * Plain HTTP examples for POST /api/v1/emails with a template, so they work
 * without installing an SDK. The API key goes in the Authorization header.
 */
export function templateSendSnippet(
  language: SnippetLanguage,
  {
    baseUrl,
    templateId,
    variables,
  }: { baseUrl: string; templateId: string; variables: string[] },
) {
  const url = `${baseUrl}/api/v1/emails`;
  const body = JSON.parse(templateSendExample({ templateId, variables })) as {
    from: string;
    to: string;
    templateId: string;
    variables: Record<string, string>;
  };
  const json = JSON.stringify(body, null, 2);

  switch (language) {
    case "curl":
      return [
        `curl -X POST ${url} \\`,
        `  -H "Authorization: Bearer ${API_KEY_PLACEHOLDER}" \\`,
        `  -H "Content-Type: application/json" \\`,
        `  -d '${json.replace(/'/g, "'\\''")}'`,
      ].join("\n");

    case "node":
      return [
        `const response = await fetch("${url}", {`,
        `  method: "POST",`,
        `  headers: {`,
        `    Authorization: "Bearer ${API_KEY_PLACEHOLDER}",`,
        `    "Content-Type": "application/json",`,
        `  },`,
        `  body: JSON.stringify(${indent(json, 2)}),`,
        `});`,
        ``,
        `console.log(await response.json());`,
      ].join("\n");

    case "python": {
      const vars = Object.entries(body.variables);
      const pyVars = vars.length
        ? `{\n${vars.map(([k, v]) => `        "${k}": "${v}",`).join("\n")}\n    }`
        : "{}";
      return [
        `import requests`,
        ``,
        `response = requests.post(`,
        `    "${url}",`,
        `    headers={"Authorization": "Bearer ${API_KEY_PLACEHOLDER}"},`,
        `    json={`,
        `        "from": "${body.from}",`,
        `        "to": "${body.to}",`,
        `        "templateId": "${body.templateId}",`,
        `        "variables": ${indent(pyVars, 4)},`,
        `    },`,
        `)`,
        ``,
        `print(response.json())`,
      ].join("\n");
    }

    case "php": {
      const vars = Object.entries(body.variables);
      const phpVars = vars.length
        ? `[\n${vars.map(([k, v]) => `        '${k}' => '${v}',`).join("\n")}\n    ]`
        : "(object) []";
      return [
        `$ch = curl_init('${url}');`,
        `curl_setopt_array($ch, [`,
        `    CURLOPT_POST => true,`,
        `    CURLOPT_RETURNTRANSFER => true,`,
        `    CURLOPT_HTTPHEADER => [`,
        `        'Authorization: Bearer ${API_KEY_PLACEHOLDER}',`,
        `        'Content-Type: application/json',`,
        `    ],`,
        `    CURLOPT_POSTFIELDS => json_encode([`,
        `        'from' => '${body.from}',`,
        `        'to' => '${body.to}',`,
        `        'templateId' => '${body.templateId}',`,
        `        'variables' => ${indent(phpVars, 4)},`,
        `    ]),`,
        `]);`,
        ``,
        `echo curl_exec($ch);`,
      ].join("\n");
    }
  }
}
