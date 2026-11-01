'use client';

import { useState, useCallback } from 'react';
import { Loader2, Copy, CheckCircle2, AlertTriangle, Clock, Eye, FileText, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FadeIn, SlideIn } from '@/components/ui/animate';
import { toast } from 'sonner';

interface ScriptGeneratorProps {
  opportunity: {
    id: string;
    trend: { title: string; source: string; type: string };
    product: { name: string; marketplace: string; price: string };
    scores: any;
    justification: string;
  };
}

export function ScriptGenerator({ opportunity }: ScriptGeneratorProps) {
  const [publicoAlvo, setPublicoAlvo] = useState('');
  const [objetivo, setObjetivo] = useState('Vendas');
  const [tomDeVoz, setTomDeVoz] = useState('animado');
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<any>(null);
  const [copied, setCopied] = useState(false);

  const generate = useCallback(async () => {
    setLoading(true);
    setProgress(0);
    setResult(null);
    try {
      const res = await fetch('/api/scripts/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          opportunityId: opportunity?.id,
          publicoAlvo: publicoAlvo || 'público geral',
          objetivo,
          tomDeVoz,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData?.error ?? 'Erro na geração');
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error('Stream indisponível');

      const decoder = new TextDecoder();
      let partialRead = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        partialRead += decoder.decode(value, { stream: true });
        const lines = partialRead.split('\n');
        partialRead = lines.pop() ?? '';
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            try {
              const parsed = JSON.parse(data);
              if (parsed?.status === 'processing') {
                setProgress((prev: number) => Math.min((prev ?? 0) + 2, 95));
              } else if (parsed?.status === 'completed') {
                setResult(parsed?.result ?? null);
                setProgress(100);
                setLoading(false);
                toast.success('Roteiro gerado com sucesso!');
                return;
              } else if (parsed?.status === 'error') {
                throw new Error(parsed?.message ?? 'Erro na geração');
              }
            } catch (parseErr: any) {
              if (parseErr?.message?.includes('Erro')) throw parseErr;
            }
          }
        }
      }
    } catch (err: any) {
      toast.error(err?.message ?? 'Erro ao gerar roteiro');
    } finally {
      setLoading(false);
    }
  }, [opportunity?.id, publicoAlvo, objetivo, tomDeVoz]);

  const copyPrompt = useCallback(async () => {
    const text = result?.prompt_video ?? '';
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success('Prompt copiado!');
      setTimeout(() => setCopied(false), 2000);
    } catch { toast.error('Falha ao copiar'); }
  }, [result]);

  const duration = result?.duracao_estimada_segundos ?? 0;
  const isValidDuration = duration >= 20 && duration <= 30;

  return (
    <div className="space-y-6">
      <FadeIn>
        <div className="space-y-1">
          <h1 className="font-display text-2xl font-bold tracking-tight">Gerar Roteiro Publicitário</h1>
          <p className="text-muted-foreground">
            <span className="text-primary">{opportunity?.trend?.title ?? ''}</span>
            {' × '}
            <span className="text-emerald-400">{opportunity?.product?.name ?? ''}</span>
          </p>
        </div>
      </FadeIn>

      {/* Form */}
      {!result && (
        <SlideIn from="bottom">
          <Card className="bg-card border-border">
            <CardContent className="pt-6 space-y-4">
              <div>
                <Label>Público-alvo</Label>
                <Input
                  placeholder="Ex.: jovens 18-25 que buscam tecnologia acessível"
                  value={publicoAlvo}
                  onChange={(e: any) => setPublicoAlvo(e?.target?.value ?? '')}
                  className="mt-1.5 bg-background"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Objetivo do anúncio</Label>
                  <select
                    className="mt-1.5 w-full rounded-[var(--radius)] border border-border bg-background px-3 py-2 text-sm text-foreground"
                    value={objetivo}
                    onChange={(e: any) => setObjetivo(e?.target?.value ?? 'Vendas')}
                  >
                    <option value="Vendas">Gerar vendas</option>
                    <option value="Cliques">Conseguir cliques</option>
                    <option value="Engajamento">Gerar engajamento</option>
                  </select>
                </div>
                <div>
                  <Label>Tom de voz</Label>
                  <select
                    className="mt-1.5 w-full rounded-[var(--radius)] border border-border bg-background px-3 py-2 text-sm text-foreground"
                    value={tomDeVoz}
                    onChange={(e: any) => setTomDeVoz(e?.target?.value ?? 'animado')}
                  >
                    <option value="animado">Animado</option>
                    <option value="calmo">Calmo</option>
                    <option value="urgente">Urgente</option>
                    <option value="humorístico">Humorístico</option>
                    <option value="profissional">Profissional</option>
                  </select>
                </div>
              </div>
              <Button onClick={generate} disabled={loading} className="w-full" size="lg">
                {loading ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Gerando roteiro... {progress}%</>
                ) : (
                  <><FileText className="w-4 h-4 mr-2" /> Gerar Roteiro com IA</>
                )}
              </Button>
            </CardContent>
          </Card>
        </SlideIn>
      )}

      {/* Result */}
      {result && (
        <FadeIn>
          <div className="space-y-6">
            {/* Duration badge */}
            <div className="flex items-center gap-3">
              <Badge className={isValidDuration ? 'bg-emerald-500/20 text-emerald-300 border-0 text-base px-4 py-1' : 'bg-amber-500/20 text-amber-300 border-0 text-base px-4 py-1'}>
                {isValidDuration ? <CheckCircle2 className="w-4 h-4 mr-1.5" /> : <AlertTriangle className="w-4 h-4 mr-1.5" />}
                <Clock className="w-4 h-4 mr-1" /> {duration}s
              </Badge>
              <span className="text-sm text-muted-foreground">
                {isValidDuration ? 'Duração dentro do intervalo ideal (20-30s)' : 'Duração fora do intervalo ideal'}
              </span>
            </div>

            {/* Gancho */}
            <Card className="bg-primary/10 border-primary/30">
              <CardContent className="py-4">
                <p className="text-xs text-primary font-semibold mb-1">GANCHO INICIAL</p>
                <p className="text-lg font-semibold">{result?.gancho ?? ''}</p>
              </CardContent>
            </Card>

            {/* Scenes */}
            <div className="space-y-4">
              <h3 className="font-display font-semibold text-lg flex items-center gap-2">
                <Eye className="w-5 h-5 text-primary" /> Roteiro cena a cena
              </h3>
              {(result?.roteiro ?? []).map((scene: any, idx: number) => (
                <Card key={idx} className="bg-card border-border">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm">Cena {scene?.cena ?? idx + 1}</CardTitle>
                      <Badge variant="outline" className="font-mono text-xs">{scene?.duracao ?? ''}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">Narração</p>
                      <p className="text-sm">{scene?.narracao ?? ''}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">Texto na tela</p>
                      <p className="text-sm text-primary">{scene?.texto_na_tela ?? ''}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">Visual</p>
                        <p className="text-xs text-muted-foreground">{scene?.sugestao_visual ?? ''}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">Câmera</p>
                        <p className="text-xs text-muted-foreground">{scene?.acao_camera ?? ''}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* CTA */}
            <Card className="bg-emerald-500/10 border-emerald-500/30">
              <CardContent className="py-4">
                <p className="text-xs text-emerald-400 font-semibold mb-1">CHAMADA PARA AÇÃO</p>
                <p className="text-lg font-semibold">{result?.cta ?? ''}</p>
              </CardContent>
            </Card>

            {/* Evidences */}
            <div className="grid md:grid-cols-3 gap-4">
              <Card className="bg-card border-border">
                <CardContent className="pt-4">
                  <p className="text-xs text-emerald-400 font-semibold mb-2 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Dados observados</p>
                  <ul className="space-y-1">
                    {(result?.dados_observados ?? []).map((d: string, i: number) => (
                      <li key={i} className="text-xs text-muted-foreground">• {d}</li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
              <Card className="bg-card border-border">
                <CardContent className="pt-4">
                  <p className="text-xs text-amber-400 font-semibold mb-2 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Estimativas</p>
                  <ul className="space-y-1">
                    {(result?.estimativas ?? []).map((d: string, i: number) => (
                      <li key={i} className="text-xs text-muted-foreground">• {d}</li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
              <Card className="bg-card border-border">
                <CardContent className="pt-4">
                  <p className="text-xs text-red-400 font-semibold mb-2 flex items-center gap-1"><Shield className="w-3 h-3" /> Não verificado</p>
                  <ul className="space-y-1">
                    {(result?.nao_verificado ?? []).map((d: string, i: number) => (
                      <li key={i} className="text-xs text-muted-foreground">• {d}</li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </div>

            {/* Video prompt */}
            <Card className="bg-card border-border">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Prompt para Gerador de Vídeo</CardTitle>
                  <Button variant="outline" size="sm" onClick={copyPrompt}>
                    {copied ? <><CheckCircle2 className="w-4 h-4 mr-1" /> Copiado!</> : <><Copy className="w-4 h-4 mr-1" /> Copiar Prompt</>}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="bg-background rounded-lg p-4 text-sm font-mono whitespace-pre-wrap text-muted-foreground max-h-[400px] overflow-y-auto">
                  {result?.prompt_video ?? ''}
                </div>
              </CardContent>
            </Card>

            {/* Generate another */}
            <Button variant="outline" onClick={() => setResult(null)} className="w-full">
              Gerar outro roteiro para esta oportunidade
            </Button>
          </div>
        </FadeIn>
      )}
    </div>
  );
}
