# CareQuote MVP — Dokumentacja wykonawcza dla Claude Code

> Plik przeznaczony dla Claude Code. Zawiera pełną specyfikację projektu, architekturę
> multi-tenant, silnik wyceny, schemat bazy danych, design system i instrukcje implementacji.
> Wklej sekcję **PROMPT STARTOWY** jako pierwsze polecenie w sesji Claude Code.
>
> **Nazwa robocza:** „CareQuote" (do ustalenia). Domena robocza: `carequote.pl`,
> widget: `widget.carequote.pl`.

---

## KONTEKST PROJEKTU

**CareQuote** to komercyjna platforma SaaS dla domów seniora (DSE), prywatnych domów opieki
i placówek całodobowych w Polsce. Pozwala każdej zainteresowanej osobie (rodzinie, seniorowi,
managerowi placówki) dokonać **wstępnej, anonimowej wyceny pobytu** w konkretnym domu seniora,
zanim rozpoczną się szczegółowe rozmowy z managerem obiektu.

Aplikacja ma formę **ankiety/kreatora**, który:
1. Ocenia poziom samodzielności przyszłego mieszkańca (skala Barthela),
2. Uzupełnia ocenę o moduł poznawczo-medyczny (czynniki kosztotwórcze),
3. Pozwala dobrać pokój i dodatkowe usługi,
4. Wylicza **wstępną wycenę widełkową** (kwota od–do) miesięcznego pobytu,
5. Generuje lead dla managera placówki i PDF dla użytkownika.

### Model biznesowy

Produkt sprzedawany w modelu **abonamentowym (SaaS)** do domów seniora — także spoza
konsorcjum Bonam Curam. Każdy DSE to osobny **tenant** z własnym cennikiem, pokojami,
usługami i brandingiem. Widget osadzany jest na stronie WWW placówki.

### Relacja z CareMap

Aplikacja jest **standalone** w warstwie kodu i deploya (własne repo, własny projekt Vercel,
własne logowanie panelu), ale korzysta z **tego samego projektu Neon, klucza Resend i konta
Vercel co CareMap**. W przyszłości planowana **migracja/konsolidacja do CareMap** — dlatego
stos technologiczny jest celowo identyczny (Next.js 14 + Prisma + Neon + Vercel + Resend),
a taksonomia usług i nazewnictwo zgodne z CareMap, aby ułatwić późniejsze scalenie.

### Trzy powierzchnie aplikacji

```
1. WIDGET (publiczny)        — osadzany na stronie DSE; anonimowa ankieta + wycena
2. PANEL TENANTA (DSE)       — logowanie; konfigurator cennika + leady + wizyty
3. PANEL SUPER-ADMINA        — logowanie; zarządzanie tenantami i abonamentami (operator platformy)
```

---

## DECYZJE TECHNICZNE

```
Framework:     Next.js 14 (App Router, TypeScript)
Baza danych:   PostgreSQL — Neon (ten sam projekt Neon co CareMap; DATABASE_URL + DIRECT_URL)
ORM:           Prisma
Auth:          NextAuth.js v5 (Auth.js) — tylko panele (tenant + super-admin)
Styling:       Tailwind CSS v3 + shadcn/ui
Wykresy:       Recharts (panele)
PDF:           @react-pdf/renderer
Email:         Resend (ten sam klucz/nadawca co CareMap — office@bonamcuram.com)
Walidacja:     Zod
Płatności:     (model danych gotowy; integracja Stripe/Przelewy24 — FAZA 2)
Hosting:       Vercel (to samo konto/zespół co CareMap)
Domena app:    carequote.pl  (panel + super-admin)
Domena widget: widget.carequote.pl  (osadzany iframe)
Email nadawcy: office@bonamcuram.com
```

### Konfiguracja bazy danych (Neon) — wspólna z CareMap

CareQuote korzysta z **tego samego projektu Neon** co CareMap. Prisma + Neon wymagają dwóch
połączeń (jak w CareMap):

```
DATABASE_URL  — pooled (z -pooler w hoście) → runtime aplikacji
DIRECT_URL    — direct (bez poolera)        → migracje Prisma (prisma migrate/db push)
```

> **Sekret:** rzeczywiste connection stringi kopiujemy z dashboardu Neon projektu CareMap
> (Vercel → Environment Variables). **Nigdy** nie wpisujemy ich na sztywno w dokumentacji
> ani w repo — tylko `.env.local` (gitignore) i zmienne środowiskowe na Vercel.

**Izolacja danych (DECYZJA):** osobna **baza** `carequote` w tym samym projekcie Neon co
CareMap. Każda aplikacja ma własny komplet tabel — brak ryzyka kolizji nazw, migracje Prisma
nie wpływają na CareMap, a późniejsza konsolidacja jest czysta. Bazę `carequote` należy
utworzyć w dashboardzie Neon (projekt CareMap → Databases → New Database) **przed** pierwszym
`prisma db push`. `DATABASE_URL`/`DIRECT_URL` wskazują na `/carequote`.

---

## ARCHITEKTURA MULTI-TENANT

### Zasady izolacji

- **Każdy rekord danych operacyjnych** (pokoje, usługi, wyceny, leady) ma `tenantId`.
- **Wszystkie zapytania** w panelu tenanta filtrowane po `tenantId` z sesji — nigdy globalnie.
- **Widget** identyfikuje tenanta po `slug` (np. `solaris`) przekazanym w snippecie osadzenia.
- **Super-admin** to osobny model (`PlatformAdmin`) — operuje ponad tenantami.

### Co jest wspólne (globalne, niekonfigurowalne)

- **Skala Barthela** — 10 pozycji, stała, identyczna dla wszystkich tenantów (`lib/barthel.ts`).
- **Zestaw pytań modułu poznawczo-medycznego** — stały katalog kodów; per-tenant konfigurowalne
  są tylko **kwoty dopłat** i to, czy dany modyfikator jest **włączony**.

### Co konfiguruje tenant (konfigurator w panelu DSE)

- Typy pokoi (1/2/3-osobowy) i ich ceny bazowe (widełki)
- Progi opieki wg Barthela — **schodki kwotowe** (dopłata miesięczna per próg)
- Modyfikatory poznawczo-medyczne — włącz/wyłącz + kwoty dopłat
- Usługi dodatkowe à la carte — pełny kreator (CRUD) z okresem rozliczenia
- Rabaty za długość umowy — progi miesięcy + procent
- Branding widgetu (logo, kolor wiodący, kolor akcentu)
- Ustawienia powiadomień (adresy e-mail dla leadów)

### Abonament (FAZA 1 — tylko model danych)

Model `Subscription` z planem, statusem i limitem wycen/miesiąc. Egzekwowanie limitu w API
widgetu (miękkie — gdy przekroczony, lead nadal zapisywany, ale flagowany). Integracja
płatności odłożona do FAZY 2 (pola `stripeCustomerId`, `stripeSubscriptionId` już w schemacie).

---

## DESIGN SYSTEM

### Chrome produktu (panele tenanta i super-admina)

Spójny branding CareQuote/Bonam Curam — biało-granatowo-złoty:

