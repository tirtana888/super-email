export const APP_SETTING_KEYS = {
  FEEDBACK_ENABLED: "feedback.enabled",
} as const;

export type AppSettingKey =
  (typeof APP_SETTING_KEYS)[keyof typeof APP_SETTING_KEYS];

/** A setting counts as on only when it is stored as exactly "true". Anything else is off. */
export function parseBooleanSetting(value: string | null | undefined): boolean {
  return value === "true";
}
