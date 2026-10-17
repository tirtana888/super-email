export type AwsRegionInfo = {
  /** City or area shown to users, like "Tokyo". */
  name: string;
  /** ISO 3166-1 alpha-2 country code, used to pick the flag. */
  country: string;
  countryName: string;
};

export const AWS_REGIONS: Record<string, AwsRegionInfo> = {
  "us-east-1": { name: "North Virginia", country: "US", countryName: "United States" },
  "us-east-2": { name: "Ohio", country: "US", countryName: "United States" },
  "us-west-1": { name: "North California", country: "US", countryName: "United States" },
  "us-west-2": { name: "Oregon", country: "US", countryName: "United States" },
  "ca-central-1": { name: "Montréal", country: "CA", countryName: "Canada" },
  "ca-west-1": { name: "Calgary", country: "CA", countryName: "Canada" },
  "mx-central-1": { name: "Mexico", country: "MX", countryName: "Mexico" },
  "sa-east-1": { name: "São Paulo", country: "BR", countryName: "Brazil" },
  "eu-west-1": { name: "Ireland", country: "IE", countryName: "Ireland" },
  "eu-west-2": { name: "London", country: "GB", countryName: "United Kingdom" },
  "eu-west-3": { name: "Paris", country: "FR", countryName: "France" },
  "eu-central-1": { name: "Frankfurt", country: "DE", countryName: "Germany" },
  "eu-central-2": { name: "Zurich", country: "CH", countryName: "Switzerland" },
  "eu-north-1": { name: "Stockholm", country: "SE", countryName: "Sweden" },
  "eu-south-1": { name: "Milan", country: "IT", countryName: "Italy" },
  "eu-south-2": { name: "Spain", country: "ES", countryName: "Spain" },
  "il-central-1": { name: "Tel Aviv", country: "IL", countryName: "Israel" },
  "me-south-1": { name: "Bahrain", country: "BH", countryName: "Bahrain" },
  "me-central-1": { name: "UAE", country: "AE", countryName: "United Arab Emirates" },
  "af-south-1": { name: "Cape Town", country: "ZA", countryName: "South Africa" },
  "ap-south-1": { name: "Mumbai", country: "IN", countryName: "India" },
  "ap-south-2": { name: "Hyderabad", country: "IN", countryName: "India" },
  "ap-east-1": { name: "Hong Kong", country: "HK", countryName: "Hong Kong" },
  "ap-northeast-1": { name: "Tokyo", country: "JP", countryName: "Japan" },
  "ap-northeast-2": { name: "Seoul", country: "KR", countryName: "South Korea" },
  "ap-northeast-3": { name: "Osaka", country: "JP", countryName: "Japan" },
  "ap-southeast-1": { name: "Singapore", country: "SG", countryName: "Singapore" },
  "ap-southeast-2": { name: "Sydney", country: "AU", countryName: "Australia" },
  "ap-southeast-3": { name: "Jakarta", country: "ID", countryName: "Indonesia" },
  "ap-southeast-4": { name: "Melbourne", country: "AU", countryName: "Australia" },
  "ap-southeast-5": { name: "Malaysia", country: "MY", countryName: "Malaysia" },
  "ap-southeast-7": { name: "Thailand", country: "TH", countryName: "Thailand" },
};

export function getAwsRegionInfo(region: string): AwsRegionInfo | null {
  return AWS_REGIONS[region.trim().toLowerCase()] ?? null;
}

/** "Tokyo (ap-northeast-1)", or just the code when the region is not in the list. */
export function formatAwsRegionLabel(region: string): string {
  const info = getAwsRegionInfo(region);
  return info ? `${info.name} (${region})` : region;
}
