import type {
  ONBOARDING_EMAIL_TYPES,
  ONBOARDING_USE_CASES,
  ONBOARDING_VOLUMES,
  OnboardingLanguage,
} from "./onboarding";

type OnboardingCopy = {
  title: string;
  subtitle: string;
  freeNote: string;
  name: { label: string; placeholder: string };
  domain: { label: string; placeholder: string; hint: string };
  emailTypes: {
    label: string;
    options: Record<(typeof ONBOARDING_EMAIL_TYPES)[number], string>;
  };
  monthlyVolume: {
    label: string;
    placeholder: string;
    options: Record<(typeof ONBOARDING_VOLUMES)[number], string>;
  };
  useCases: {
    label: string;
    placeholder: string;
    selected: (count: number) => string;
    options: Record<(typeof ONBOARDING_USE_CASES)[number], string>;
  };
  otherUseCase: { label: string; placeholder: string };
  submit: string;
  submitting: string;
  errors: Record<string, string>;
  genericError: string;
};

export const ONBOARDING_COPY: Record<OnboardingLanguage, OnboardingCopy> = {
  id: {
    title: "Selamat datang di F14",
    subtitle:
      "Ceritakan sedikit tentang rencana pengiriman emailmu. Akunmu langsung aktif di paket Free.",
    freeNote: "Paket Free sudah termasuk. Upgrade kapan saja saat dibutuhkan.",
    name: { label: "Nama tim", placeholder: "Contoh: Toko Kita" },
    domain: {
      label: "Domain utama",
      placeholder: "tokokita.com",
      hint: "Domain yang akan dipakai sebagai pengirim email.",
    },
    emailTypes: {
      label: "Jenis email",
      options: { transactional: "Transaksional", marketing: "Marketing" },
    },
    monthlyVolume: {
      label: "Perkiraan email per bulan",
      placeholder: "Pilih perkiraan volume",
      options: {
        "0-1000": "0 - 1.000",
        "1000-3000": "1.000 - 3.000 (batas paket Free)",
        "3000-10000": "3.000 - 10.000",
        "10000-50000": "10.000 - 50.000",
        "50000-100000": "50.000 - 100.000",
        "100000+": "Lebih dari 100.000",
        unknown: "Belum tahu",
      },
    },
    useCases: {
      label: "Untuk apa emailnya?",
      placeholder: "Pilih satu atau lebih",
      selected: (count) => `${count} dipilih`,
      options: {
        otp: "OTP & verifikasi akun",
        transactional: "Notifikasi transaksi",
        invoice: "Invoice & struk",
        marketing: "Newsletter & promosi",
        alerts: "Alert sistem",
        other: "Lainnya",
      },
    },
    otherUseCase: {
      label: "Jelaskan singkat",
      placeholder: "Contoh: notifikasi jadwal kelas",
    },
    submit: "Mulai pakai F14",
    submitting: "Menyiapkan akun...",
    errors: {
      "name.min": "Nama tim minimal 2 karakter.",
      "name.max": "Nama tim maksimal 100 karakter.",
      "domain.required": "Domain wajib diisi.",
      "domain.invalid": "Masukkan domain yang valid, misalnya tokokita.com.",
      "emailTypes.min": "Pilih minimal satu jenis email.",
      "monthlyVolume.required": "Pilih perkiraan volume email.",
      "useCases.min": "Pilih minimal satu kebutuhan.",
      "otherUseCase.required": "Jelaskan kebutuhan lainnya.",
      "otherUseCase.max": "Maksimal 300 karakter.",
    },
    genericError: "Terjadi kesalahan. Coba lagi.",
  },
  en: {
    title: "Welcome to F14",
    subtitle:
      "Tell us a little about how you plan to send email. Your account starts on the Free plan right away.",
    freeNote: "The Free plan is included. Upgrade whenever you need more.",
    name: { label: "Team name", placeholder: "e.g. Acme Store" },
    domain: {
      label: "Primary domain",
      placeholder: "acme.com",
      hint: "The domain you will send email from.",
    },
    emailTypes: {
      label: "Email type",
      options: { transactional: "Transactional", marketing: "Marketing" },
    },
    monthlyVolume: {
      label: "Expected emails per month",
      placeholder: "Select an estimate",
      options: {
        "0-1000": "0 - 1,000",
        "1000-3000": "1,000 - 3,000 (Free plan limit)",
        "3000-10000": "3,000 - 10,000",
        "10000-50000": "10,000 - 50,000",
        "50000-100000": "50,000 - 100,000",
        "100000+": "More than 100,000",
        unknown: "Not sure yet",
      },
    },
    useCases: {
      label: "What will you use it for?",
      placeholder: "Select one or more",
      selected: (count) => `${count} selected`,
      options: {
        otp: "OTP & account verification",
        transactional: "Transaction notifications",
        invoice: "Invoices & receipts",
        marketing: "Newsletters & promotions",
        alerts: "System alerts",
        other: "Other",
      },
    },
    otherUseCase: {
      label: "Briefly describe",
      placeholder: "e.g. class schedule reminders",
    },
    submit: "Start using F14",
    submitting: "Setting up your account...",
    errors: {
      "name.min": "Team name must be at least 2 characters.",
      "name.max": "Team name must be 100 characters or fewer.",
      "domain.required": "Domain is required.",
      "domain.invalid": "Enter a valid domain, for example acme.com.",
      "emailTypes.min": "Select at least one email type.",
      "monthlyVolume.required": "Select an expected volume.",
      "useCases.min": "Select at least one use case.",
      "otherUseCase.required": "Describe your other use case.",
      "otherUseCase.max": "Maximum 300 characters.",
    },
    genericError: "Something went wrong. Please try again.",
  },
};
