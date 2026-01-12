export function round2(n: number) {
  return Math.round(n * 100) / 100;
}

export function calcTVA20(ht: number) {
  if (!Number.isFinite(ht) || ht <= 0) return 0;
  return round2(ht * 0.2);
}

export function calcTTC(ht: number, tva: number) {
  if (!Number.isFinite(ht) || ht <= 0) return 0;
  return round2(ht + tva);
}
