export const SKIN_CATALOG = [
  { id: "default", label: "Sprout", hint: "Starter equilibre" },
  { id: "solar", label: "Solar", hint: "Energie orange" },
  { id: "mint", label: "Mint", hint: "Aura calme" },
  { id: "graphite", label: "Graphite", hint: "Style tank" },
  { id: "sunset", label: "Sunset", hint: "Vibe chaud" },
  { id: "neon", label: "Neon", hint: "Mode arcade" }
] as const;

export type SkinId = (typeof SKIN_CATALOG)[number]["id"];

const skinIdSet = new Set<string>(SKIN_CATALOG.map((item) => item.id));

export function normalizeSkinId(input: string | null | undefined): SkinId {
  if (!input) {
    return "default";
  }

  return skinIdSet.has(input) ? (input as SkinId) : "default";
}
