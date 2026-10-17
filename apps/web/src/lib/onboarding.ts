import { z } from "zod";

export const ONBOARDING_LANGUAGES = ["id", "en"] as const;
export type OnboardingLanguage = (typeof ONBOARDING_LANGUAGES)[number];

export const ONBOARDING_EMAIL_TYPES = ["transactional", "marketing"] as const;

export const ONBOARDING_VOLUMES = [
  "0-1000",
  "1000-3000",
  "3000-10000",
  "10000-50000",
  "50000-100000",
  "100000+",
  "unknown",
] as const;

export const ONBOARDING_USE_CASES = [
  "otp",
  "transactional",
  "invoice",
  "marketing",
  "alerts",
  "other",
] as const;

const DOMAIN_REGEX = /^(?!:\/\/)([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}$/;

// The messages below are error codes; the form translates them for the user.
export const onboardingSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, "name.min")
      .max(100, "name.max"),
    domain: z
      .string()
      .trim()
      .min(1, "domain.required")
      .max(255, "domain.invalid")
      .regex(DOMAIN_REGEX, "domain.invalid"),
    emailTypes: z.array(z.enum(ONBOARDING_EMAIL_TYPES)).min(1, "emailTypes.min"),
    monthlyVolume: z.enum(ONBOARDING_VOLUMES, {
      errorMap: () => ({ message: "monthlyVolume.required" }),
    }),
    useCases: z.array(z.enum(ONBOARDING_USE_CASES)).min(1, "useCases.min"),
    otherUseCase: z.string().trim().max(300, "otherUseCase.max").optional(),
    language: z.enum(ONBOARDING_LANGUAGES).default("id"),
  })
  .superRefine((value, ctx) => {
    if (value.useCases.includes("other") && !value.otherUseCase) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["otherUseCase"],
        message: "otherUseCase.required",
      });
    }
  });

export type OnboardingInput = z.infer<typeof onboardingSchema>;
export type OnboardingFormValues = z.input<typeof onboardingSchema>;
