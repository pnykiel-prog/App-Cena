// Wspólne opcje rezerwacji wizyty: typ, preferowany dzień i pora dnia.
// Używane przez widget (formularz), API (walidacja) i panel (wyświetlanie).

export const VISIT_DAYS = [
  { value: "ANY", label: "Dowolny dzień" },
  { value: "MON", label: "Poniedziałek" },
  { value: "TUE", label: "Wtorek" },
  { value: "WED", label: "Środa" },
  { value: "THU", label: "Czwartek" },
  { value: "FRI", label: "Piątek" },
  { value: "SAT", label: "Sobota" },
  { value: "SUN", label: "Niedziela" },
] as const;

export const VISIT_TIMES = [
  { value: "ANY", label: "O dowolnej porze" },
  { value: "MORNING", label: "Rano (8–10)" },
  { value: "FORENOON", label: "Przedpołudnie (10–12)" },
  { value: "AFTERNOON", label: "Po południu (12–16)" },
  { value: "EVENING", label: "Wieczorem (16–19)" },
] as const;

export const VISIT_DAY_VALUES = VISIT_DAYS.map((d) => d.value);
export const VISIT_TIME_VALUES = VISIT_TIMES.map((t) => t.value);

const DAY_LABEL = new Map<string, string>(VISIT_DAYS.map((d) => [d.value, d.label]));
const TIME_LABEL = new Map<string, string>(VISIT_TIMES.map((t) => [t.value, t.label]));

export function visitDayLabel(value: string | null | undefined): string {
  return value ? (DAY_LABEL.get(value) ?? value) : "—";
}
export function visitTimeLabel(value: string | null | undefined): string {
  return value ? (TIME_LABEL.get(value) ?? value) : "—";
}

export function visitKindLabel(kind: string): string {
  return kind === "PHONE" ? "Konsultacja telefoniczna" : "Wizyta stacjonarna";
}

// Czytelny opis preferencji terminu (np. "Poniedziałek, rano (8–10)").
export function visitPreferenceLabel(
  day: string | null | undefined,
  time: string | null | undefined,
): string {
  const d = day && day !== "ANY" ? visitDayLabel(day) : null;
  const t = time && time !== "ANY" ? visitTimeLabel(time) : null;
  if (d && t) return `${d}, ${t.toLowerCase()}`;
  if (d) return d;
  if (t) return t;
  return "Dowolny termin";
}