```typescript
// tailwind.config.ts — extend colors
colors: {
  navy: { DEFAULT: '#1e3a5f', hover: '#2d5080', light: '#e8eef5', 50: '#f0f4f9' },
  gold: { DEFAULT: '#C9A84C', hover: '#A07C30', light: '#F5ECD4', 50: '#fdf8ee' },
  surface: '#F8FAFC',  // tło strony
  card:    '#FFFFFF',  // tło kart
  border:  '#E5E7EB',  // obramowania
}
```

Zasady jak w CareMap: białe karty na jasnym tle, granat = primary (przyciski, nagłówki,
aktywna nawigacja), złoty = wyłącznie akcent. Czcionka **Inter**. Język UI: **polski**.

Wzorzec karty:
```tsx
<div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
```

### Branding widgetu (per-tenant)

Widget **nie** używa kolorów CareQuote — dziedziczy branding placówki:
- `brandColor` (domyślnie `#1e3a5f`) — przyciski, nagłówki kroków, paski postępu
- `accentColor` (domyślnie `#C9A84C`) — akcenty, aktywne stany
- `logoUrl` — logo placówki w nagłówku widgetu
- Dyskretna stopka „Wycena dostarczana przez CareQuote" (do ustalenia czy obowiązkowa)

Kolory wstrzykiwane jako zmienne CSS na poziomie kontenera widgetu:
```css
.cq-widget { --cq-brand: <brandColor>; --cq-accent: <accentColor>; }
```

### Komponenty bazowe (shadcn/ui)

```bash
npx shadcn@latest add button input select textarea badge card table tabs
npx shadcn@latest add dialog sheet dropdown-menu toast progress skeleton
npx shadcn@latest add form label separator avatar alert radio-group checkbox slider
```

---

## MODEL OCENY POTRZEB

### Część 1 — Indeks Barthela (stały, 10 pozycji, 0–100)

> Wynik mapowany na **próg opieki** (CareTier), który generuje schodkową dopłatę miesięczną.
> **UWAGA:** punktacja poniżej to standardowa wersja stosowana w PL — przed wdrożeniem
> zweryfikować z oficjalną kartą oceny używaną przez placówki.

```
1. Spożywanie posiłków
   0  — nie jest w stanie samodzielnie jeść
   5  — potrzebuje pomocy (krojenie, smarowanie)
   10 — samodzielny

2. Przemieszczanie (łóżko ↔ krzesło/wózek)
   0  — nie jest w stanie, nie utrzymuje równowagi siedząc
   5  — duża pomoc fizyczna (1–2 osoby)
   10 — mniejsza pomoc (słowna lub fizyczna)
   15 — samodzielny

3. Utrzymanie higieny osobistej (twarz, włosy, zęby, golenie)
   0  — potrzebuje pomocy
   5  — samodzielny (z udostępnionymi przyborami)

4. Korzystanie z toalety
   0  — zależny
   5  — potrzebuje pomocy, część robi sam
   10 — samodzielny

5. Mycie / kąpiel całego ciała
   0  — zależny
   5  — samodzielny

6. Poruszanie się po powierzchniach płaskich
   0  — nie porusza się
   5  — niezależny na wózku (włącznie z zakrętami)
   10 — chodzi z pomocą jednej osoby
   15 — niezależny (może z laską/chodzikiem)

7. Wchodzenie i schodzenie po schodach
   0  — nie jest w stanie
   5  — potrzebuje pomocy / asekuracji
   10 — samodzielny

8. Ubieranie i rozbieranie
   0  — zależny
   5  — potrzebuje pomocy, część robi sam
   10 — samodzielny (guziki, zamki)

9. Kontrolowanie stolca
   0  — nie panuje / wymaga lewatyw
   5  — sporadyczne przypadki nietrzymania
   10 — panuje

10. Kontrolowanie moczu
   0  — nie panuje / cewnik nieobsługiwany samodzielnie
   5  — sporadyczne przypadki nietrzymania
   10 — panuje
```

### Część 2 — Moduł poznawczo-medyczny (czynniki kosztotwórcze)

> Stały katalog kodów. Każdy tenant może **włączyć/wyłączyć** modyfikator i ustawić **kwoty
> dopłat** (widełki). Typy: `BOOLEAN` (tak/nie) lub `TIERED` (kilka poziomów z różnymi dopłatami).
> Kwoty poniżej to **poglądowy cennik (demo)** używany w seedzie — każdy tenant nadpisuje je
> w konfiguratorze. Spójne z `MEDICAL_MODIFIERS` w `prisma/seed.ts`.

```
KOD            TYP      PYTANIE / OPCJE
─────────────────────────────────────────────────────────────────────────────
POZNAWCZY      TIERED   Stan poznawczy mieszkańca:
                          brak zaburzeń            → +0
                          łagodne zaburzenia       → +300–500 / mies.
                          umiarkowana demencja     → +600–1000 / mies.
                          zaawansowana demencja    → +1100–1900 / mies.

BLADZENIE      BOOLEAN  Tendencja do oddalania się / ucieczek (wymaga nadzoru)
                          tak → +400–800 / mies.

AGRESJA        BOOLEAN  Pobudzenie / zachowania agresywne
                          tak → +350–700 / mies.

INSULINA       BOOLEAN  Cukrzyca wymagająca podawania insuliny
                          tak → +250–450 / mies.

RANY           TIERED   Rany / odleżyny:
                          brak                     → +0
                          drobne                   → +200–400 / mies.
                          wymagające specj. pielęgnacji → +600–1100 / mies.

CEWNIK_STOMIA  BOOLEAN  Cewnik / stomia / PEG
                          tak → +300–550 / mies.

TLEN           BOOLEAN  Tlenoterapia
                          tak → +250–500 / mies.

LEZACY         BOOLEAN  Osoba leżąca (wymaga podnośnika / 2 osób)
                          tak → +700–1300 / mies.

DIETA          BOOLEAN  Dieta specjalna (miksowana / przez PEG)
                          tak → +150–350 / mies.
```

---

## SILNIK WYCENY (do lib/pricing.ts)

### Wzór

```
estymata_od =  bazaPokoju_od(typ)
             + doplataBarthel_od(próg)
             + Σ modyfikatoryMedyczne_od
             + Σ usługiMiesięczne_od            (z ekwiwalentem dla nie-miesięcznych)
estymata_do =  bazaPokoju_do(typ)
             + doplataBarthel_do(próg)
             + Σ modyfikatoryMedyczne_do
             + Σ usługiMiesięczne_do

rabat% = rabatZaDługośćUmowy(liczbaMiesięcy)

estymata_od_final = round( estymata_od * (1 - rabat%/100) )
estymata_do_final = round( estymata_do * (1 - rabat%/100) )
```

### Ekwiwalent miesięczny usług à la carte

Każda usługa ma `billingUnit`: `MONTH | PROCEDURE | HOUR | DAY`. Dla pozycji innych niż
`MONTH` użytkownik w kreatorze podaje **szacowaną liczbę w miesiącu** (`qtyPerMonth`):

```
ekwiwalentMiesięczny = (billingUnit === MONTH) ? cena : cena * qtyPerMonth
```

