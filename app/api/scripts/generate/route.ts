export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { createStreamingLLMRequest } from '@/lib/llm';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const opportunityId = body?.opportunityId;
    const publicoAlvo = body?.publicoAlvo ?? 'público geral';
    const objetivo = body?.objetivo ?? 'Vendas';
    const tomDeVoz = body?.tomDeVoz ?? 'animado';

    if (!opportunityId) {
      return new Response(JSON.stringify({ error: 'opportunityId obrigatório' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const opportunity = await prisma.opportunity.findUnique({
      where: { id: opportunityId },
      include: { trend: true, product: true },
    });

    if (!opportunity) {
      return new Response(JSON.stringify({ error: 'Oportunidade não encontrada' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const systemPrompt = `Você é o analista criativo do IA Trends, especializado em criar roteiros publicitários para vídeos curtos (20-30 segundos).

REGRAS ANTI-ALUCINAÇÃO:
- NÃO invente preços, avaliações, materiais, garantias ou depoimentos
- NÃO afirme métricas de vendas que não foram coletadas
- Marque como [VERIFICAR] qualquer afirmação sem evidência nas fontes
- NÃO copie frases de vídeos de referência
- Extraia apenas princípios criativos gerais
- NÃO invente loja oficial, link de compra, desconto ou urgência

ALGORITMO DE TIMING:
- Velocidade de fala: 130 palavras/minuto (português brasileiro natural)
- Pausa entre cenas: +0.5s por corte
- Ações visuais (mostrar produto, close-up): +1.0s cada
- Fórmula: duracao = (total_palavras / 130 * 60) + (num_cenas * 0.5) + (num_acoes_visuais * 1.0)
- O roteiro DEVE ter entre 20 e 30 segundos
- Se passar de 30s, reduza o texto. Se for menor que 20s, adicione detalhes.

Responda SEMPRE em português brasileiro.`;

    const prompt = `Crie um roteiro publicitário para vídeo curto (20-30 segundos) com as seguintes informações:

TENDÊNCIA: ${opportunity?.trend?.title ?? 'N/A'}
Fonte: ${opportunity?.trend?.source ?? 'N/A'}
Tipo: ${opportunity?.trend?.type ?? 'N/A'}

PRODUTO: ${opportunity?.product?.name ?? 'N/A'}
Marketplace: ${opportunity?.product?.marketplace ?? 'N/A'}
Preço: ${opportunity?.product?.price || 'Não informado'}

PÚBLICO-ALVO: ${publicoAlvo}
OBJETIVO: ${objetivo}
TOM DE VOZ: ${tomDeVoz}

Retorne um JSON com esta estrutura exata:
{
  "gancho": "Frase de gancho para os primeiros 3 segundos",
  "roteiro": [
    {
      "cena": 1,
      "duracao": "0s - 5s",
      "narracao": "Texto exato da narração",
      "texto_na_tela": "Texto que aparece na tela",
      "sugestao_visual": "Descrição da cena visual",
      "acao_camera": "Movimento de câmera",
      "acao_visual": true
    }
  ],
  "cta": "Chamada para ação final",
  "prompt_video": "Prompt completo para gerador de vídeo externo (CapCut AI, Kling, Pika). Formato 9:16, 1080x1920px. Para cada cena: ambiente, personagem, ação, câmera, iluminação, duração. Voz em português brasileiro, tom ${tomDeVoz}. Instruções de edição e ritmo.",
  "dados_observados": ["lista de dados confirmados usados"],
  "estimativas": ["lista de estimativas feitas"],
  "nao_verificado": ["lista de informações que precisam ser verificadas"],
  "duracao_estimada_segundos": 25
}

O roteiro DEVE ter 4 a 6 cenas e duração calculada entre 20 e 30 segundos.
Responda com raw JSON only. Do not include code blocks, markdown, or any other formatting.`;

    const llmReq = createStreamingLLMRequest(prompt, systemPrompt);

    const response = await fetch(llmReq.url, llmReq.init);
    if (!response.ok) {
      return new Response(JSON.stringify({ error: `Erro da API LLM: ${response.status}` }), {
        status: 502,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();
    const encoder = new TextEncoder();

    let buffer = '';
    let partialRead = '';

    const stream = new ReadableStream({
      async start(controller) {
        try {
          if (!reader) {
            controller.close();
            return;
          }
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            partialRead += decoder.decode(value, { stream: true });
            const lines = partialRead.split('\n');
            partialRead = lines.pop() ?? '';
            for (const line of lines) {
              if (llmReq.isDone(line)) {
                // Save to DB and send final result
                try {
                  const cleaned = buffer.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
                  const finalResult = JSON.parse(cleaned);
                  await prisma.script.create({
                    data: {
                      opportunityId,
                      scriptJson: finalResult,
                      durationSeconds: finalResult?.duracao_estimada_segundos ?? 0,
                      videoPrompt: finalResult?.prompt_video ?? '',
                    },
                  });
                  const finalData = JSON.stringify({ status: 'completed', result: finalResult });
                  controller.enqueue(encoder.encode(`data: ${finalData}\n\n`));
                } catch (parseErr: any) {
                  const errData = JSON.stringify({ status: 'completed', result: { raw: buffer, error: 'Parse parcial' } });
                  controller.enqueue(encoder.encode(`data: ${errData}\n\n`));
                }
                controller.close();
                return;
              }
              const content = llmReq.parseChunk(line);
              if (content) {
                buffer += content;
                const progressData = JSON.stringify({ status: 'processing', message: 'Gerando roteiro...' });
                controller.enqueue(encoder.encode(`data: ${progressData}\n\n`));
              }
            }
          }
          // Stream ended without [DONE]
          if (buffer) {
            try {
              const cleaned = buffer.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
              const finalResult = JSON.parse(cleaned);
              await prisma.script.create({
                data: {
                  opportunityId,
                  scriptJson: finalResult,
                  durationSeconds: finalResult?.duracao_estimada_segundos ?? 0,
                  videoPrompt: finalResult?.prompt_video ?? '',
                },
              });
              const finalData = JSON.stringify({ status: 'completed', result: finalResult });
              controller.enqueue(encoder.encode(`data: ${finalData}\n\n`));
            } catch {
              const errData = JSON.stringify({ status: 'error', message: 'Falha ao processar resposta da IA' });
              controller.enqueue(encoder.encode(`data: ${errData}\n\n`));
            }
          }
          controller.close();
        } catch (err: any) {
          console.error('Stream error:', err);
          try {
            const errData = JSON.stringify({ status: 'error', message: err?.message ?? 'Erro no stream' });
            controller.enqueue(encoder.encode(`data: ${errData}\n\n`));
          } catch { /* ignore */ }
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch (err: any) {
    console.error('Script generation error:', err);
    return new Response(JSON.stringify({ error: err?.message ?? 'Erro na geração' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
