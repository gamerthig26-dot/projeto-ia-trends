import assert from 'node:assert/strict';
import { parseGoogleTrends, fetchGoogleTrends } from '../lib/collectors/google-trends';

async function main() {
  const now = Date.parse('2026-10-31T12:00:00Z');
  const item = (title: string, date: string) => `<item><title>${title}</title><pubDate>${date}</pubDate><ht:news_item_url>https://example.org/evidencia?a=1&amp;b=2</ht:news_item_url></item>`;
  const xml = `<rss><channel>${item('Recente &amp; válido', '2026-10-31T10:00:00Z')}${item('Semana', '2026-10-28T10:00:00Z')}${item('Antigo', '2026-10-01T10:00:00Z')}${item('Futuro', '2026-11-01T10:00:00Z')}${item('Sem data', '')}${item('Recente &amp; válido', '2026-10-31T10:00:00Z')}</channel></rss>`;
  assert.deepEqual(parseGoogleTrends(xml, '24h', now).map(x => x.title), ['Recente & válido']);
  assert.deepEqual(parseGoogleTrends(xml, '7d', now).map(x => x.title), ['Recente & válido', 'Semana']);
  assert.equal(parseGoogleTrends(xml, '24h', now)[0].url, 'https://example.org/evidencia?a=1&b=2');
  assert.deepEqual(parseGoogleTrends('<rss><channel></channel></rss>', '24h', now), []);
  const originalFetch = globalThis.fetch;
  try {
    globalThis.fetch = async () => new Response('', { status: 503 });
    assert.equal((await fetchGoogleTrends()).status, 'indisponível');
    globalThis.fetch = async () => new Response('<html>erro</html>');
    assert.equal((await fetchGoogleTrends()).status, 'indisponível');
    globalThis.fetch = async () => new Response('<rss><channel></channel></rss>');
    assert.equal((await fetchGoogleTrends()).status, 'sem resultados');
  } finally { globalThis.fetch = originalFetch; }
  console.log('PASSOU: filtros 24h/7d, duplicatas, datas inválidas/futuras, evidências, feed vazio, HTTP 503 e formato inválido. Falhas externas simuladas somente neste teste.');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
