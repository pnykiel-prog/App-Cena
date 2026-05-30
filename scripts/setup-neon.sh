#!/usr/bin/env bash
#
# setup-neon.sh — przygotowuje bazę CareQuote na Neon.
#
# Uruchom LOKALNIE (na komputerze z dostępem sieciowym do Neon, port 5432).
# NIE zadziała w środowisku Claude Code on the web — tamtejsze proxy
# przepuszcza tylko HTTP/HTTPS, więc połączenie PostgreSQL (TCP 5432) jest blokowane.
#
# Wymaga: plik .env.local z DATABASE_URL i DIRECT_URL wskazującymi na bazę "carequote",
#         zainstalowane zależności (npm install) oraz psql w PATH.
#
# Użycie:
#   chmod +x scripts/setup-neon.sh
#   ./scripts/setup-neon.sh
#
set -euo pipefail

cd "$(dirname "$0")/.."

echo "→ CareQuote — konfiguracja bazy na Neon"

# 1. Wczytaj .env.local
if [[ ! -f .env.local ]]; then
  echo "✗ Brak pliku .env.local. Skopiuj .env.example do .env.local i uzupełnij dane Neon."
  exit 1
fi

# shellcheck disable=SC1091
set -a; source .env.local; set +a

: "${DATABASE_URL:?Brak DATABASE_URL w .env.local}"
: "${DIRECT_URL:?Brak DIRECT_URL w .env.local}"

# 2. Walidacja: stringi powinny wskazywać na bazę "carequote", nie "neondb"
if [[ "$DIRECT_URL" != *"/carequote"* ]]; then
  echo "⚠ UWAGA: DIRECT_URL nie wskazuje na bazę /carequote (znaleziono inną nazwę)."
  echo "  Dokumentacja zaleca osobną bazę 'carequote' w projekcie Neon, żeby"
  echo "  oddzielić dane CareQuote od CareMap. Zmień końcówkę '/neondb' na '/carequote'."
  read -r -p "  Kontynuować mimo to? [t/N] " ans
  [[ "${ans,,}" == "t" ]] || { echo "Przerwano."; exit 1; }
fi

# 3. Utwórz bazę "carequote" (jeśli nie istnieje).
#    Łączymy się do domyślnej bazy "neondb" przez endpoint DIRECT, bo CREATE DATABASE
#    nie może działać wewnątrz docelowej bazy i nie przechodzi przez pooler.
ADMIN_URL="${DIRECT_URL/\/carequote/\/neondb}"
echo "→ Tworzę bazę 'carequote' (jeśli nie istnieje)…"
if psql "$ADMIN_URL" -tAc "SELECT 1 FROM pg_database WHERE datname='carequote'" | grep -q 1; then
  echo "  ✓ Baza 'carequote' już istnieje."
else
  psql "$ADMIN_URL" -c "CREATE DATABASE carequote;"
  echo "  ✓ Utworzono bazę 'carequote'."
fi

# 4. Schemat Prisma → baza
echo "→ Synchronizuję schemat (prisma db push)…"
npm run db:push

# 5. Dane startowe
echo "→ Ładuję dane startowe (prisma db seed)…"
npm run db:seed

echo ""
echo "✅ Gotowe. Uruchom aplikację: npm run dev → http://localhost:3000"
echo "   Logowanie tenanta:  /logowanie        manager@solaris-senior.pl / manager123"
echo "   Logowanie admina:   /admin-logowanie  p.nykiel@gmail.com / admin123"
