import { getValidMLToken } from '@/lib/mercadolivre-auth';

export interface ProductItem {
  name: string;
  marketplace: string;
  price: string;
  url: string;
  rawData: Record<string, any>;
}

/**
 * Pesquisa produtos no Mercado Livre usando a API autenticada.
 * Retorna dados observados; não inventa resultados.
 */
export async function fetchMercadoLivre(term: string): Promise<{ data: ProductItem[]; status: string; message: string }> {
  const token = await getValidMLToken();
  if (!token) {
    return {
      data: [],
      status: 'não autorizado',
      message: 'Mercado Livre não conectado. Autorize o acesso em /auth/mercadolivre.',
    };
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    const res = await fetch(
      `https://api.mercadolibre.com/sites/MLB/search?q=${encodeURIComponent(term)}&sort=relevance&limit=20`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
        signal: controller.signal,
      }
    );
    clearTimeout(timeout);

    if (res.status === 401 || res.status === 403) {
      return {
        data: [],
        status: 'token expirado',
        message: 'Token do Mercado Livre expirado ou sem permissão. Reconecte em /auth/mercadolivre.',
      };
    }

    if (!res.ok) {
      return {
        data: [],
        status: 'erro',
        message: `A API do Mercado Livre retornou HTTP ${res.status}.`,
      };
    }

    const json = await res.json();
    const results = json?.results ?? [];
    const items: ProductItem[] = results.map((r: any) => ({
      name: r?.title ?? '',
      marketplace: 'Mercado Livre',
      price: r?.price ? `R$ ${Number(r.price).toFixed(2)}` : '',
      url: r?.permalink ?? '',
      rawData: {
        condition: r?.condition ?? '',
        sold_quantity: r?.sold_quantity ?? 0,
        available_quantity: r?.available_quantity ?? 0,
        category_id: r?.category_id ?? '',
        thumbnail: r?.thumbnail ?? '',
        dado_observado: true,
      },
    }));

    return {
      data: items,
      status: items.length > 0 ? 'coletado' : 'sem resultados',
      message: items.length > 0
        ? `${items.length} produto(s) encontrado(s) via API autenticada.`
        : 'Nenhum produto encontrado para o termo informado.',
    };
  } catch (err) {
    const msg = err instanceof Error && err.name === 'AbortError'
      ? 'Tempo limite excedido ao consultar o Mercado Livre.'
      : 'Erro ao consultar o Mercado Livre.';
    return { data: [], status: 'erro', message: msg };
  }
}
