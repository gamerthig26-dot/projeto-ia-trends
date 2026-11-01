import { ProductItem } from './mercadolivre';

export async function fetchAmazon(term: string): Promise<{ data: ProductItem[]; status: string }> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    const res = await fetch(
      `https://www.amazon.com.br/s?k=${encodeURIComponent(term)}`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept-Language': 'pt-BR,pt;q=0.9',
          Accept: 'text/html',
        },
        signal: controller.signal,
      }
    );
    clearTimeout(timeout);
    if (!res.ok) return { data: [], status: 'indisponível' };

    const html = await res.text();
    const items: ProductItem[] = [];

    // Basic regex parsing for Amazon search results
    const cardRegex = /data-asin="([A-Z0-9]+)"[^>]*>.*?<span[^>]*class="a-text-normal"[^>]*>\s*([^<]+)/gs;
    const priceRegex = /a-price-whole">([\d.,]+)/g;
    let match;
    const prices: string[] = [];
    let pm;
    while ((pm = priceRegex.exec(html)) !== null) {
      prices.push(pm[1]?.replace('.', '').replace(',', '.') ?? '');
    }

    let idx = 0;
    while ((match = cardRegex.exec(html)) !== null && idx < 10) {
      const asin = match[1];
      const name = match[2]?.trim() ?? '';
      if (name && asin && asin !== 'undefined') {
        items.push({
          name,
          marketplace: 'Amazon',
          price: prices[idx] ? `R$ ${parseFloat(prices[idx]).toFixed(2)}` : '',
          url: `https://www.amazon.com.br/dp/${asin}`,
          rawData: { asin, dado_observado: true },
        });
        idx++;
      }
    }

    return { data: items, status: items.length > 0 ? 'coletado' : 'parcial' };
  } catch {
    return { data: [], status: 'indisponível' };
  }
}
