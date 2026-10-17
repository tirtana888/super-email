import { describe, expect, it } from "vitest";
import {
  AWS_REGIONS,
  formatAwsRegionLabel,
  getAwsRegionInfo,
} from "./aws-regions";

describe("formatAwsRegionLabel", () => {
  it("shows the city with the region code", () => {
    expect(formatAwsRegionLabel("ap-northeast-1")).toBe("Tokyo (ap-northeast-1)");
    expect(formatAwsRegionLabel("ap-southeast-3")).toBe("Jakarta (ap-southeast-3)");
    expect(formatAwsRegionLabel("us-east-1")).toBe("North Virginia (us-east-1)");
  });

  it("falls back to the plain code for regions it does not know", () => {
    expect(formatAwsRegionLabel("xx-future-9")).toBe("xx-future-9");
  });
});

describe("getAwsRegionInfo", () => {
  it("is case and whitespace tolerant", () => {
    expect(getAwsRegionInfo("  US-East-1 ")?.country).toBe("US");
  });

  it("returns null for unknown regions", () => {
    expect(getAwsRegionInfo("nowhere-1")).toBeNull();
  });

  it("gives every region a two-letter country code", () => {
    for (const [region, info] of Object.entries(AWS_REGIONS)) {
      expect(/^[A-Z]{2}$/.test(info.country)).toBe(true);
      expect(info.name.length > 0).toBe(true);
      expect(/^[a-z]{2}-[a-z]+-\d$/.test(region)).toBe(true);
    }
  });
});
