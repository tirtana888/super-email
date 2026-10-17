"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Check, ChevronDown } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from "@usesend/ui/src/form";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@usesend/ui/src/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@usesend/ui/src/select";
import Spinner from "@usesend/ui/src/spinner";
import { toast } from "@usesend/ui/src/toaster";
import JoinTeam from "~/components/team/JoinTeam";
import {
  ONBOARDING_EMAIL_TYPES,
  ONBOARDING_LANGUAGES,
  ONBOARDING_USE_CASES,
  ONBOARDING_VOLUMES,
  onboardingSchema,
  type OnboardingFormValues,
  type OnboardingInput,
  type OnboardingLanguage,
} from "~/lib/onboarding";
import { ONBOARDING_COPY } from "~/lib/onboarding-copy";
import { api } from "~/trpc/react";

const LANGUAGE_STORAGE_KEY = "f14.language";

const inputClass =
  "h-11 w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 text-sm text-white placeholder:text-zinc-500 focus:border-white/30 focus:outline-none focus:ring-2 focus:ring-white/10";

const overlayClass = "dark border-white/10 bg-zinc-950 text-white";

function readStoredLanguage(): OnboardingLanguage {
  try {
    const stored = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (stored === "id" || stored === "en") {
      return stored;
    }
  } catch {
    // Storage can be unavailable (private windows); fall back to the browser language.
  }

  return window.navigator.language.toLowerCase().startsWith("id") ? "id" : "en";
}

