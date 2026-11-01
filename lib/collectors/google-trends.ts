export interface TrendItem {
  title: string;
  source: string;
  type: string;
  url: string;
  rawData: Record<string, any>;
}

export interface TrendCollection {
  data: TrendItem[];
  status: string;
  message: string;
}

const FEED_URL = 'https://trends.google.com/trending/rss?geo=BR';

function xmlText(block: string, tag: string): string {
  const value = block.match(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`))?.[1] ?? '';
  return value.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&#(x[0-9a-f]+|[0-9]+);/gi, (match, code: string) => {
      const point = code.toLowerCase().startsWith('x') ? parseInt(code.slice(1), 16) : Number(code);
      return point >= 0 && point <= 0x10ffff ? String.fromCodePoint(point) : match;
    })
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'").replace(/&amp;/g, '&').trim();
}

export function parseGoogleTrends(xml: string, period: '24h' | '7d', now: number): TrendItem[] {
  const cutoff = now - (period === '7d' ? 7 : 1) * 24 * 60 * 60 * 1000;
  const items: TrendItem[] = [];
  const seen = new Set<string>();
  for (const match of xml.matchAll(/<item>([\s\S]*?)<\/item>/g)) {
    const block = match[1];
    const title = xmlText(block, 'title');
    const published = Date.parse(xmlText(block, 'pubDate'));
    // An undated or future item cannot establish evidence within the requested window.
    if (!title || seen.has(title) || !Number.isFinite(published) || published < cutoff || published > now) continue;
    seen.add(title);
    const evidence = xmlText(block, 'ht:news_item_url');
    items.push({
      title,
      source: 'Google Trends',
      type: 'interesse de busca',
      url: /^https?:\/\//.test(evidence) ? evidence : FEED_URL,
      rawData: {
        titulo_original: title,
        publicado_em: new Date(published).toISOString(),
        coletado_em: new Date(now).toISOString(),
        fonte_url: FEED_URL,
        trafego_aproximado_informado_pela_fonte: xmlText(block, 'ht:approx_traffic') || null,
        limitacao: 'Interesse de busca, não evidência de vídeo viral ou de vendas. O RSS recente não garante cobertura integral dos últimos 7 dias.',
      },
    });
  }
  return items;
}

export async function fetchGoogleTrends(period: '24h' | '7d' = '24h'): Promise<TrendCollection> {
  try {
    const res = await fetch(FEED_URL, {
      headers: { 'User-Agent': 'IA-Trends/1.0', Accept: 'application/rss+xml, application/xml, text/xml' },
      signal: AbortSignal.timeout(15000),
      cache: 'no-store',
    });
    if (!res.ok) {
      console.error('[Google Trends] HTTP', res.status);
      return { data: [], status: 'indisponível', message: `Google Trends retornou HTTP ${res.status}. Nenhum dado foi inventado.` };
    }
    const xml = await res.text();
    if (!xml.includes('<rss') || !xml.includes('<channel>')) throw new Error('Formato RSS inválido');
    const items = parseGoogleTrends(xml, period, Date.now());
    return {
      data: items,
      status: items.length ? (period === '7d' ? 'parcial' : 'coletado') : 'sem resultados',
      message: items.length
        ? 'Interesses de busca com data dentro do período selecionado. O feed contém apenas registros recentes: não comprova vídeos virais, vendas ou cobertura integral de 7 dias.'
        : 'O feed não forneceu registros com data válida dentro do período selecionado.',
    };
  } catch (error) {
    console.error('[Google Trends] Falha na coleta:', error);
    return { data: [], status: 'indisponível', message: 'Não foi possível ler o feed do Google Trends. A conexão expirou ou a resposta era inválida.' };
  }
}
