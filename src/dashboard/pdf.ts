import { toast } from 'sonner';

type PrintMeta = Array<{ label: string; value: string }>;

function escapeHtml(s: string) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function getStylesHtml() {
  // Copia styles e links atuais para manter Tailwind/Shadcn no PDF.
  const nodes = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]')) as Array<
    HTMLStyleElement | HTMLLinkElement
  >;

  return nodes
    .map((n) => {
      if (n.tagName.toLowerCase() === 'style') {
        return `<style>${(n as HTMLStyleElement).textContent || ''}</style>`;
      }
      const link = n as HTMLLinkElement;
      const href = link.href;
      if (!href) return '';
      return `<link rel="stylesheet" href="${href}">`;
    })
    .join('\n');
}

function buildPrintCss() {
  return `
    @page { size: A4; margin: 12mm; }
    html, body { background: white !important; }
    [data-no-print], .no-print, .backend-hint { display: none !important; }
    .print-avoid-break { break-inside: avoid; page-break-inside: avoid; }
    .print-header { display:flex; justify-content:space-between; align-items:flex-start; gap:16px; }
    .print-title { font-size: 16px; font-weight: 700; margin: 0; }
    .print-subtitle { font-size: 12px; color: #6b7280; margin: 4px 0 0 0; }
    .print-meta { margin-top: 10px; display:flex; flex-wrap:wrap; gap:8px; }
    .print-pill { font-size: 11px; color:#374151; background:#f3f4f6; padding:6px 10px; border-radius: 9999px; }
    .print-pill span { color:#6b7280; }
    .print-separator { height: 1px; background:#e5e7eb; margin: 12px 0; }
  `;
}

function openPrintWindow(html: string, title: string) {
  const w = window.open('', '_blank', 'noopener,noreferrer');
  if (!w) {
    toast.error('Não foi possível abrir a janela de impressão. Verifique o bloqueador de pop-ups.');
    return null;
  }
  w.document.open();
  w.document.write(html);
  w.document.close();
  w.document.title = title;
  return w;
}

export function printHtmlToPdf({
  title,
  subtitle,
  meta,
  contentHtml,
}: {
  title: string;
  subtitle?: string;
  meta?: PrintMeta;
  contentHtml: string;
}) {
  const stylesHtml = getStylesHtml();
  const css = buildPrintCss();

  const metaHtml = (meta || [])
    .filter((m) => m.value)
    .map((m) => `<div class="print-pill"><span>${escapeHtml(m.label)}:</span> ${escapeHtml(m.value)}</div>`)
    .join('');

  const html = `
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        ${stylesHtml}
        <style>${css}</style>
      </head>
      <body>
        <div>
          <div class="print-header">
            <div>
              <h1 class="print-title">${escapeHtml(title)}</h1>
              ${subtitle ? `<p class="print-subtitle">${escapeHtml(subtitle)}</p>` : ''}
            </div>
          </div>
          ${metaHtml ? `<div class="print-meta">${metaHtml}</div>` : ''}
          <div class="print-separator"></div>
          ${contentHtml}
        </div>
        <script>
          window.addEventListener('load', () => {
            setTimeout(() => window.print(), 50);
          });
        </script>
      </body>
    </html>
  `;

  const w = openPrintWindow(html, title);
  if (!w) return;
  toast.success('Abrindo impressão (PDF)...');
}

export function printElementToPdf({
  element,
  title,
  subtitle,
  meta,
}: {
  element: HTMLElement;
  title: string;
  subtitle?: string;
  meta?: PrintMeta;
}) {
  const wrapper = `<div>${element.outerHTML}</div>`;
  printHtmlToPdf({ title, subtitle, meta, contentHtml: wrapper });
}
