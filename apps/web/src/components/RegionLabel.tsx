import { Globe } from "lucide-react";
import type { FlagComponent } from "country-flag-icons/react/3x2";
import {
  AE,
  AU,
  BH,
  BR,
  CA,
  CH,
  DE,
  ES,
  FR,
  GB,
  HK,
  ID,
  IE,
  IL,
  IN,
  IT,
  JP,
  KR,
  MX,
  MY,
  SE,
  SG,
  TH,
  US,
  ZA,
} from "country-flag-icons/react/3x2";
import { formatAwsRegionLabel, getAwsRegionInfo } from "~/lib/aws-regions";

// Flags are drawn as SVG because Windows browsers do not render flag emoji.
const FLAGS: Record<string, FlagComponent> = {
  AE, AU, BH, BR, CA, CH, DE, ES, FR, GB, HK, ID, IE, IL, IN, IT, JP, KR,
  MX, MY, SE, SG, TH, US, ZA,
};

export function RegionLabel({ region }: { region: string }) {
  const info = getAwsRegionInfo(region);
  const Flag = info ? FLAGS[info.country] : undefined;

  return (
    <span className="flex items-center gap-2">
      {Flag ? (
        <Flag
          aria-hidden
          className="h-3.5 w-5 shrink-0 rounded-[2px]"
          title={info?.countryName}
        />
      ) : (
        <Globe aria-hidden className="h-3.5 w-5 shrink-0 text-muted-foreground" />
      )}
      <span>{formatAwsRegionLabel(region)}</span>
    </span>
  );
}
