import { describe, expect, it } from "vitest";
import { ONBOARDING_COPY } from "./onboarding-copy";
import {
  ONBOARDING_USE_CASES,
  ONBOARDING_VOLUMES,
  onboardingSchema,
} from "./onboarding";

const valid = {
  name: "Toko Kita",
  domain: "tokokita.com",
  emailTypes: ["transactional"],
  monthlyVolume: "1000-3000",
  useCases: ["otp", "invoice"],
  language: "id",
};

function messages(input: unknown) {
  const result = onboardingSchema.safeParse(input);
  return result.success ? [] : result.error.issues.map((issue) => issue.message);
}

describe("onboardingSchema", () => {
  it("accepts a complete answer set", () => {
    expect(onboardingSchema.safeParse(valid).success).toBe(true);
  });

  it("trims the team name and domain", () => {
    const result = onboardingSchema.parse({
      ...valid,
      name: "  Toko Kita  ",
      domain: " tokokita.com ",
    });

    expect(result.name).toBe("Toko Kita");
    expect(result.domain).toBe("tokokita.com");
  });

  it("defaults the language to Indonesian", () => {
    const { language: _language, ...withoutLanguage } = valid;

    expect(onboardingSchema.parse(withoutLanguage).language).toBe("id");
  });

  it("rejects a short team name", () => {
    expect(messages({ ...valid, name: "a" })).toContain("name.min");
  });

  it("rejects domains with a scheme or path", () => {
    expect(messages({ ...valid, domain: "https://tokokita.com" })).toContain(
      "domain.invalid",
    );
    expect(messages({ ...valid, domain: "tokokita" })).toContain(
      "domain.invalid",
    );
  });

  it("requires at least one email type and one use case", () => {
    expect(messages({ ...valid, emailTypes: [] })).toContain("emailTypes.min");
    expect(messages({ ...valid, useCases: [] })).toContain("useCases.min");
  });

  it("rejects an unknown volume", () => {
    expect(messages({ ...valid, monthlyVolume: "a lot" })).toContain(
      "monthlyVolume.required",
    );
  });

  it("asks for a description when 'other' is selected", () => {
    expect(messages({ ...valid, useCases: ["other"] })).toContain(
      "otherUseCase.required",
    );
    expect(
      onboardingSchema.safeParse({
        ...valid,
        useCases: ["other"],
        otherUseCase: "class reminders",
      }).success,
    ).toBe(true);
  });
});

describe("onboarding copy", () => {
  it.each(["id", "en"] as const)(
    "has a label for every option and error code in %s",
    (language) => {
      const copy = ONBOARDING_COPY[language];

      for (const volume of ONBOARDING_VOLUMES) {
        expect(copy.monthlyVolume.options[volume]).toBeTruthy();
      }
      for (const useCase of ONBOARDING_USE_CASES) {
        expect(copy.useCases.options[useCase]).toBeTruthy();
      }

      const codes = [
        "name.min",
        "name.max",
        "domain.required",
        "domain.invalid",
        "emailTypes.min",
        "monthlyVolume.required",
        "useCases.min",
        "otherUseCase.required",
        "otherUseCase.max",
      ];
      for (const code of codes) {
        expect(copy.errors[code]).toBeTruthy();
      }
    },
  );
});
