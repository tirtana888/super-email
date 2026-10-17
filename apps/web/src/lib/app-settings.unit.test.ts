import { describe, expect, it } from "vitest";
import { APP_SETTING_KEYS, parseBooleanSetting } from "./app-settings";

describe("parseBooleanSetting", () => {
  it("is on only for the exact string true", () => {
    expect(parseBooleanSetting("true")).toBe(true);
  });

  it("is off when the setting is missing, so new switches start hidden", () => {
    expect(parseBooleanSetting(undefined)).toBe(false);
    expect(parseBooleanSetting(null)).toBe(false);
  });

  it("is off for false and for anything unexpected", () => {
    expect(parseBooleanSetting("false")).toBe(false);
    expect(parseBooleanSetting("")).toBe(false);
    expect(parseBooleanSetting("TRUE")).toBe(false);
    expect(parseBooleanSetting("1")).toBe(false);
  });
});

describe("APP_SETTING_KEYS", () => {
  it("keeps the feedback key stable because it is stored in the database", () => {
    expect(APP_SETTING_KEYS.FEEDBACK_ENABLED).toBe("feedback.enabled");
  });
});