W wyniku każda usługa pokazywana jest jako osobna pozycja w rozbiciu (`breakdown`), z adnotacją
o sposobie rozliczenia (np. „Rehabilitacja: 120–180 zł / zabieg × 8 = 960–1440 zł / mies.").

### Implementacja

```typescript
// lib/pricing.ts

export interface QuoteInput {
  roomType: { basePriceMin: number; basePriceMax: number };
  careTier: { surchargeMin: number; surchargeMax: number };
  medical: { surchargeMin: number; surchargeMax: number }[];
  addons: {
    name: string; priceMin: number; priceMax: number;
    billingUnit: 'MONTH' | 'PROCEDURE' | 'HOUR' | 'DAY';
    qtyPerMonth: number;  // 1 dla MONTH
  }[];
  contractMonths: number | null;
  discounts: { monthsMin: number; discountPercent: number }[];
}

export function resolveCareTier(score: number, tiers: any[]) {
  return tiers.find(t => score >= t.barthelMin && score <= t.barthelMax) ?? null;
}

export function resolveDiscountPercent(months: number | null, discounts: any[]) {
  if (!months) return 0;
  const applicable = discounts
    .filter(d => months >= d.monthsMin)
    .sort((a, b) => b.monthsMin - a.monthsMin);
  return applicable[0]?.discountPercent ?? 0;
}

export function calcQuote(input: QuoteInput) {
  const addonMin = input.addons.reduce(
    (s, a) => s + a.priceMin * (a.billingUnit === 'MONTH' ? 1 : a.qtyPerMonth), 0);
  const addonMax = input.addons.reduce(
    (s, a) => s + a.priceMax * (a.billingUnit === 'MONTH' ? 1 : a.qtyPerMonth), 0);
  const medMin = input.medical.reduce((s, m) => s + m.surchargeMin, 0);
  const medMax = input.medical.reduce((s, m) => s + m.surchargeMax, 0);

  let min = input.roomType.basePriceMin + input.careTier.surchargeMin + medMin + addonMin;
  let max = input.roomType.basePriceMax + input.careTier.surchargeMax + medMax + addonMax;

  const discount = resolveDiscountPercent(input.contractMonths, input.discounts);
  min = Math.round(min * (1 - discount / 100));
  max = Math.round(max * (1 - discount / 100));

  return {
    estimateMin: min,
    estimateMax: max,
    discountPercent: discount,
    breakdown: {
      room:    [input.roomType.basePriceMin, input.roomType.basePriceMax],
      care:    [input.careTier.surchargeMin, input.careTier.surchargeMax],
      medical: [medMin, medMax],
      addons:  [addonMin, addonMax],
      discount,
    },
  };
}
```

### Barthel (do lib/barthel.ts)

```typescript
// lib/barthel.ts — stała, wspólna struktura dla wszystkich tenantów

export const BARTHEL_ITEMS = [
  { code: 'feeding',  label: 'Spożywanie posiłków',          options: [0,5,10] },
  { code: 'transfer', label: 'Przemieszczanie (łóżko↔krzesło)', options: [0,5,10,15] },
  { code: 'grooming', label: 'Higiena osobista',              options: [0,5] },
  { code: 'toilet',   label: 'Korzystanie z toalety',         options: [0,5,10] },
  { code: 'bathing',  label: 'Mycie / kąpiel',                options: [0,5] },
  { code: 'mobility', label: 'Poruszanie się',                options: [0,5,10,15] },
  { code: 'stairs',   label: 'Schody',                        options: [0,5,10] },
  { code: 'dressing', label: 'Ubieranie / rozbieranie',       options: [0,5,10] },
  { code: 'bowels',   label: 'Kontrola stolca',               options: [0,5,10] },
  { code: 'bladder',  label: 'Kontrola moczu',                options: [0,5,10] },
] as const;

export function calcBarthelScore(answers: Record<string, number>): number {
  return BARTHEL_ITEMS.reduce((sum, it) => sum + (answers[it.code] ?? 0), 0);
}

// Pomocnicza interpretacja kliniczna (informacyjna; cenę wyznacza CareTier tenanta)
export function barthelBand(score: number): string {
  if (score >= 80) return 'Stan dobry / w dużym stopniu samodzielny';
  if (score >= 60) return 'Stan lekki';
  if (score >= 40) return 'Stan średnio ciężki';
  if (score >= 20) return 'Stan ciężki';
  return 'Stan bardzo ciężki / całkowita zależność';
}
```

---

## SCHEMAT BAZY DANYCH (Prisma)

```prisma
// prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
}
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ─── PLATFORMA / SUPER-ADMIN ──────────────────────────
model PlatformAdmin {
  id           String   @id @default(cuid())
  email        String   @unique
  name         String
  passwordHash String
  createdAt    DateTime @default(now())
}

// ─── TENANT (Dom Seniora) ─────────────────────────────
model Tenant {
  id           String   @id @default(cuid())
  name         String
  slug         String   @unique
  legalName    String?
  nip          String?
  city         String?
  address      String?
  contactEmail String   // dokąd trafiają leady
  contactPhone String?

  // Branding widgetu
  logoUrl      String?
  brandColor   String   @default("#1e3a5f")
  accentColor  String   @default("#C9A84C")
  showPoweredBy Boolean @default(true)

  // Osadzenie widgetu
  allowedDomains Json   @default("[]")   // ["dsseniora.pl", ...]

  // Forma wyniku
  quoteMode    QuoteMode @default(RANGE) // RANGE = widełki "od-do"

  status       TenantStatus @default(TRIAL)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  subscription         Subscription?
  notificationSetting  NotificationSetting?
  users                TenantUser[]
  roomTypes            RoomType[]
  careTiers            CareTier[]
  medicalModifiers     MedicalModifier[]
  addonServices        AddonService[]
  contractDiscounts    ContractDiscount[]
  quotes               Quote[]
}

enum TenantStatus { TRIAL ACTIVE SUSPENDED CANCELLED }
enum QuoteMode    { RANGE EXACT }

// ─── SUBSKRYPCJA (FAZA 1: tylko model danych) ─────────
model Subscription {
  id                 String   @id @default(cuid())
  tenantId           String   @unique
  tenant             Tenant   @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  plan               SubscriptionPlan   @default(BASIC)
  status             SubscriptionStatus @default(TRIALING)
  monthlyQuoteLimit  Int?     // null = bez limitu
  quotesThisPeriod   Int      @default(0)
  periodStart        DateTime @default(now())
  periodEnd          DateTime?
  stripeCustomerId     String?  // FAZA 2
  stripeSubscriptionId String?  // FAZA 2
  createdAt          DateTime @default(now())
  updatedAt          DateTime @updatedAt
}

enum SubscriptionPlan   { BASIC PRO ENTERPRISE }
enum SubscriptionStatus { TRIALING ACTIVE PAST_DUE CANCELLED }

// ─── UŻYTKOWNICY TENANTA ──────────────────────────────
model TenantUser {
  id        String     @id @default(cuid())
  tenantId  String
  tenant    Tenant     @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  email     String     @unique
  name      String
  passwordHash String
  role      TenantRole @default(MANAGER)
  status    UserStatus @default(ACTIVE)
  createdAt DateTime   @default(now())
  updatedAt DateTime   @updatedAt
  accounts  Account[]
  sessions  Session[]
}

enum TenantRole { OWNER MANAGER VIEWER }
enum UserStatus { ACTIVE SUSPENDED }

// ─── TYPY POKOI ───────────────────────────────────────
model RoomType {
  id           String  @id @default(cuid())
  tenantId     String
  tenant       Tenant  @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  code         String  // SINGLE | DOUBLE | TRIPLE
  name         String  // "Pokój 1-osobowy"
  capacity     Int
  basePriceMin Float
  basePriceMax Float
  order        Int     @default(0)
  active       Boolean @default(true)

  @@unique([tenantId, code])
}

// ─── PROGI OPIEKI (schodki kwotowe wg Barthela) ───────
model CareTier {
  id           String @id @default(cuid())
  tenantId     String
  tenant       Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  name         String // "Stan dobry", "Wymaga wsparcia", ...
  barthelMin   Int    // 0-100
  barthelMax   Int    // 0-100
  surchargeMin Float  // dopłata miesięczna OD
  surchargeMax Float  // dopłata miesięczna DO
  order        Int    @default(0)
}

// ─── MODYFIKATORY POZNAWCZO-MEDYCZNE ──────────────────
model MedicalModifier {
  id           String       @id @default(cuid())
  tenantId     String
  tenant       Tenant       @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  code         String       // POZNAWCZY, BLADZENIE, INSULINA, ...
  question     String
  type         ModifierType @default(BOOLEAN)
  options      Json?        // TIERED: [{value,label,surchargeMin,surchargeMax}]
  surchargeMin Float        @default(0)  // BOOLEAN: dopłata gdy "tak"
  surchargeMax Float        @default(0)
  enabled      Boolean      @default(true)
  order        Int          @default(0)

  @@unique([tenantId, code])
}

enum ModifierType { BOOLEAN TIERED }

// ─── USŁUGI DODATKOWE (à la carte) ────────────────────
model AddonService {
  id          String      @id @default(cuid())
  tenantId    String
  tenant      Tenant      @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  name        String
  category    String?     // Rehabilitacja, Medyczne, Komfort, Transport...
  description String?
  priceMin    Float
  priceMax    Float
  billingUnit BillingUnit @default(MONTH)
  active      Boolean     @default(true)
  order       Int         @default(0)
}

enum BillingUnit { MONTH PROCEDURE HOUR DAY }

// ─── RABATY ZA DŁUGOŚĆ UMOWY ──────────────────────────
model ContractDiscount {
  id              String @id @default(cuid())
  tenantId        String
  tenant          Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  monthsMin       Int    // 12, 18, 24, 25 (=">24")
  label           String // "Umowa 12 mies.", "Powyżej 24 mies."
  discountPercent Float
  order           Int    @default(0)
}

// ─── WYCENA / LEAD ────────────────────────────────────
model Quote {
  id        String @id @default(cuid())
  tenantId  String
  tenant    Tenant @relation(fields: [tenantId], references: [id])
  publicId  String @unique @default(cuid())  // do linku PDF/podglądu

  // Dane osoby wycenianej (opcjonalne, minimalizacja danych)
  seniorFirstName String?
  seniorAge       Int?

  // Ocena
  barthelAnswers  Json   // {feeding:10, transfer:15, ...}
  barthelScore    Int
  careTierName    String?
  medicalAnswers  Json   // {POZNAWCZY:"umiarkowana", INSULINA:true, ...}

  // Wybór
  roomTypeCode    String?
  selectedAddons  Json   // [{name, billingUnit, qtyPerMonth, priceMin, priceMax}]
  contractMonths  Int?

  // Wynik
  estimateMin     Float
  estimateMax     Float
  discountPercent Float  @default(0)
  breakdown       Json

  // Lead (dane kontaktowe — tylko za zgodą)
  contactName      String?
  contactPhone     String?
  contactEmail     String?
  consentRodo      Boolean @default(false)
  consentMarketing Boolean @default(false)

  status      QuoteStatus @default(NEW)
  managerNote String?
  overLimit   Boolean     @default(false)  // gdy przekroczono limit abonamentu

  pdfPath     String?
  createdAt   DateTime    @default(now())
  updatedAt   DateTime    @updatedAt

  visit       VisitBooking?
}

enum QuoteStatus { DRAFT NEW CONTACTED VISIT_SCHEDULED WON LOST }

// ─── UMÓWIENIE WIZYTY ─────────────────────────────────
model VisitBooking {
  id            String      @id @default(cuid())
  quoteId       String      @unique
  quote         Quote       @relation(fields: [quoteId], references: [id], onDelete: Cascade)
  preferredDate DateTime
  altDate       DateTime?
  status        VisitStatus @default(REQUESTED)
  notes         String?
  createdAt     DateTime    @default(now())
}

enum VisitStatus { REQUESTED CONFIRMED CANCELLED COMPLETED }

// ─── USTAWIENIA POWIADOMIEŃ ───────────────────────────
model NotificationSetting {
  id            String  @id @default(cuid())
  tenantId      String  @unique
  tenant        Tenant  @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  emailOnNewLead Boolean @default(true)
  emailOnVisit   Boolean @default(true)
  leadEmails     Json    @default("[]")  // dodatkowi odbiorcy poza contactEmail
}

// ─── NEXTAUTH (panele) ────────────────────────────────
model Account {
  id                String  @id @default(cuid())
  userId            String
  user              TenantUser @relation(fields: [userId], references: [id], onDelete: Cascade)
  type              String
  provider          String
  providerAccountId String
  refresh_token     String?
  access_token      String?
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String?
  session_state     String?
  @@unique([provider, providerAccountId])
}

model Session {
  id           String   @id @default(cuid())
  sessionToken String   @unique
  userId       String
  user         TenantUser @relation(fields: [userId], references: [id], onDelete: Cascade)
  expires      DateTime
}

model VerificationToken {
  identifier String
  token      String   @unique
  expires    DateTime
  @@unique([identifier, token])
}
```

---

## STRUKTURA PROJEKTU

```
carequote/
├── app/
│   ├── w/[slug]/                       ← WIDGET (cel iframe), publiczny
│   │   ├── page.tsx                    ← kreator: kroki ankiety + wynik
│   │   └── layout.tsx                  ← layout z brandingiem tenanta
│   ├── q/[publicId]/page.tsx           ← publiczny podgląd wyceny (link z PDF/maila)
│   ├── (auth)/
│   │   ├── logowanie/page.tsx          ← logowanie panelu tenanta
│   │   └── admin-logowanie/page.tsx    ← logowanie super-admina
│   ├── (panel)/                        ← PANEL TENANTA (DSE)
│   │   ├── layout.tsx                  ← sidebar + topbar (branding produktu)
│   │   ├── page.tsx                    ← dashboard (KPI: leady, konwersja)
│   │   ├── leady/
│   │   │   ├── page.tsx                ← lista leadów + filtry + statusy
│   │   │   └── [id]/page.tsx           ← szczegóły leada + wycena + notatki
│   │   ├── wizyty/page.tsx             ← kalendarz / lista wizyt
│   │   └── konfiguracja/
│   │       ├── pokoje/page.tsx
│   │       ├── opieka/page.tsx         ← progi Barthela (schodki)
│   │       ├── medyczne/page.tsx       ← modyfikatory poznawczo-medyczne
│   │       ├── uslugi/page.tsx         ← kreator usług à la carte
│   │       ├── rabaty/page.tsx
│   │       ├── branding/page.tsx       ← logo, kolory, domeny osadzenia
│   │       ├── powiadomienia/page.tsx
│   │       └── osadzenie/page.tsx      ← snippet <script> do skopiowania
│   ├── (admin)/                        ← PANEL SUPER-ADMINA (operator)
│   │   ├── layout.tsx
│   │   ├── page.tsx                    ← lista tenantów + KPI platformy
│   │   ├── tenanci/
│   │   │   ├── page.tsx
│   │   │   ├── nowy/page.tsx
│   │   │   └── [id]/page.tsx           ← edycja tenanta + abonament
│   │   └── abonamenty/page.tsx
│   ├── api/
│   │   ├── auth/[...nextauth]/route.ts
│   │   ├── widget/[slug]/config/route.ts   ← publiczna konfiguracja widgetu (CORS)
│   │   ├── widget/[slug]/quote/route.ts    ← zapis wyceny/leada (CORS, rate-limit)
│   │   ├── quotes/[id]/route.ts            ← panel: odczyt/aktualizacja leada
│   │   ├── quotes/[id]/report/route.ts     ← generacja PDF
│   │   ├── visits/route.ts
│   │   ├── config/rooms/route.ts
│   │   ├── config/care-tiers/route.ts
│   │   ├── config/medical/route.ts
│   │   ├── config/addons/route.ts
│   │   ├── config/discounts/route.ts
│   │   ├── config/branding/route.ts
│   │   ├── admin/tenants/route.ts
│   │   └── admin/tenants/[id]/route.ts
│   ├── embed/route.ts                   ← serwuje embed.js (skrypt osadzający)
│   ├── globals.css
│   └── layout.tsx
├── components/
│   ├── ui/                              ← shadcn/ui
│   ├── widget/
│   │   ├── WidgetShell.tsx              ← kontener + branding (zmienne CSS)
│   │   ├── StepProgress.tsx
│   │   ├── BarthelStep.tsx              ← 10 pozycji (radio/grid)
│   │   ├── MedicalStep.tsx              ← moduł poznawczo-medyczny
│   │   ├── RoomStep.tsx                 ← wybór typu pokoju
│   │   ├── AddonsStep.tsx               ← kreator usług (usługa + częstotliwość)
│   │   ├── ContractStep.tsx             ← długość umowy
│   │   ├── ResultStep.tsx              ← widełki + rozbicie + CTA
│   │   ├── ContactForm.tsx             ← dane kontaktowe + zgody RODO
│   │   └── VisitForm.tsx               ← umówienie wizyty
│   ├── panel/
│   │   ├── Sidebar.tsx
│   │   ├── TopBar.tsx
│   │   ├── KpiCard.tsx
│   │   ├── LeadTable.tsx
│   │   ├── LeadStatusBadge.tsx
│   │   └── config/                     ← edytory cennika
│   │       ├── RoomEditor.tsx
│   │       ├── CareTierEditor.tsx
│   │       ├── MedicalEditor.tsx
│   │       ├── AddonEditor.tsx
│   │       └── DiscountEditor.tsx
│   └── shared/PageHeader.tsx
├── lib/
│   ├── prisma.ts                        ← singleton
│   ├── auth.ts                          ← NextAuth (tenant + super-admin)
│   ├── tenant.ts                        ← rozpoznanie tenanta z sesji / slug
│   ├── barthel.ts                       ← stała skala + scoring
│   ├── pricing.ts                       ← silnik wyceny
│   ├── medical-catalog.ts               ← stały katalog kodów modyfikatorów
│   ├── pdf-quote.tsx                    ← @react-pdf/renderer
│   ├── email.ts                         ← Resend (lead, PDF, wizyta)
│   ├── cors.ts                          ← walidacja allowedDomains
│   └── utils.ts
├── public/
│   └── logo.svg
├── prisma/
│   ├── schema.prisma
│   └── seed.ts
├── .env.local
├── .env.example
├── tailwind.config.ts
├── next.config.ts
└── package.json
```

---

## WIDGET — MECHANIKA OSADZENIA

### Snippet dla DSE (jedna linijka)

```html
<script src="https://widget.carequote.pl/embed.js" data-tenant="solaris" async></script>
```

### Jak działa `embed.js`

1. Czyta `data-tenant` ze swojego tagu `<script>`.
2. Tworzy responsywny `<iframe>` wskazujący na `https://widget.carequote.pl/w/{slug}`.
3. Wstawia iframe w miejscu skryptu (lub do `<div id="carequote-widget">`, jeśli istnieje).
4. Nasłuchuje `postMessage` z iframe i **automatycznie dopasowuje wysokość** (brak podwójnych
   pasków przewijania) oraz obsługuje scroll-to-top przy zmianie kroku.

> Iframe daje pełną izolację stylów (krytyczne na obcych stronach), a integrator i tak widzi
> tylko jedną linijkę `<script>`. To wzorzec stosowany przez Calendly/Typeform.

### API widgetu (publiczne, z CORS)

- `GET /api/widget/[slug]/config` → branding + pokoje + progi + modyfikatory + usługi + rabaty
  (tylko `active/enabled`). Sprawdza `allowedDomains` względem nagłówka `Origin`/`Referer`.
- `POST /api/widget/[slug]/quote` → zapis `Quote`. Rate-limit per IP. Jeśli przekroczono
  `monthlyQuoteLimit` → zapis z `overLimit=true` (wynik nadal pokazany użytkownikowi).

### Bezpieczeństwo

- CORS tylko dla domen z `allowedDomains` tenanta (`lib/cors.ts`).
- Brak danych osobowych do momentu jawnej zgody w `ContactForm`.
- Walidacja Zod całego payloadu wyceny po stronie API (nie ufamy obliczeniom z przeglądarki —
  **wycena liczona ponownie na serwerze** w `POST .../quote`).

---

## KROKI WIDGETU (przepływ użytkownika)

```
Krok 1  — Powitanie + (opcjonalnie) imię i wiek seniora
Krok 2  — Barthel (10 pozycji; może być na 2 ekranach po 5)
Krok 3  — Moduł poznawczo-medyczny (tylko włączone modyfikatory tenanta)
Krok 4  — Wybór typu pokoju (1/2/3-os z cenami "od")
Krok 5  — Usługi dodatkowe (kreator: wybór usługi + częstotliwość dla nie-miesięcznych)
Krok 6  — Długość umowy (12 / 18 / 24 / >24 mies.) → pokazuje rabat
Krok 7  — WYNIK: widełki "od–do" + rozbicie pozycji + interpretacja Barthela
            CTA: [Pobierz PDF na e-mail]  [Umów wizytę]  [Zostaw kontakt]
Krok 8  — Formularz kontaktu + zgody RODO  (warunkowo, po kliknięciu CTA)
```

---

## ROLE I UPRAWNIENIA

```typescript
// Panel tenanta
OWNER   → pełna konfiguracja + leady + wizyty + zarządzanie użytkownikami tenanta
MANAGER → konfiguracja + leady + wizyty
VIEWER  → tylko podgląd leadów i wizyt (bez edycji cennika)

// Platforma
PlatformAdmin → tworzenie/edycja tenantów, abonamenty, podgląd KPI platformy
                (NIE widzi danych osobowych leadów poszczególnych tenantów)

// Użytkownik końcowy widgetu → anonimowy, bez konta
```

---

## OUTPUT (wszystko w MVP)

1. **PDF wyceny** — `@react-pdf/renderer`, generowany w `/api/quotes/[id]/report`.
   Zawiera: branding tenanta, datę, interpretację Barthela (bez szczegółów medycznych
   wrażliwych poza zakresem zgody), wybrany pokój, listę usług, widełki + rabat, dane
   kontaktowe placówki, zastrzeżenie „wycena wstępna, niewiążąca".
2. **Lead dla managera** — zapis `Quote` + e-mail (Resend) na `contactEmail` + `leadEmails`
   z pełną kalkulacją i danymi kontaktowymi (jeśli pozostawione).
3. **Umówienie wizyty** — `VisitBooking` z preferowanym terminem; e-mail do managera i do
   użytkownika. (MVP: prosty wybór terminu z formularza; integracja z kalendarzem — FAZA 2).
4. **Powiadomienie do managera** — e-mail przy nowym leadzie i przy prośbie o wizytę
   (wg `NotificationSetting`).

---

## RODO / OCHRONA DANYCH

- **Administrator danych:** DSE (tenant). **Podmiot przetwarzający:** operator platformy
  (Social Living Europe PSA / Fundacja Divideyou) — wymagana **umowa powierzenia przetwarzania**
  z każdym tenantem. Dodać wzór do onboardingu tenanta.
- **Minimalizacja:** ankieta anonimowa; dane osobowe (imię, telefon, e-mail) zbierane wyłącznie
  po jawnej zgodzie w `ContactForm`. Wycena możliwa bez podania danych.
- **Zgody rozdzielone:** `consentRodo` (przetwarzanie w celu kontaktu — wymagana) oraz
  `consentMarketing` (opcjonalna). Treści zgód i link do polityki prywatności tenanta
  konfigurowalne (FAZA 2; w MVP teksty domyślne).
- **Dane zdrowotne:** odpowiedzi Barthela i modułu medycznego to dane szczególnej kategorii —
  przechowywane powiązane z wyceną, dostęp tylko dla danego tenanta; nie eksponować w PDF
  ponad to, co konieczne.
- **Retencja:** mechanizm usuwania/anonimizacji leadów po X dniach (konfigurowalne — FAZA 2).

---

## ZMIENNE ŚRODOWISKOWE (.env.local)

```bash
# Baza danych — Neon PostgreSQL (TEN SAM PROJEKT NEON CO CAREMAP, OSOBNA BAZA "carequote")
# Skopiuj z dashboardu Neon projektu CareMap (Vercel → Environment Variables).
# DATABASE_URL = pooled (host z -pooler), DIRECT_URL = direct (bez poolera, do migracji).
# Bazę "carequote" utwórz w Neon PRZED pierwszym `prisma db push`.
DATABASE_URL="postgresql://...-pooler.neon.tech/carequote?sslmode=require"
DIRECT_URL="postgresql://...neon.tech/carequote?sslmode=require"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET=""   # openssl rand -base64 32

# Email — Resend (TEN SAM KLUCZ CO CAREMAP)
RESEND_API_KEY=""
EMAIL_FROM="office@bonamcuram.com"
EMAIL_FROM_NAME="CareQuote"

# Aplikacja
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NEXT_PUBLIC_WIDGET_URL="http://localhost:3000"   # prod: https://widget.carequote.pl
NEXT_PUBLIC_APP_NAME="CareQuote"

# Stripe (FAZA 2 — placeholdery)
STRIPE_SECRET_KEY=""
STRIPE_WEBHOOK_SECRET=""
```

---

## DANE STARTOWE (prisma/seed.ts)

```typescript
// Super-admin platformy
const PLATFORM_ADMIN = {
  email: 'p.nykiel@gmail.com',
  name: 'Paweł Nykiel',
  // passwordHash: bcrypt z hasła startowego
};

// Demo tenant (spójny ze światem testowym "Solaris")
const TENANT = {
  name: 'Dom Seniora Solaris',
  slug: 'solaris',
  city: 'Solaris',
  contactEmail: 'kontakt@domseniorasolaris.pl',
  brandColor: '#1e3a5f',
  accentColor: '#C9A84C',
  allowedDomains: ['localhost', 'domseniorasolaris.pl'],
  status: 'TRIAL',
};

const TENANT_MANAGER = {
  email: 'manager@domseniorasolaris.pl',
  name: 'Manager Solaris',
  role: 'OWNER',
};

const SUBSCRIPTION = { plan: 'PRO', status: 'TRIALING', monthlyQuoteLimit: null };

// ─────────────────────────────────────────────────────────────
// POGLĄDOWY CENNIK (DEMO) — spójny, realistyczny dla rynku PL 2025/26.
// Służy jako dane startowe dla tenanta "Solaris". Każdy tenant nadpisuje
// te wartości we własnym konfiguratorze. Kwoty w PLN/miesiąc (o ile nie wskazano inaczej).
// ─────────────────────────────────────────────────────────────

// Pokoje — baza miesięczna (pokój + wyżywienie + podstawowa opieka)
const ROOM_TYPES = [
  { code: 'SINGLE', name: 'Pokój 1-osobowy', capacity: 1, basePriceMin: 5500, basePriceMax: 7000, order: 0 },
  { code: 'DOUBLE', name: 'Pokój 2-osobowy', capacity: 2, basePriceMin: 4500, basePriceMax: 5800, order: 1 },
  { code: 'TRIPLE', name: 'Pokój 3-osobowy', capacity: 3, basePriceMin: 3800, basePriceMax: 4800, order: 2 },
];

// Progi opieki wg Barthela — SCHODKI KWOTOWE (dopłata miesięczna)
const CARE_TIERS = [
  { name: 'Stan dobry',        barthelMin: 80, barthelMax: 100, surchargeMin: 0,    surchargeMax: 0,    order: 0 },
  { name: 'Lekkie wsparcie',   barthelMin: 60, barthelMax: 79,  surchargeMin: 400,  surchargeMax: 700,  order: 1 },
  { name: 'Średnie wsparcie',  barthelMin: 40, barthelMax: 59,  surchargeMin: 900,  surchargeMax: 1400, order: 2 },
  { name: 'Wysokie wsparcie',  barthelMin: 20, barthelMax: 39,  surchargeMin: 1500, surchargeMax: 2300, order: 3 },
  { name: 'Pełna opieka',      barthelMin: 0,  barthelMax: 19,  surchargeMin: 2400, surchargeMax: 3400, order: 4 },
];

// Modyfikatory poznawczo-medyczne (katalog z medical-catalog.ts)
const MEDICAL_MODIFIERS = [
  { code: 'POZNAWCZY', type: 'TIERED', question: 'Stan poznawczy mieszkańca',
    options: [
      { value: 'brak',         label: 'Brak zaburzeń',         surchargeMin: 0,    surchargeMax: 0 },
      { value: 'lagodne',      label: 'Łagodne zaburzenia',    surchargeMin: 300,  surchargeMax: 500 },
      { value: 'umiarkowana',  label: 'Umiarkowana demencja',  surchargeMin: 600,  surchargeMax: 1000 },
      { value: 'zaawansowana', label: 'Zaawansowana demencja', surchargeMin: 1100, surchargeMax: 1900 },
    ], enabled: true, order: 0 },
  { code: 'BLADZENIE',     type: 'BOOLEAN', question: 'Tendencja do oddalania się / ucieczek', surchargeMin: 400, surchargeMax: 800, enabled: true, order: 1 },
  { code: 'AGRESJA',       type: 'BOOLEAN', question: 'Pobudzenie / zachowania agresywne',     surchargeMin: 350, surchargeMax: 700, enabled: true, order: 2 },
  { code: 'INSULINA',      type: 'BOOLEAN', question: 'Cukrzyca wymagająca podawania insuliny', surchargeMin: 250, surchargeMax: 450, enabled: true, order: 3 },
  { code: 'RANY',          type: 'TIERED',  question: 'Rany / odleżyny',
    options: [
      { value: 'brak',   label: 'Brak',                          surchargeMin: 0,   surchargeMax: 0 },
      { value: 'drobne', label: 'Drobne',                        surchargeMin: 200, surchargeMax: 400 },
      { value: 'specj',  label: 'Wymagające specj. pielęgnacji', surchargeMin: 600, surchargeMax: 1100 },
    ], enabled: true, order: 4 },
  { code: 'CEWNIK_STOMIA', type: 'BOOLEAN', question: 'Cewnik / stomia / PEG',                  surchargeMin: 300, surchargeMax: 550,  enabled: true, order: 5 },
  { code: 'TLEN',          type: 'BOOLEAN', question: 'Tlenoterapia',                           surchargeMin: 250, surchargeMax: 500,  enabled: true, order: 6 },
  { code: 'LEZACY',        type: 'BOOLEAN', question: 'Osoba leżąca (podnośnik / 2 osoby)',     surchargeMin: 700, surchargeMax: 1300, enabled: true, order: 7 },
  { code: 'DIETA',         type: 'BOOLEAN', question: 'Dieta specjalna (miksowana / PEG)',      surchargeMin: 150, surchargeMax: 350,  enabled: true, order: 8 },
];

// Usługi dodatkowe à la carte (jednostka rozliczenia: MONTH | PROCEDURE | HOUR | DAY)
const ADDON_SERVICES = [
  { name: 'Rehabilitacja indywidualna', category: 'Rehabilitacja', priceMin: 120, priceMax: 180, billingUnit: 'PROCEDURE', order: 0 },
  { name: 'Fizjoterapia',               category: 'Rehabilitacja', priceMin: 100, priceMax: 160, billingUnit: 'PROCEDURE', order: 1 },
  { name: 'Opieka indywidualna 1:1',    category: 'Medyczne',      priceMin: 40,  priceMax: 60,  billingUnit: 'HOUR',      order: 2 },
  { name: 'Transport medyczny',         category: 'Transport',     priceMin: 80,  priceMax: 150, billingUnit: 'PROCEDURE', order: 3 },
  { name: 'Fryzjer / kosmetyczka',      category: 'Komfort',       priceMin: 50,  priceMax: 100, billingUnit: 'PROCEDURE', order: 4 },
  { name: 'Pokój z balkonem (dopłata)', category: 'Komfort',       priceMin: 250, priceMax: 250, billingUnit: 'MONTH',     order: 5 },
];

// Rabaty za długość umowy (progi co ~6 mies.)
const CONTRACT_DISCOUNTS = [
  { monthsMin: 12, label: 'Umowa od 12 mies.',      discountPercent: 3,  order: 0 },
  { monthsMin: 18, label: 'Umowa od 18 mies.',      discountPercent: 6,  order: 1 },
  { monthsMin: 24, label: 'Umowa od 24 mies.',      discountPercent: 9,  order: 2 },
  { monthsMin: 25, label: 'Umowa powyżej 24 mies.', discountPercent: 12, order: 3 },
];
```

---

## REGUŁY IMPLEMENTACYJNE

1. **Język:** polski we wszystkich tekstach UI, błędach, e-mailach i PDF.
2. **Server vs Client Components:** domyślnie Server Components; jako `'use client'` tylko
   widget (kreator), formularze i edytory konfiguracji.
3. **Wycena liczona na serwerze:** widget pokazuje wynik na bieżąco (UX), ale `POST .../quote`
   **przelicza wszystko ponownie** z danych tenanta z bazy. Nigdy nie ufaj kwotom z przeglądarki.
4. **Multi-tenant guard:** każdy endpoint panelu i konfiguracji filtruje po `tenantId` z sesji.
   Brak sesji → 401; obcy `tenantId` → 403. Endpointy widgetu autoryzują przez `slug` + CORS.
5. **Walidacja:** Zod na froncie (react-hook-form) i w API.
6. **Odpowiedzi API:** `{ success: boolean, data?: T, error?: string }`.
7. **Daty:** UTC w bazie, wyświetlanie Europe/Warsaw, `date-fns` z `pl`.
8. **PDF:** generować w API route; wysyłać przez Resend lub zapisać na Vercel Blob; link
   publiczny przez `publicId` (`/q/[publicId]`).
9. **Prisma singleton** (`lib/prisma.ts`):
```typescript
import { PrismaClient } from '@prisma/client';
const g = globalThis as unknown as { prisma: PrismaClient };
export const prisma = g.prisma ?? new PrismaClient();
if (process.env.NODE_ENV !== 'production') g.prisma = prisma;
```
10. **Middleware auth:** chronić `/(panel)/*` (rola tenanta) i `/(admin)/*` (PlatformAdmin)
    osobnymi regułami. `/w/*`, `/q/*`, `/embed`, `/api/widget/*` — publiczne.
11. **embed.js:** serwowany z `Cache-Control` i obsługą `postMessage` (auto-resize).

---

## KOLEJNOŚĆ IMPLEMENTACJI (sprinty)

```
Sprint 1 — Fundament + multi-tenant (tydzień 1):
  [ ] Init Next.js 14 + TS + Tailwind + shadcn/ui + kolory
  [ ] Schemat Prisma + migracja na Neon
  [ ] NextAuth: logowanie panelu tenanta + super-admina (rozdzielone)
  [ ] Middleware ochrony /(panel)/* i /(admin)/*
  [ ] lib/tenant.ts (kontekst tenanta), lib/prisma.ts
  [ ] Layout panelu (sidebar + topbar), strona logowania
  [ ] Seed: super-admin, demo tenant "Solaris", manager, subskrypcja

Sprint 2 — Konfigurator tenanta (tydzień 2):
  [ ] Pokoje (CRUD + ceny)
  [ ] Progi Barthela / schodki kwotowe (CRUD)
  [ ] Modyfikatory poznawczo-medyczne (włącz/wyłącz + kwoty; katalog stały)
  [ ] Usługi à la carte (CRUD + okres rozliczenia)
  [ ] Rabaty za długość umowy (CRUD)
  [ ] Branding (logo, kolory, allowedDomains) + powiadomienia

Sprint 3 — Widget + silnik wyceny (tydzień 3):
  [ ] /w/[slug] z brandingiem tenanta + WidgetShell
  [ ] Kroki: Barthel, moduł medyczny, pokój, usługi (kreator), umowa, wynik
  [ ] lib/barthel.ts + lib/pricing.ts (+ test jednostkowy kalkulacji)
  [ ] GET /api/widget/[slug]/config (CORS) + POST .../quote (przeliczenie serwerowe)
  [ ] Ekran wyniku: widełki + rozbicie + interpretacja

Sprint 4 — Output (tydzień 4):
  [ ] PDF wyceny (@react-pdf) + /q/[publicId]
  [ ] ContactForm + zgody RODO → zapis leada
  [ ] E-mail leada do managera (Resend) wg NotificationSetting
  [ ] VisitForm + VisitBooking + e-maile (manager + użytkownik)

Sprint 5 — Panele zarządcze (tydzień 5):
  [ ] Panel leadów (lista, filtry, statusy, notatki, szczegóły)
  [ ] Panel wizyt
  [ ] Dashboard tenanta (KPI: leady, konwersja, średnia wycena)
  [ ] Panel super-admina: tenanci (CRUD) + abonamenty + KPI platformy

Sprint 6 — Osadzenie + deploy + szlif (tydzień 6):
  [ ] embed.js + auto-resize (postMessage) + izolacja iframe
  [ ] Strona "Osadzenie" w panelu (gotowy snippet do skopiowania)
  [ ] Egzekwowanie limitu abonamentu (overLimit) + rate-limit API widgetu
  [ ] Domeny carequote.pl + widget.carequote.pl na Vercel, zmienne środowiskowe
  [ ] Responsywność widgetu (mobile) + testy E2E kluczowych ścieżek
```

---

## PROMPT STARTOWY DLA CLAUDE CODE

> Skopiuj poniższy tekst i wklej jako pierwsze polecenie w sesji Claude Code
> (po uruchomieniu `claude` w nowym katalogu projektu).

---

```
Zbuduj aplikację CareQuote MVP — komercyjną platformę SaaS (multi-tenant) do wstępnej,
anonimowej wyceny pobytu w domu seniora. Końcowy użytkownik wypełnia osadzony na stronie
placówki widget (ankieta oparta na skali Barthela + moduł poznawczo-medyczny + dobór pokoju
i usług dodatkowych) i otrzymuje wycenę WIDEŁKOWĄ (od–do). Każdy dom seniora to osobny tenant
z własnym cennikiem, usługami i brandingiem.

STOS:
- Next.js 14 App Router + TypeScript
- PostgreSQL (Neon) + Prisma ORM
- NextAuth.js v5 (panel tenanta + panel super-admina, rozdzielone role)
- Tailwind CSS v3 + shadcn/ui
- @react-pdf/renderer (PDF), Resend (email), Zod (walidacja), Recharts (KPI)
- Vercel (hosting). Domeny: carequote.pl (panel), widget.carequote.pl (widget/iframe)

TRZY POWIERZCHNIE:
1. WIDGET publiczny /w/[slug] — anonimowa ankieta + wycena, branding tenanta, osadzany przez iframe
2. PANEL TENANTA /(panel) — konfigurator cennika + leady + wizyty (branding produktu: granat/złoty)
3. PANEL SUPER-ADMINA /(admin) — zarządzanie tenantami i abonamentami

MODEL WYCENY (liczony na serwerze, nigdy nie ufać przeglądarce):
  estymata = bazaPokoju(1/2/3-os) + dopłataBarthel(próg, schodki kwotowe)
           + Σ modyfikatory poznawczo-medyczne + Σ usługi à la carte
           − rabat za długość umowy (progi: 12/18/24/>24 mies.)
  Usługi nie-miesięczne (za zabieg/godzinę/dobę): użytkownik podaje szacowaną liczbę w miesiącu
  → ekwiwalent miesięczny. Wynik zawsze jako widełki "od–do".

BARTHEL: stały, 10 pozycji (lib/barthel.ts), wspólny dla wszystkich tenantów. Wynik 0–100
mapowany na próg opieki (CareTier) tenanta = schodkowa dopłata miesięczna.

DESIGN: panele biało-granatowo-złote (Inter, granat #1e3a5f primary, złoty #C9A84C akcent).
Widget dziedziczy branding tenanta (logoUrl, brandColor, accentColor jako zmienne CSS).
Język: polski.

KROK 1 — inicjalizacja:
1. npx create-next-app@latest carequote --typescript --tailwind --app --src-dir no
2. Zależności:
   npm install prisma @prisma/client next-auth@beta @auth/prisma-adapter bcryptjs
   npm install @react-pdf/renderer resend zod react-hook-form @hookform/resolvers
   npm install recharts date-fns clsx tailwind-merge lucide-react
   npx shadcn@latest init
   npx shadcn@latest add button input select textarea badge card table tabs
   npx shadcn@latest add dialog sheet dropdown-menu toast progress skeleton
   npx shadcn@latest add form label separator avatar alert radio-group checkbox slider
3. Tailwind: dodaj kolory navy i gold.
4. prisma/schema.prisma — pełny schemat multi-tenant (Tenant, Subscription, TenantUser,
   RoomType, CareTier, MedicalModifier, AddonService, ContractDiscount, Quote, VisitBooking,
   NotificationSetting, PlatformAdmin, NextAuth: Account/Session/VerificationToken).
5. .env.local z placeholderami. UWAGA BAZA: ten sam projekt Neon co CareMap, ale OSOBNA baza
   "carequote" (utwórz ją w dashboardzie Neon przed migracją). DATABASE_URL = pooled,
   DIRECT_URL = direct; oba wskazują na /carequote. Klucz Resend i nadawca jak w CareMap
   (office@bonamcuram.com). Realnych connection stringów nie commituj — tylko .env.local i Vercel.
6. prisma/seed.ts: super-admin (Paweł Nykiel, p.nykiel@gmail.com), demo tenant "Dom Seniora
   Solaris" (slug: solaris), manager, subskrypcja PRO, 3 pokoje, 5 progów Barthela,
   9 modyfikatorów medycznych, 6 usług, 4 rabaty (wartości z dokumentacji).
7. lib/prisma.ts (singleton), lib/auth.ts (NextAuth, dwa konteksty), lib/tenant.ts,
   lib/barthel.ts, lib/pricing.ts, lib/medical-catalog.ts, lib/utils.ts.
8. middleware.ts: chroń /(panel)/* (TenantUser) i /(admin)/* (PlatformAdmin); /w/*, /q/*,
   /embed, /api/widget/* publiczne.
9. Layout panelu tenanta (sidebar: Dashboard, Leady, Wizyty, Konfiguracja) + topbar.
10. Strony logowania: /logowanie (tenant) i /admin-logowanie (super-admin).

Po kroku 1 — upewnij się, że baza "carequote" istnieje w projekcie Neon, następnie uruchom
npx prisma db push i npx prisma db seed, pokaż strukturę katalogów i działające logowanie
do panelu tenanta.
```

---

*Dokumentacja wygenerowana: maj 2026*
*Wersja MVP: 1.0 | Produkt: CareQuote (nazwa robocza) | Model: SaaS multi-tenant*
*Stos: Next.js 14 + PostgreSQL + Vercel | Standalone → migracja do CareMap (FAZA 2)*
