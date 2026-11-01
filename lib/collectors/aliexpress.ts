import { ProductItem } from './mercadolivre';

export async function fetchAliExpress(term: string): Promise<{ data: ProductItem[]; status: string }> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    const res = await fetch(
      `https://pt.aliexpress.com/w/wholesale-${encodeURIComponent(term.replace(/ /g, '-'))}.html`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          Accept: 'text/html',
          'Accept-Language': 'pt-BR,pt;q=0.9',
        },
        signal: controller.signal,
      }
    );
    clearTimeout(timeout);
    if (!res.ok) return { data: [], status: 'indisponível' };

    const html = await res.text();
    const items: ProductItem[] = [];

    // Extract product data from script tags or HTML
    const titleRegex = /class="[^"]*multi--titleText[^"]*"[^>]*>([^<]+)/g;
    const priceRegex = /class="[^"]*multi--price-sale[^"]*"[^>]*>[^<]*<[^>]*>([^<]+)/g;
    const titles: string[] = [];
    const prices: string[] = [];
    let m;
    while ((m = titleRegex.exec(html)) !== null) titles.push(m[1]?.trim() ?? '');
    while ((m = priceRegex.exec(html)) !== null) prices.push(m[1]?.trim() ?? '');

    for (let i = 0; i < Math.min(titles.length, 10); i++) {
      if (titles[i]) {
        items.push({
          name: titles[i],
          marketplace: 'AliExpress',
          price: prices[i] ? `R$ ${prices[i]}` : '',
          url: 'https://pt.aliexpress.com',
          rawData: { dado_observado: true },
        });
      }
    }

    return { data: items, status: items.length > 0 ? 'coletado' : 'parcial' };
  } catch {
    return { data: [], status: 'indisponível' };
  }
}
