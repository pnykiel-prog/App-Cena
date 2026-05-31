"use client";

import { createContext, useContext } from "react";

// Lekki słownik PL/EN dla „ramy" widgetu (nawigacja, kroki, etykiety).
// Treść kliniczna skali Barthela oraz dane tenanta (nazwy pokoi/usług) NIE są
// tłumaczone — pozostają w języku wprowadzonym przez placówkę / w oryginale.

export type Lang = "pl" | "en";

export type WidgetStrings = {
  // nawigacja kreatora
  stepCounter: (n: number, total: number, label: string) => string;
  back: string;
  next: string;
  computing: string;
  showQuote: string;
  errCompute: string;
  errConnection: string;
  // etykiety kroków
  steps: {
    intro: string;
    barthel: string;
    medical: string;
    room: string;
    addons: string;
    contract: string;
    result: string;
  };
  // strona widgetu (nagłówek/stopka)
  headerTagline: string;
  poweredBy: string;
  // intro
  intro: {
    welcome: (name: string) => string;
    lead: string;
    howItWorks: string;
    s1: string;
    s2: string;
    s3: string;
    s4: string;
    s5: string;
    seniorOptional: string;
    firstName: string;
    firstNamePlaceholder: string;
    age: string;
    agePlaceholder: string;
  };
  // medical
  medical: {
    title: string;
    desc: string;
    selected: (n: number) => string;
    kind: { COGNITIVE: string; MEDICAL: string; BEHAVIORAL: string; MOBILITY: string };
  };
  // room
  room: {
    title: string;
    desc: string;
    basePrice: string;
    perMonth: (currency: string) => string;
    capacity: { SINGLE: string; DOUBLE: string; TRIPLE: string };
  };
  // addons
  addons: {
    title: string;
    desc: string;
    unit: { PER_MONTH: string; PER_DAY: string; PER_HOUR: string; PER_VISIT: string };
  };
  // contract
  contract: {
    title: string;
    desc: string;
    noDiscount: string;
  };
};

const PL: WidgetStrings = {
  stepCounter: (n, total, label) => `Krok ${n} z ${total} — ${label}`,
  back: "Wstecz",
  next: "Dalej",
  computing: "Liczę wycenę...",
  showQuote: "Pokaż wycenę",
  errCompute: "Nie udało się policzyć wyceny",
  errConnection: "Błąd połączenia z serwerem",
  steps: {
    intro: "Start",
    barthel: "Samodzielność",
    medical: "Stan zdrowia",
    room: "Pokój",
    addons: "Usługi",
    contract: "Umowa",
    result: "Wycena",
  },
  headerTagline: "Wycena pobytu",
  poweredBy: "Powered by",
  intro: {
    welcome: (name) => `Witaj w wycenie ${name}`,
    lead: "Odpowiedz na kilka pytań o stanie zdrowia i preferencjach przyszłego mieszkańca. W 5 minut otrzymasz anonimową wycenę widełkową pobytu. Nie zbieramy danych osobowych do momentu wyświetlenia wyniku.",
    howItWorks: "Jak to działa",
    s1: "Ocena samodzielności (skala Barthela, 10 pytań)",
    s2: "Stan zdrowia i opieka specjalistyczna",
    s3: "Wybór pokoju i dodatkowych usług",
    s4: "Długość planowanej umowy → rabat",
    s5: "Wycena „od–do” z rozbiciem pozycji",
    seniorOptional: "Opcjonalnie — krótkie info o seniorze (pomaga personalizować PDF):",
    firstName: "Imię (opcjonalnie)",
    firstNamePlaceholder: "np. Janina",
    age: "Wiek (opcjonalnie)",
    agePlaceholder: "np. 82",
  },
  medical: {
    title: "Stan zdrowia i potrzeby specjalne",
    desc: "Zaznacz wszystkie pozycje, które dotyczą przyszłego mieszkańca. Każda z nich wpływa na miesięczny koszt opieki. Nie pamiętasz wszystkiego? Możesz wrócić do tego ekranu w każdej chwili.",
    selected: (n) => `Wybrano ${n} modyfikatorów`,
    kind: {
      COGNITIVE: "Stan poznawczy",
      MEDICAL: "Medyczne",
      BEHAVIORAL: "Behawioralne",
      MOBILITY: "Mobilność",
    },
  },
  room: {
    title: "Wybierz typ pokoju",
    desc: "Cena bazowa obejmuje wyżywienie i podstawową opiekę 24/7. Dodatkowa opieka medyczna i usługi liczone są osobno.",
    basePrice: "Cena bazowa",
    perMonth: (currency) => `/ miesiąc · ${currency}`,
    capacity: { SINGLE: "1 osoba", DOUBLE: "2 osoby", TRIPLE: "3 osoby" },
  },
  addons: {
    title: "Usługi dodatkowe",
    desc: 'Zaznacz usługi, z których będzie korzystał mieszkaniec. Dla usług rozliczanych „za zabieg" lub „za godzinę" podaj szacowaną liczbę w miesiącu.',
    unit: {
      PER_MONTH: "ryczałt miesięczny",
      PER_DAY: "za dobę",
      PER_HOUR: "za godzinę",
      PER_VISIT: "za zabieg / wizytę",
    },
  },
  contract: {
    title: "Planowana długość pobytu",
    desc: "Dłuższe umowy mają niższą cenę miesięczną. To tylko wstępna deklaracja — nie zobowiązuje do podpisania umowy w tym momencie.",
    noDiscount: "Bez rabatu",
  },
};

