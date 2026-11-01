import { ProductItem } from './mercadolivre';

export async function fetchShopee(term: string): Promise<{ data: ProductItem[]; status: string }> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    const res = await fetch(
      `https://shopee.com.br/api/v4/search/search_items?keyword=${encodeURIComponent(term)}&limit=10&order=desc&page_type=search&scenario=PAGE_GLOBAL_SEARCH&version=2`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          Accept: 'application/json',
          'Accept-Language': 'pt-BR,pt;q=0.9',
          Referer: 'https://shopee.com.br/',
        },
        signal: controller.signal,
      }
    );
    clearTimeout(timeout);
    if (!res.ok) return { data: [], status: 'indisponível' };

    const json = await res.json();
    const results = json?.items ?? json?.item_cards?.item_card_list ?? [];
    const items: ProductItem[] = [];

    for (const item of results) {
      const info = item?.item_basic ?? item;
      const name = info?.name ?? '';
      const shopId = info?.shopid ?? '';
      const itemId = info?.itemid ?? '';
      const priceRaw = info?.price_min ?? info?.price ?? 0;
      const price = priceRaw ? `R$ ${(Number(priceRaw) / 100000).toFixed(2)}` : '';
      if (name) {
        items.push({
          name,
          marketplace: 'Shopee',
          price,
          url: shopId && itemId ? `https://shopee.com.br/product/${shopId}/${itemId}` : '',
          rawData: { sold: info?.sold ?? 0, rating: info?.item_rating?.rating_star ?? 0, dado_observado: true },
        });
      }
      if (items.length >= 10) break;
    }

    return { data: items, status: items.length > 0 ? 'coletado' : 'parcial' };
  } catch {
    return { data: [], status: 'indisponível' };
  }
}