export default function OnboardingForm() {
  const [language, setLanguage] = useState<OnboardingLanguage>("id");
  const [useCasesOpen, setUseCasesOpen] = useState(false);
  const copy = ONBOARDING_COPY[language];

  const router = useRouter();
  const utils = api.useUtils();
  const completeOnboarding = api.team.completeOnboarding.useMutation();

  const form = useForm<OnboardingFormValues, unknown, OnboardingInput>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: {
      name: "",
      domain: "",
      emailTypes: ["transactional"],
      useCases: [],
      otherUseCase: "",
      language: "id",
    },
  });

  useEffect(() => {
    const initial = readStoredLanguage();
    setLanguage(initial);
    form.setValue("language", initial);
  }, [form]);

  function changeLanguage(next: OnboardingLanguage) {
    setLanguage(next);
    form.setValue("language", next);
    try {
      window.localStorage.setItem(LANGUAGE_STORAGE_KEY, next);
    } catch {
      // Remembering the language is a convenience only.
    }
  }

  function errorText(message?: string) {
    if (!message) {
      return null;
    }

    return copy.errors[message] ?? copy.genericError;
  }

  function onSubmit(values: OnboardingInput) {
    completeOnboarding.mutate(
      {
        ...values,
        otherUseCase: values.useCases.includes("other")
          ? values.otherUseCase
          : undefined,
      },
      {
        onSuccess: async () => {
          await utils.team.invalidate();
          router.replace("/dashboard");
        },
        onError: (error) => {
          toast.error(error.message || copy.genericError);
        },
      },
    );
  }

  const selectedUseCases = form.watch("useCases") ?? [];
  const errors = form.formState.errors;

  return (
    <main className="dark relative flex min-h-screen items-center justify-center overflow-hidden bg-[#09090b] px-4 py-12 text-white">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[420px] bg-[radial-gradient(ellipse_at_top,rgba(255,255,255,0.08),transparent_70%)]"
      />
      <div className="relative z-10 flex w-full max-w-[460px] flex-col gap-8">
        <div className="flex items-start justify-between">
          <Image
            src="/logo-squircle.png"
            alt="F14"
            width={44}
            height={44}
            className="rounded-xl"
            priority
          />
          <div
            role="group"
            aria-label="Language"
            className="flex rounded-lg border border-white/10 p-0.5 text-xs"
          >
            {ONBOARDING_LANGUAGES.map((code) => (
              <button
                key={code}
                type="button"
                aria-pressed={language === code}
                onClick={() => changeLanguage(code)}
                className={`rounded-md px-3 py-1 font-medium uppercase transition-colors ${
                  language === code
                    ? "bg-white text-zinc-950"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                {code}
              </button>
            ))}
          </div>
        </div>

        <JoinTeam showCreateTeam />

        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {copy.title}
          </h1>
          <p className="mt-2 text-sm text-zinc-400">{copy.subtitle}</p>
        </div>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex flex-col gap-5"
            noValidate
          >
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem className="space-y-2">
                  <FormLabel className="text-sm font-medium text-zinc-300">
                    {copy.name.label}
                  </FormLabel>
                  <FormControl>
                    <input
                      className={inputClass}
                      placeholder={copy.name.placeholder}
                      autoComplete="organization"
                      {...field}
                    />
                  </FormControl>
                  <p className="text-sm text-red-400">
                    {errorText(errors.name?.message)}
                  </p>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="domain"
              render={({ field }) => (
                <FormItem className="space-y-2">
                  <FormLabel className="text-sm font-medium text-zinc-300">
                    {copy.domain.label}
                  </FormLabel>
                  <FormControl>
                    <input
                      className={inputClass}
                      placeholder={copy.domain.placeholder}
                      autoCapitalize="none"
                      autoCorrect="off"
                      {...field}
                    />
                  </FormControl>
                  {errors.domain ? (
                    <p className="text-sm text-red-400">
                      {errorText(errors.domain.message)}
                    </p>
                  ) : (
                    <p className="text-xs text-zinc-500">{copy.domain.hint}</p>
                  )}
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="emailTypes"
              render={({ field }) => (
                <FormItem className="space-y-2">
                  <FormLabel className="text-sm font-medium text-zinc-300">
                    {copy.emailTypes.label}
                  </FormLabel>
                  <div className="flex gap-2">
                    {ONBOARDING_EMAIL_TYPES.map((type) => {
                      const active = field.value?.includes(type) ?? false;
                      return (
                        <button
                          key={type}
                          type="button"
                          aria-pressed={active}
                          onClick={() =>
                            field.onChange(
                              active
                                ? field.value.filter((item) => item !== type)
                                : [...(field.value ?? []), type],
                            )
                          }
                          className={`h-10 flex-1 rounded-lg border text-sm font-medium transition-colors ${
                            active
                              ? "border-white bg-white text-zinc-950"
                              : "border-white/10 bg-white/[0.03] text-zinc-300 hover:bg-white/[0.08]"
                          }`}
                        >
                          {copy.emailTypes.options[type]}
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-sm text-red-400">
                    {errorText(errors.emailTypes?.message)}
                  </p>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="monthlyVolume"
              render={({ field }) => (
                <FormItem className="space-y-2">
                  <FormLabel className="text-sm font-medium text-zinc-300">
                    {copy.monthlyVolume.label}
                  </FormLabel>
                  <Select
                    value={field.value ?? ""}
                    onValueChange={field.onChange}
                  >
                    <FormControl>
                      <SelectTrigger
                        className={`${inputClass} flex items-center justify-between`}
                      >
                        <SelectValue
                          placeholder={copy.monthlyVolume.placeholder}
                        />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className={overlayClass}>
                      {ONBOARDING_VOLUMES.map((volume) => (
                        <SelectItem key={volume} value={volume}>
                          {copy.monthlyVolume.options[volume]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-red-400">
                    {errorText(errors.monthlyVolume?.message)}
                  </p>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="useCases"
              render={({ field }) => (
                <FormItem className="space-y-2">
                  <FormLabel className="text-sm font-medium text-zinc-300">
                    {copy.useCases.label}
                  </FormLabel>
                  <Popover open={useCasesOpen} onOpenChange={setUseCasesOpen}>
                    <PopoverTrigger asChild>
                      <button
                        type="button"
                        className={`${inputClass} flex items-center justify-between text-left`}
                      >
                        <span
                          className={
                            selectedUseCases.length ? "" : "text-zinc-500"
                          }
                        >
                          {selectedUseCases.length
                            ? copy.useCases.selected(selectedUseCases.length)
                            : copy.useCases.placeholder}
                        </span>
                        <ChevronDown className="h-4 w-4 text-zinc-500" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent
                      align="start"
                      className={`${overlayClass} w-[var(--radix-popover-trigger-width)] p-1`}
                    >
                      {ONBOARDING_USE_CASES.map((useCase) => {
                        const checked = field.value?.includes(useCase) ?? false;
                        return (
                          <button
                            key={useCase}
                            type="button"
                            role="checkbox"
                            aria-checked={checked}
                            onClick={() =>
                              field.onChange(
                                checked
                                  ? field.value.filter(
                                      (item) => item !== useCase,
                                    )
                                  : [...(field.value ?? []), useCase],
                              )
                            }
                            className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm hover:bg-white/[0.08]"
                          >
                            <span
                              className={`flex h-4 w-4 items-center justify-center rounded border ${
                                checked
                                  ? "border-white bg-white text-zinc-950"
                                  : "border-white/30"
                              }`}
                            >
                              {checked ? <Check className="h-3 w-3" /> : null}
                            </span>
                            {copy.useCases.options[useCase]}
                          </button>
                        );
                      })}
                    </PopoverContent>
                  </Popover>
                  <p className="text-sm text-red-400">
                    {errorText(errors.useCases?.message)}
                  </p>
                </FormItem>
              )}
            />

            {selectedUseCases.includes("other") ? (
              <FormField
                control={form.control}
                name="otherUseCase"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <FormLabel className="text-sm font-medium text-zinc-300">
                      {copy.otherUseCase.label}
                    </FormLabel>
                    <FormControl>
                      <input
                        className={inputClass}
                        placeholder={copy.otherUseCase.placeholder}
                        {...field}
                        value={field.value ?? ""}
                      />
                    </FormControl>
                    <p className="text-sm text-red-400">
                      {errorText(errors.otherUseCase?.message)}
                    </p>
                  </FormItem>
                )}
              />
            ) : null}

            <button
              type="submit"
              disabled={completeOnboarding.isPending}
              className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-white px-4 text-sm font-medium text-zinc-950 transition-colors hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {completeOnboarding.isPending ? (
                <>
                  <Spinner className="h-4 w-4" />
                  {copy.submitting}
                </>
              ) : (
                copy.submit
              )}
            </button>
            <p className="text-center text-xs text-zinc-500">
              {copy.freeNote}
            </p>
          </form>
        </Form>
      </div>
    </main>
  );
}
