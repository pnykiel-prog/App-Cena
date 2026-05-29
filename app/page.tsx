import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-[var(--background)] to-white">
      <div className="mx-auto max-w-4xl px-6 py-24">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-[var(--primary)] flex items-center justify-center">
            <span className="text-[var(--accent)] font-bold text-lg">C</span>
          </div>
          <span className="text-xl font-semibold tracking-tight text-[var(--primary)]">
            CareQuote
          </span>
        </div>

        <h1 className="mt-12 text-5xl font-bold tracking-tight text-[var(--primary)]">
          Wstępna wycena pobytu w domu seniora
          <span className="block text-[var(--accent)] mt-2">w 5 minut.</span>
        </h1>
        <p className="mt-6 text-lg text-[var(--muted-foreground)] max-w-2xl">
          Komercyjna platforma SaaS dla domów seniora. Osadź widget na swojej
          stronie, a rodziny otrzymają anonimową, widełkową wycenę na podstawie
          skali Barthela, stanu zdrowia i wyboru pokoju.
        </p>

        <div className="mt-10 flex flex-wrap gap-3">
          <Link
            href="/logowanie"
            className="rounded-lg bg-[var(--primary)] px-6 py-3 text-white font-medium hover:bg-[var(--color-navy-light)] transition-colors"
          >
            Panel domu seniora
          </Link>
          <Link
            href="/admin-logowanie"
            className="rounded-lg border border-[var(--primary)] px-6 py-3 text-[var(--primary)] font-medium hover:bg-[var(--secondary)] transition-colors"
          >
            Panel super-admina
          </Link>
          <Link
            href="/w/solaris"
            className="rounded-lg bg-[var(--accent)] px-6 py-3 text-white font-medium hover:bg-[var(--color-gold-dark)] transition-colors"
          >
            Demo widgetu (Solaris)
          </Link>
        </div>

        <div className="mt-24 grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            {
              title: "Multi-tenant",
              body: "Każdy dom seniora to osobne konto z własnym cennikiem i brandingiem widgetu.",
            },
            {
              title: "Skala Barthela",
              body: "Standardowa skala niesamodzielności (0–100) mapowana na progi opieki tenanta.",
            },
            {
              title: "Widełki cenowe",
              body: "Wycena „od–do” liczona po stronie serwera — nigdy przez przeglądarkę.",
            },
          ].map((f) => (
            <div
              key={f.title}
              className="rounded-xl border border-[var(--border)] bg-white p-5"
            >
              <h3 className="font-semibold text-[var(--primary)]">{f.title}</h3>
              <p className="mt-2 text-sm text-[var(--muted-foreground)]">{f.body}</p>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
