export const STRUCTURES = ["STRUCTURE_1", "STRUCTURE_2"] as const;
export type InvoiceStructure = (typeof STRUCTURES)[number];

export function formatDateFR(d: string) {
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return "—";
  return dt.toLocaleDateString("fr-FR");
}

export function round2(n: number) {
  return Math.round(n * 100) / 100;
}

export function toYMD(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}
