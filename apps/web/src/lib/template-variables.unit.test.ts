import { describe, expect, it } from "vitest";
import { extractTemplateVariables, templateSendExample } from "./template-variables";

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
