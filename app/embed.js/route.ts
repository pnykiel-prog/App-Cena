// Embed snippet — jeden tag <script> ładuje widget przez iframe + auto-resize.
// Cache 1h. Server-rendered jako application/javascript.

import { NextResponse } from "next/server";

export const dynamic = "force-static";
export const revalidate = 3600;

function buildScript(defaultWidgetUrl: string): string {
  return `/* CareQuote embed v1 */
(function() {
  var self = document.currentScript;
  if (!self) {
    var scripts = document.getElementsByTagName('script');
    self = scripts[scripts.length - 1];
  }
  var tenant = self.getAttribute('data-tenant');
  var widgetUrl = self.getAttribute('data-url') || ${JSON.stringify(defaultWidgetUrl)};
  var maxWidth = self.getAttribute('data-max-width') || '720px';
  var minHeight = self.getAttribute('data-min-height') || '900px';

  if (!tenant) {
    console.error('[CareQuote] Brak atrybutu data-tenant w <script>');
    return;
  }

  var container = document.getElementById('carequote-widget');
  if (!container) {
    container = document.createElement('div');
    container.id = 'carequote-widget';
    container.style.maxWidth = maxWidth;
    container.style.margin = '0 auto';
    self.parentNode.insertBefore(container, self);
  }

  var iframe = document.createElement('iframe');
  iframe.src = widgetUrl + '/w/' + tenant;
  iframe.setAttribute('title', 'Wycena pobytu');
  iframe.setAttribute('loading', 'lazy');
  iframe.style.width = '100%';
  iframe.style.minHeight = minHeight;
  iframe.style.border = '0';
  iframe.style.display = 'block';
  container.appendChild(iframe);

  function expectedOrigin() {
    try {
      return new URL(widgetUrl).origin;
    } catch (e) {
      return null;
    }
  }
  var allowedOrigin = expectedOrigin();

  window.addEventListener('message', function(event) {
    if (event.source !== iframe.contentWindow) return;
    if (allowedOrigin && event.origin !== allowedOrigin) return;
    var data = event.data;
    if (!data || typeof data !== 'object') return;

    if (data.type === 'carequote-resize' && typeof data.height === 'number') {
      iframe.style.height = (data.height + 8) + 'px';
      iframe.style.minHeight = 'auto';
    }
    if (data.type === 'carequote-scroll-top') {
      try {
        iframe.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } catch (e) {
        var top = iframe.getBoundingClientRect().top + window.pageYOffset - 20;
        window.scrollTo({ top: top, behavior: 'smooth' });
      }
    }
  }, false);
})();
`;
}

export async function GET(req: Request) {
  const origin = process.env.NEXT_PUBLIC_WIDGET_URL ?? new URL(req.url).origin;
  const body = buildScript(origin);
  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
