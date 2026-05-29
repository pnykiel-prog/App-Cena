// Domyślny katalog modyfikatorów poznawczo-medycznych — używany w seedzie
// i jako fallback w widgecie, gdyby tenant ich nie aktywował. Tenant może je
// nadpisać (cena, opis, kolejność) we własnym MedicalModifier.

import type { MedicalModifierKind } from "@prisma/client";

export type MedicalModifierSpec = {
  code: string;
  label: string;
  kind: MedicalModifierKind;
  description: string;
  defaultMonthlySurcharge: number;
  isToggle: boolean;
};

export const DEFAULT_MEDICAL_MODIFIERS: MedicalModifierSpec[] = [
  {
    code: "DEMENTIA",
    label: "Otępienie / choroba Alzheimera",
    kind: "COGNITIVE",
    description:
      "Stwierdzona diagnoza otępienia lub Alzheimera wymagająca stałego nadzoru.",
    defaultMonthlySurcharge: 800,
    isToggle: true,
  },
  {
    code: "WANDERING",
    label: "Ryzyko ucieczki / błądzenia",
    kind: "BEHAVIORAL",
    description:
      "Pacjent skłonny do błądzenia, ucieczek z placówki — wymaga oddziału zamkniętego.",
    defaultMonthlySurcharge: 600,
    isToggle: true,
  },
  {
    code: "INCONTINENCE",
    label: "Nietrzymanie moczu/stolca",
    kind: "MEDICAL",
    description: "Konieczność pielęgnacji intymnej i zaopatrzenia w środki chłonne.",
    defaultMonthlySurcharge: 450,
    isToggle: true,
  },
  {
    code: "PRESSURE_ULCERS",
    label: "Odleżyny / rany przewlekłe",
    kind: "MEDICAL",
    description: "Pielęgnacja odleżyn lub ran przewlekłych z opatrunkami specjalistycznymi.",
    defaultMonthlySurcharge: 700,
    isToggle: true,
  },
  {
    code: "DIABETES_INSULIN",
    label: "Cukrzyca insulinozależna",
    kind: "MEDICAL",
    description: "Codzienne podawanie insuliny, kontrola glikemii.",
    defaultMonthlySurcharge: 350,
    isToggle: true,
  },
  {
    code: "PEG_FEEDING",
    label: "Karmienie przez PEG / SNG",
    kind: "MEDICAL",
    description: "Karmienie sondą, dieta przemysłowa.",
    defaultMonthlySurcharge: 900,
    isToggle: true,
  },
  {
    code: "BEDRIDDEN",
    label: "Pacjent leżący",
    kind: "MOBILITY",
    description: "Stała pielęgnacja w łóżku, profilaktyka odleżyn, przewracanie.",
    defaultMonthlySurcharge: 1000,
    isToggle: true,
  },
  {
    code: "OXYGEN_THERAPY",
    label: "Tlenoterapia",
    kind: "MEDICAL",
    description: "Stała tlenoterapia z koncentratorem.",
    defaultMonthlySurcharge: 400,
    isToggle: true,
  },
  {
    code: "AGGRESSION",
    label: "Zachowania agresywne",
    kind: "BEHAVIORAL",
    description:
      "Agresja słowna/fizyczna wymagająca dodatkowego nadzoru i interwencji personelu.",
    defaultMonthlySurcharge: 550,
    isToggle: true,
  },
];
