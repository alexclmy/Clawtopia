export type SkinTier = "FREE" | "SUPPORTER";

export interface SkinCatalogItem {
  id: string;
  label: string;
  hint: string;
  tier: SkinTier;
  suggestedDonationUsd: number | null;
}

export const SKIN_CATALOG = [
  { id: "default", label: "Sprout", hint: "Balanced starter", tier: "FREE", suggestedDonationUsd: null },
  { id: "mint", label: "Mint", hint: "Calm aura", tier: "FREE", suggestedDonationUsd: null },
  { id: "solar", label: "Solar", hint: "Bright orange energy", tier: "SUPPORTER", suggestedDonationUsd: 1 },
  { id: "graphite", label: "Graphite", hint: "Tank style", tier: "SUPPORTER", suggestedDonationUsd: 1 },
  { id: "sunset", label: "Sunset", hint: "Warm vibe", tier: "SUPPORTER", suggestedDonationUsd: 2 },
  { id: "neon", label: "Neon", hint: "Arcade mode", tier: "SUPPORTER", suggestedDonationUsd: 3 }
] as const satisfies readonly SkinCatalogItem[];

export type SkinId = (typeof SKIN_CATALOG)[number]["id"];

const skinIdSet = new Set<string>(SKIN_CATALOG.map((item) => item.id));

export function normalizeSkinId(input: string | null | undefined): SkinId {
  if (!input) {
    return "default";
  }

  return skinIdSet.has(input) ? (input as SkinId) : "default";
}
