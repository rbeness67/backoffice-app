export const STRUCTURE_LABELS: Record<string, string> = {
  STRUCTURE_1: "Cocci'Bulles",
  STRUCTURE_2: "Milles et une Bulles",
};

export function getStructureLabel(value?: string) {
  if (!value) return "—";
  return STRUCTURE_LABELS[value] ?? value;
}
