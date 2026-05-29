# CareQuote

Platforma SaaS (multi-tenant) do **wstępnej, anonimowej wyceny pobytu** w domach seniora,
prywatnych domach opieki i placówkach całodobowych w Polsce.

Końcowy użytkownik wypełnia osadzony na stronie placówki widget (ankieta oparta na skali
Barthela + moduł poznawczo-medyczny + dobór pokoju i usług dodatkowych) i otrzymuje wycenę
**widełkową** (od–do). Każda placówka to osobny **tenant** z własnym cennikiem, usługami
i brandingiem.

> Pełna specyfikacja produktu i architektury znajduje się w [`docs/CareQuote_Dokumentacja.md`](docs/CareQuote_Dokumentacja.md).

## Stos technologiczny

- **Next.js 16** (App Router, TypeScript) + React 19
- **PostgreSQL** (Neon) + **Prisma 7** (adapter `@prisma/adapter-pg`)
- **NextAuth.js v5** (Auth.js) — panel tenanta + panel super-admina (rozdzielone role)
- **Tailwind CSS v4** + shadcn/ui (Radix)
- **@react-pdf/renderer** (PDF), **Resend** (e-mail), **Zod** (walidacja), **Recharts** (KPI)

## Trzy powierzchnie aplikacji

| Powierzchnia | Ścieżka | Opis |
|---|---|---|
| **Widget** (publiczny) | `/w/[slug]` | Anonimowa ankieta + wycena, branding tenanta, osadzany przez iframe |
| **Panel tenanta** | `/dashboard`, `/leady`, `/wizyty`, `/konfiguracja` | Konfigurator cennika, leady, wizyty |
| **Panel super-admina** | `/admin` | Zarządzanie tenantami i abonamentami |

## Uruchomienie lokalne

### Wymagania
- Node.js 20+ (testowane na 22)
- Baza PostgreSQL (np. Neon) — osobna baza `carequote`

### Kroki

```bash
# 1. Zależności
npm install

# 2. Zmienne środowiskowe
cp .env.example .env.local
# uzupełnij DATABASE_URL, DIRECT_URL, AUTH_SECRET (openssl rand -base64 32),
# RESEND_API_KEY itd.

# 3. Schemat bazy + dane startowe
npm run db:push
npm run db:seed

# 4. Serwer deweloperski
npm run dev
```

Aplikacja wystartuje na http://localhost:3000.

### Dostępne skrypty

| Skrypt | Działanie |
|---|---|
| `npm run dev` | Serwer deweloperski (Next + Turbopack) |
| `npm run build` | Build produkcyjny |
| `npm run start` | Serwer produkcyjny |
| `npm run db:push` | Synchronizacja schematu Prisma z bazą |
| `npm run db:seed` | Dane startowe (super-admin, demo tenant „Solaris") |
| `npm run db:studio` | Prisma Studio |

## Zmienne środowiskowe

Zobacz [`.env.example`](.env.example). Najważniejsze:

- `DATABASE_URL` — pooled connection (host z `-pooler`) → runtime
- `DIRECT_URL` — direct connection → migracje Prisma
- `AUTH_SECRET`, `AUTH_URL` — NextAuth v5
- `RESEND_API_KEY`, `RESEND_FROM` — e-maile transakcyjne
- `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_WIDGET_URL`, `NEXT_PUBLIC_APP_NAME`

> **Sekrety nigdy nie trafiają do repo** — tylko do `.env.local` (gitignore) i zmiennych
> środowiskowych na hostingu (Vercel).

## Osadzenie widgetu

Placówka osadza widget jedną linijką:

```html
<script src="https://widget.carequote.pl/embed.js" data-tenant="solaris" async></script>
```

Skrypt tworzy responsywny `<iframe>` wskazujący na `/w/[slug]` i automatycznie dopasowuje
jego wysokość (`postMessage`).

## Struktura projektu

```
app/
  (admin)/        — panel super-admina
  (auth)/         — logowanie (tenant + admin)
  (panel)/        — panel tenanta (dashboard, leady, wizyty, konfiguracja)
  api/            — API widgetu, wycen, PDF, auth
  w/[slug]/       — widget publiczny
  q/[id]/         — publiczny podgląd wyceny
components/       — UI (shadcn), widget, panele
lib/              — pricing, barthel, prisma, auth, email, pdf, rate-limit
prisma/           — schema.prisma + seed.ts
docs/             — dokumentacja produktu
```
