export const SKIN_CATALOG = [
  { id: "default", label: "Sprout", hint: "Balanced starter" },
  { id: "solar", label: "Solar", hint: "Bright orange energy" },
  { id: "mint", label: "Mint", hint: "Calm aura" },
  { id: "graphite", label: "Graphite", hint: "Tank style" },
  { id: "sunset", label: "Sunset", hint: "Warm vibe" },
  { id: "neon", label: "Neon", hint: "Arcade mode" }
] as const;

export type SkinId = (typeof SKIN_CATALOG)[number]["id"];

const skinIdSet = new Set<string>(SKIN_CATALOG.map((item) => item.id));

export function normalizeSkinId(input: string | null | undefined): SkinId {
  if (!input) {
    return "default";
  }

  return skinIdSet.has(input) ? (input as SkinId) : "default";
}
