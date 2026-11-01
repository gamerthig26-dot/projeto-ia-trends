export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { callLLM } from '@/lib/llm';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const searchId = body?.searchId;
    if (!searchId) return NextResponse.json({ error: 'searchId obrigatório' }, { status: 400 });

    const search = await prisma.search.findUnique({
      where: { id: searchId },
      include: { trends: true, products: true },
    });
    if (!search) return NextResponse.json({ error: 'Pesquisa não encontrada' }, { status: 404 });

    const trends = search?.trends ?? [];
    const products = search?.products ?? [];

    if (trends.length === 0 || products.length === 0) {
      return NextResponse.json({ error: 'Sem tendências ou produtos para cruzar' }, { status: 400 });
    }

    const trendsSummary = trends.slice(0, 10).map((t: any) => `- ${t?.title} (${t?.source}, tipo: ${t?.type})`).join('\n');
    const productsSummary = products.slice(0, 15).map((p: any) => `- ${p?.name} (${p?.marketplace}, ${p?.price || 'preço não informado'})`).join('\n');

    const prompt = `Analise as tendências e produtos abaixo. Identifique as 3 melhores oportunidades de cruzamento tendência × produto para criar anúncios publicitários.

TENDÊNCIAS ENCONTRADAS:
${trendsSummary}

PRODUTOS ENCONTRADOS:
${productsSummary}

Para cada oportunidade, retorne um JSON com este formato:
{
  "oportunidades": [
    {
      "trend_index": 0,
      "product_index": 0,
      "relevancia_topica": 8,
      "adequacao_formato": 7,
      "potencial_comercial": 9,
      "justificativa": "Texto explicando por que esse cruzamento funciona"
    }
  ]
}

Critérios (0-10 cada):
- relevancia_topica: quanto o tema da tendência se relaciona com o produto
- adequacao_formato: se o formato da tendência se adapta bem a um anúncio do produto
- potencial_comercial: potencial de conversão em vendas

Retorne APENAS o JSON, sem markdown.
Responda com raw JSON only. Do not include code blocks, markdown, or any other formatting.`;

    const result = await callLLM(prompt, 'Você é um analista de marketing digital especializado em tendências e oportunidades de publicidade. Responda sempre em português brasileiro.');

    let parsed: any = {};
    try {
      const cleaned = result.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      parsed = JSON.parse(cleaned);
    } catch {
      return NextResponse.json({ error: 'Falha ao parsear resposta da IA', raw: result }, { status: 500 });
    }

    const opportunities = parsed?.oportunidades ?? [];
    const saved = [];

    for (const opp of opportunities.slice(0, 3)) {
      const trendIdx = Math.min(opp?.trend_index ?? 0, trends.length - 1);
      const productIdx = Math.min(opp?.product_index ?? 0, products.length - 1);
      const trend = trends[trendIdx];
      const product = products[productIdx];

      if (!trend || !product) continue;

      const saved_opp = await prisma.opportunity.create({
        data: {
          searchId,
          trendId: trend.id,
          productId: product.id,
          scores: {
            relevancia_topica: opp?.relevancia_topica ?? 0,
            adequacao_formato: opp?.adequacao_formato ?? 0,
            potencial_comercial: opp?.potencial_comercial ?? 0,
            total: ((opp?.relevancia_topica ?? 0) + (opp?.adequacao_formato ?? 0) + (opp?.potencial_comercial ?? 0)),
          },
          justification: opp?.justificativa ?? '',
        },
        include: { trend: true, product: true },
      });
      saved.push(saved_opp);
    }

    return NextResponse.json({ opportunities: saved });
  } catch (err: any) {
    console.error('Opportunities error:', err);
    return NextResponse.json({ error: err?.message ?? 'Erro ao gerar oportunidades' }, { status: 500 });
  }
}
