export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { fetchGoogleTrends } from '@/lib/collectors/google-trends';
import { fetchMercadoLivre } from '@/lib/collectors/mercadolivre';
import { unavailableSources } from '@/lib/collectors/source-availability';

export async function POST(request: NextRequest) {
  let searchId: string | undefined;
  try {
    const body = await request.json().catch(() => null);
    if (!body || !['24h', '7d'].includes(body.period ?? '24h') ||
        (body.productTerm !== undefined && (typeof body.productTerm !== 'string' || body.productTerm.length > 200))) {
      return NextResponse.json({ error: 'Informe um período válido (24h ou 7d) e um termo de até 200 caracteres.' }, { status: 400 });
    }
    const period: '24h' | '7d' = body.period ?? '24h';
    const productTerm: string = (body.productTerm ?? '').trim();
    const search = await prisma.search.create({ data: { period, status: 'running' } });
    searchId = search.id;

    // --- Tendências (Google Trends) ---
    const googleRes = await fetchGoogleTrends(period);
    if (googleRes.data.length) {
      await prisma.trend.createMany({
        data: googleRes.data.map(t => ({
          searchId: search.id, title: t.title, source: t.source,
          type: t.type, url: t.url, rawData: t.rawData,
        })),
      });
    }

    // --- Produtos (Mercado Livre via API autenticada) ---
    let mlRes = { data: [] as any[], status: 'não consultado', message: '' };
    if (productTerm) {
      mlRes = await fetchMercadoLivre(productTerm);
      if (mlRes.data.length) {
        await prisma.product.createMany({
          data: mlRes.data.map(p => ({
            searchId: search.id,
            name: p.name,
            marketplace: p.marketplace,
            price: p.price,
            url: p.url,
            rawData: p.rawData,
          })),
        });
      }
    } else {
      mlRes.message = 'Nenhum termo de produto informado.';
    }

    const hasTrends = googleRes.data.length > 0;
    const hasProducts = mlRes.data.length > 0;
    const status = hasTrends && hasProducts ? 'completo'
      : hasTrends || hasProducts ? 'parcial'
      : 'sem resultados';

    await prisma.search.update({ where: { id: search.id }, data: { status } });

    return NextResponse.json({
      searchId: search.id,
      status,
      message: status === 'completo'
        ? 'Pesquisa concluída: tendências e produtos coletados.'
        : status === 'parcial'
        ? 'Pesquisa parcial: consulte o detalhe por fonte para saber o que foi coletado.'
        : 'Nenhum resultado verificável foi coletado. Consulte os motivos por fonte.',
      trendSources: { google: googleRes.status, reddit: 'indisponível', youtube: 'indisponível' },
      productSources: {
        mercadolivre: mlRes.status,
        amazon: 'indisponível',
        shopee: 'indisponível',
        aliexpress: 'indisponível',
        tiktokshop: 'não configurado',
      },
      sourceDetails: {
        google: googleRes.message,
        mercadolivre: mlRes.message,
        reddit: unavailableSources.reddit,
        youtube: unavailableSources.youtube,
        amazon: unavailableSources.amazon,
        shopee: unavailableSources.shopee,
        aliexpress: unavailableSources.aliexpress,
        tiktokshop: unavailableSources.tiktokshop,
      },
      trendsCount: googleRes.data.length,
      productsCount: mlRes.data.length,
    });
  } catch (err) {
    console.error('Search error:', err);
    if (searchId) {
      await prisma.search.update({ where: { id: searchId }, data: { status: 'falhou' } })
        .catch(error => console.error('Falha ao registrar erro da pesquisa:', error));
    }
    return NextResponse.json({ error: 'Não foi possível concluir a pesquisa. Tente novamente mais tarde.' }, { status: 500 });
  }
}
