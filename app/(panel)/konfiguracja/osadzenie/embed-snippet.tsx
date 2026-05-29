"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Copy, Check, ExternalLink, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";

export function EmbedSnippet({
  slug,
  widgetUrl,
}: {
  slug: string;
  widgetUrl: string;
}) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const directLink = `${widgetUrl}/w/${slug}`;
  const embedJsUrl = `${widgetUrl}/embed.js`;

  const scriptTagSnippet = `<script src="${embedJsUrl}" data-tenant="${slug}" async></script>`;

  const iframeSnippet = `<iframe
  src="${directLink}"
  width="100%"
  height="900"
  frameborder="0"
  style="border:0; max-width: 720px;"
  title="Wycena pobytu"
></iframe>`;

  const fullScriptSnippet = `<div id="carequote-widget" style="max-width:720px;margin:0 auto;"></div>
<script>
  (function() {
    var d = document.getElementById('carequote-widget');
    var i = document.createElement('iframe');
    i.src = '${directLink}';
    i.style.width = '100%';
    i.style.minHeight = '900px';
    i.style.border = '0';
    i.title = 'Wycena pobytu';
    d.appendChild(i);
  })();
</script>`;

  function copy(text: string, key: string) {
    navigator.clipboard
      .writeText(text)
      .then(() => {
        setCopiedKey(key);
        toast.success("Skopiowano");
        setTimeout(() => setCopiedKey(null), 2000);
      })
      .catch(() => toast.error("Nie udało się skopiować"));
  }

  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
            Bezpośredni link
          </h3>
          <Button asChild variant="outline" size="sm">
            <a href={directLink} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-3.5 w-3.5" />
              Otwórz widget
            </a>
          </Button>
        </div>
        <div className="flex gap-2">
          <code className="flex-1 rounded-md bg-[var(--secondary)] px-3 py-2 text-sm font-mono break-all">
            {directLink}
          </code>
          <Button
            variant="outline"
            size="sm"
            onClick={() => copy(directLink, "link")}
          >
            {copiedKey === "link" ? (
              <Check className="h-4 w-4" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </Button>
        </div>
      </section>

      <Separator />

      <section className="space-y-3">
        <div className="flex items-center gap-2 flex-wrap">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
            Snippet z embed.js (rekomendowany)
          </h3>
          <Badge variant="accent">
            <Sparkles className="h-3 w-3 mr-1" />
            Auto-resize
          </Badge>
        </div>
        <p className="text-sm text-[var(--muted-foreground)]">
          Jedna linijka — widget sam dostosowuje wysokość iframe do treści.
          Nie pojawiają się podwójne paski przewijania.
        </p>
        <div className="relative">
          <pre className="rounded-md bg-[var(--secondary)] p-4 text-xs font-mono overflow-x-auto whitespace-pre-wrap">
            {scriptTagSnippet}
          </pre>
          <Button
            variant="outline"
            size="sm"
            className="absolute top-2 right-2"
            onClick={() => copy(scriptTagSnippet, "embedjs")}
          >
            {copiedKey === "embedjs" ? (
              <Check className="h-4 w-4" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
            {copiedKey === "embedjs" ? "Skopiowano" : "Kopiuj"}
          </Button>
        </div>
        <details className="text-xs text-[var(--muted-foreground)]">
          <summary className="cursor-pointer hover:text-[var(--primary)]">
            Dodatkowe atrybuty (opcjonalnie)
          </summary>
          <ul className="mt-2 space-y-1 list-disc list-inside pl-2">
            <li>
              <code>data-max-width</code> — szerokość kontenera (domyślnie{" "}
              <code>720px</code>)
            </li>
            <li>
              <code>data-min-height</code> — wysokość minimalna iframe przed
              pomiarem (domyślnie <code>900px</code>)
            </li>
            <li>
              <code>data-url</code> — URL widgetu (jeśli osadzasz z własnej
              domeny bez DNS)
            </li>
          </ul>
        </details>
      </section>

      <Separator />

      <section className="space-y-3">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
          Snippet iframe (alternatywa, stała wysokość)
        </h3>
        <p className="text-sm text-[var(--muted-foreground)]">
          Klasyczny iframe — przyda się gdy CMS placówki blokuje znaczniki{" "}
          <code>&lt;script&gt;</code>.
        </p>
        <div className="relative">
          <pre className="rounded-md bg-[var(--secondary)] p-4 text-xs font-mono overflow-x-auto">
            {iframeSnippet}
          </pre>
          <Button
            variant="outline"
            size="sm"
            className="absolute top-2 right-2"
            onClick={() => copy(iframeSnippet, "iframe")}
          >
            {copiedKey === "iframe" ? (
              <Check className="h-4 w-4" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
            {copiedKey === "iframe" ? "Skopiowano" : "Kopiuj"}
          </Button>
        </div>
      </section>

      <Separator />

      <section className="space-y-3">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
          Snippet z &lt;div&gt; + inline script (bez resize)
        </h3>
        <div className="relative">
          <pre className="rounded-md bg-[var(--secondary)] p-4 text-xs font-mono overflow-x-auto">
            {fullScriptSnippet}
          </pre>
          <Button
            variant="outline"
            size="sm"
            className="absolute top-2 right-2"
            onClick={() => copy(fullScriptSnippet, "fullscript")}
          >
            {copiedKey === "fullscript" ? (
              <Check className="h-4 w-4" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
            {copiedKey === "fullscript" ? "Skopiowano" : "Kopiuj"}
          </Button>
        </div>
      </section>

      <Separator />

      <section className="space-y-3">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
          Podgląd na żywo
        </h3>
        <div className="rounded-lg border border-[var(--border)] overflow-hidden bg-[var(--secondary)] p-2">
          <iframe
            src={directLink}
            width="100%"
            height="600"
            style={{ border: 0, borderRadius: 6, background: "white" }}
            title="Podgląd widgetu"
          />
        </div>
      </section>
    </div>
  );
}
