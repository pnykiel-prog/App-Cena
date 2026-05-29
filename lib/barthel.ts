// Skala Barthela (Barthel Index) — 10 pozycji, wynik 0–100.
// Wspólna dla wszystkich tenantów. Punktacja zgodna z oryginalną skalą
// Mahoney & Barthel (1965) w skali 0–10–15.

export type BarthelItemCode =
  | "feeding"
  | "transfer"
  | "grooming"
  | "toilet"
  | "bathing"
  | "mobility"
  | "stairs"
  | "dressing"
  | "bowels"
  | "bladder";

export type BarthelOption = {
  value: number;
  label: string;
};

export type BarthelItem = {
  code: BarthelItemCode;
  label: string;
  description?: string;
  options: BarthelOption[];
};

export const BARTHEL_ITEMS: BarthelItem[] = [
  {
    code: "feeding",
    label: "Spożywanie posiłków",
    description: "Czy pacjent może samodzielnie zjeść przygotowany posiłek?",
    options: [
      { value: 0, label: "Niezdolny" },
      { value: 5, label: "Potrzebuje pomocy" },
      { value: 10, label: "Samodzielny" },
    ],
  },
  {
    code: "transfer",
    label: "Przemieszczanie się z łóżka na krzesło i z powrotem",
    options: [
      { value: 0, label: "Niezdolny, brak równowagi przy siedzeniu" },
      { value: 5, label: "Duża pomoc fizyczna (1–2 osoby)" },
      { value: 10, label: "Niewielka pomoc (słowna lub fizyczna)" },
      { value: 15, label: "Samodzielny" },
    ],
  },
  {
    code: "grooming",
    label: "Utrzymanie higieny osobistej (mycie twarzy, czesanie, golenie)",
    options: [
      { value: 0, label: "Potrzebuje pomocy" },
      { value: 5, label: "Samodzielny (zapewnione przybory)" },
    ],
  },
  {
    code: "toilet",
    label: "Korzystanie z toalety",
    options: [
      { value: 0, label: "Zależny" },
      { value: 5, label: "Potrzebuje pomocy częściowej" },
      { value: 10, label: "Samodzielny" },
    ],
  },
  {
    code: "bathing",
    label: "Kąpiel całego ciała",
    options: [
      { value: 0, label: "Zależny" },
      { value: 5, label: "Samodzielny lub pod prysznicem" },
    ],
  },
  {
    code: "mobility",
    label: "Poruszanie się po płaskich powierzchniach",
    options: [
      { value: 0, label: "Niezdolny" },
      { value: 5, label: "Niezależny na wózku w obrębie 50 m" },
      { value: 10, label: "Spacer z pomocą jednej osoby (50 m)" },
      { value: 15, label: "Niezależny (sprzęt ortopedyczny dozwolony) 50 m" },
    ],
  },
  {
    code: "stairs",
    label: "Wchodzenie i schodzenie po schodach",
    options: [
      { value: 0, label: "Niezdolny" },
      { value: 5, label: "Potrzebuje pomocy fizycznej lub nadzoru" },
      { value: 10, label: "Samodzielny" },
    ],
  },
  {
    code: "dressing",
    label: "Ubieranie i rozbieranie się",
    options: [
      { value: 0, label: "Zależny" },
      { value: 5, label: "Potrzebuje pomocy, część wykonuje samodzielnie" },
      { value: 10, label: "Samodzielny (guziki, zamki, sznurowadła)" },
    ],
  },
  {
    code: "bowels",
    label: "Kontrolowanie zwieracza odbytu",
    options: [
      { value: 0, label: "Nie kontroluje" },
      { value: 5, label: "Sporadyczne niekontrolowane oddawanie" },
      { value: 10, label: "Pełna kontrola" },
    ],
  },
  {
    code: "bladder",
    label: "Kontrolowanie zwieracza pęcherza moczowego",
    options: [
      { value: 0, label: "Nie kontroluje" },
      { value: 5, label: "Sporadyczne niekontrolowane oddawanie" },
      { value: 10, label: "Pełna kontrola" },
    ],
  },
];

export type BarthelAnswers = Partial<Record<BarthelItemCode, number>>;

export function scoreBarthel(answers: BarthelAnswers): number {
  let total = 0;
  for (const item of BARTHEL_ITEMS) {
    const v = answers[item.code];
    if (typeof v === "number") total += v;
  }
  return Math.max(0, Math.min(100, total));
}

export function barthelMaxScore(): number {
  return BARTHEL_ITEMS.reduce(
    (s, item) => s + Math.max(...item.options.map((o) => o.value)),
    0,
  );
}

/**
 * Interpretacja kliniczna (informacyjna — nie używana w cenniku).
 * Cennik mapuje wynik na CareTier zdefiniowany per-tenant.
 */
export function barthelInterpretation(score: number): {
  level: "FULL_DEPENDENCY" | "SEVERE" | "MODERATE" | "MILD" | "INDEPENDENT";
  label: string;
} {
  if (score <= 20) return { level: "FULL_DEPENDENCY", label: "Pełna niesamodzielność" };
  if (score <= 40) return { level: "SEVERE", label: "Znaczna niesamodzielność" };
  if (score <= 60) return { level: "MODERATE", label: "Umiarkowana niesamodzielność" };
  if (score <= 85) return { level: "MILD", label: "Niewielka niesamodzielność" };
  return { level: "INDEPENDENT", label: "Samodzielność" };
}