const EN: WidgetStrings = {
  stepCounter: (n, total, label) => `Step ${n} of ${total} — ${label}`,
  back: "Back",
  next: "Next",
  computing: "Calculating...",
  showQuote: "Show estimate",
  errCompute: "Could not calculate the estimate",
  errConnection: "Connection error",
  steps: {
    intro: "Start",
    barthel: "Independence",
    medical: "Health",
    room: "Room",
    addons: "Services",
    contract: "Contract",
    result: "Estimate",
  },
  headerTagline: "Stay estimate",
  poweredBy: "Powered by",
  intro: {
    welcome: (name) => `Welcome to ${name} estimate`,
    lead: "Answer a few questions about the future resident's health and preferences. In 5 minutes you'll get an anonymous price-range estimate for the stay. We don't collect personal data until the result is shown.",
    howItWorks: "How it works",
    s1: "Independence assessment (Barthel Index, 10 questions)",
    s2: "Health status and specialist care",
    s3: "Room and additional services selection",
    s4: "Planned contract length → discount",
    s5: "A price-range estimate with line items",
    seniorOptional: "Optional — brief info about the senior (helps personalise the PDF):",
    firstName: "First name (optional)",
    firstNamePlaceholder: "e.g. Janina",
    age: "Age (optional)",
    agePlaceholder: "e.g. 82",
  },
  medical: {
    title: "Health status and special needs",
    desc: "Select all items that apply to the future resident. Each one affects the monthly cost of care. Don't remember everything? You can return to this screen anytime.",
    selected: (n) => `Selected ${n} modifiers`,
    kind: {
      COGNITIVE: "Cognitive",
      MEDICAL: "Medical",
      BEHAVIORAL: "Behavioral",
      MOBILITY: "Mobility",
    },
  },
  room: {
    title: "Choose a room type",
    desc: "The base price includes meals and basic 24/7 care. Additional medical care and services are charged separately.",
    basePrice: "Base price",
    perMonth: (currency) => `/ month · ${currency}`,
    capacity: { SINGLE: "1 person", DOUBLE: "2 people", TRIPLE: "3 people" },
  },
  addons: {
    title: "Additional services",
    desc: 'Select the services the resident will use. For services billed "per visit" or "per hour", enter the estimated monthly quantity.',
    unit: {
      PER_MONTH: "monthly flat rate",
      PER_DAY: "per day",
      PER_HOUR: "per hour",
      PER_VISIT: "per visit",
    },
  },
  contract: {
    title: "Planned length of stay",
    desc: "Longer contracts have a lower monthly price. This is only a preliminary declaration — it does not commit you to signing a contract now.",
    noDiscount: "No discount",
  },
};

export const WIDGET_STRINGS: Record<Lang, WidgetStrings> = { pl: PL, en: EN };

// Mapuje locale tenanta (np. "pl-PL", "en-US") na obsługiwany język.
export function langFromLocale(locale: string | null | undefined): Lang {
  return locale?.toLowerCase().startsWith("en") ? "en" : "pl";
}

const LangContext = createContext<WidgetStrings>(PL);

export function LangProvider({
  lang,
  children,
}: {
  lang: Lang;
  children: React.ReactNode;
}) {
  return <LangContext.Provider value={WIDGET_STRINGS[lang]}>{children}</LangContext.Provider>;
}

export function useT(): WidgetStrings {
  return useContext(LangContext);
}
