"use client";

import { useState } from "react";
import { WidgetWizard } from "./widget-wizard";
import { LangProvider, useT, langFromLocale, type Lang } from "./i18n";
import type { WidgetConfig } from "./types";

// Klient: trzyma wybrany język, renderuje nagłówek + kreator + stopkę pod
// LangProvider. Przełącznik PL/EN widoczny tylko gdy plan ma multiLanguage.
export function WidgetShell({ config }: { config: WidgetConfig }) {
  const [lang, setLang] = useState<Lang>(langFromLocale(config.tenant.locale));

  return (
    <LangProvider lang={lang}>
      <Header
        config={config}
        lang={lang}
        onLang={setLang}
        showToggle={config.tenant.multiLanguage}
      />
      <div className="rounded-2xl border border-[var(--border)] bg-white shadow-xl p-6 md:p-8">
        <WidgetWizard config={config} />
      </div>
      {!config.tenant.hideBranding && <Footer />}
    </LangProvider>
  );
}

function Header({
  config,
  lang,
  onLang,
  showToggle,
}: {
  config: WidgetConfig;
  lang: Lang;
  onLang: (l: Lang) => void;
  showToggle: boolean;
}) {
  const t = useT();
  const tenant = config.tenant;
  return (
    <header className="flex items-center justify-between mb-6">
      <div className="flex items-center gap-3">
        {tenant.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={tenant.logoUrl}
            alt={tenant.name}
            className="h-12 w-12 rounded-lg object-cover"
          />
        ) : (
          <div
            className="h-12 w-12 rounded-lg flex items-center justify-center text-white font-bold text-xl"
            style={{ backgroundColor: "var(--brand)" }}
          >
            {tenant.name[0]}
          </div>
        )}
        <div>
          <p className="font-semibold tracking-tight" style={{ color: "var(--brand)" }}>
            {tenant.name}
          </p>
          <p className="text-xs text-[var(--muted-foreground)]">
            {tenant.city ?? t.headerTagline}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        {showToggle && <LangToggle lang={lang} onLang={onLang} />}
        <span
          className="text-xs uppercase tracking-wider font-medium hidden sm:inline"
          style={{ color: "var(--brand-accent)" }}
        >
          {t.headerTagline}
        </span>
      </div>
    </header>
  );
}

function LangToggle({ lang, onLang }: { lang: Lang; onLang: (l: Lang) => void }) {
  return (
    <div className="inline-flex rounded-md border border-[var(--border)] overflow-hidden text-xs">
      {(["pl", "en"] as Lang[]).map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => onLang(l)}
          className={
            "px-2 py-1 font-medium uppercase transition-colors " +
            (lang === l
              ? "bg-[var(--brand)] text-white"
              : "text-[var(--muted-foreground)] hover:bg-[var(--secondary)]")
          }
          aria-pressed={lang === l}
        >
          {l}
        </button>
      ))}
    </div>
  );
}

function Footer() {
  const t = useT();
  return (
    <footer className="mt-6 text-center text-xs text-[var(--muted-foreground)]">
      {t.poweredBy}{" "}
      <span style={{ color: "var(--brand-accent)" }} className="font-semibold">
        CareQuote
      </span>
    </footer>
  );
}
