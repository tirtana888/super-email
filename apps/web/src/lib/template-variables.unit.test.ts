import { describe, expect, it } from "vitest";
import {
  extractTemplateVariables,
  templateSendExample,
  templateSendSnippet,
} from "./template-variables";

describe("extractTemplateVariables", () => {
  it("finds variables in the subject and the body, in order, without duplicates", () => {
    expect(
      extractTemplateVariables(
        "Kode OTP Anda: {{otp}}",
        "<p>Halo {{name}}, kode Anda {{otp}}.</p>",
      ),
    ).toEqual(["otp", "name"]);
  });

  it("reads the editor's fallback form and link hrefs", () => {
    expect(
      extractTemplateVariables(
        null,
        '<p>Hi {{first_name,fallback=there}}</p><a href="{{reset_url}}">Reset</a>',
      ),
    ).toEqual(["first_name", "reset_url"]);
  });

  it("tolerates spaces inside the braces and ignores empty or malformed ones", () => {
    expect(extractTemplateVariables("{{ invoice_no }} {{}} {{ }} {{a b}} {name}")).toEqual([
      "invoice_no",
    ]);
  });

  it("returns nothing for missing input", () => {
    expect(extractTemplateVariables(undefined, null, "")).toEqual([]);
  });
});

describe("templateSendExample", () => {
  it("builds a request body with one placeholder per variable", () => {
    expect(
      JSON.parse(templateSendExample({ templateId: "tpl_1", variables: ["otp", "name"] })),
    ).toEqual({
      from: "you@your-domain.com",
      to: "user@example.com",
      templateId: "tpl_1",
      variables: { otp: "<otp>", name: "<name>" },
    });
  });
});

describe("templateSendSnippet", () => {
  const input = { baseUrl: "https://app.f14.dev", templateId: "tpl_1", variables: ["otp"] };

  it("posts to the emails endpoint with a bearer key in every language", () => {
    for (const language of ["curl", "node", "python", "php"] as const) {
      const code = templateSendSnippet(language, input);
      expect(code).toContain("https://app.f14.dev/api/v1/emails");
      expect(code).toContain("Bearer YOUR_API_KEY");
      expect(code).toContain("tpl_1");
      expect(code).toContain("otp");
    }
  });

  it("produces a cURL body that is valid JSON", () => {
    const code = templateSendSnippet("curl", input);
    const body = code.slice(code.indexOf("-d '") + 4, code.lastIndexOf("'"));
    expect(JSON.parse(body)).toEqual({
      from: "you@your-domain.com",
      to: "user@example.com",
      templateId: "tpl_1",
      variables: { otp: "<otp>" },
    });
  });

  it("sends an empty variables object when the template has none", () => {
    expect(templateSendSnippet("php", { ...input, variables: [] })).toContain("'variables' => (object) []");
    expect(templateSendSnippet("python", { ...input, variables: [] })).toContain('"variables": {}');
  });
});
