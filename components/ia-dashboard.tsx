'use client';

import { useState, useCallback } from 'react';
import { TrendingUp, Search, ShoppingBag, Zap, History, Loader2, CheckCircle2, AlertTriangle, XCircle, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { FadeIn, SlideIn, Stagger, StaggerItem } from '@/components/ui/animate';
import { ScriptGenerator } from '@/components/script-generator';
import { HistoryTab } from '@/components/history-tab';
import { SafeDate } from '@/components/safe-format';

interface SourceStatus {
  [key: string]: string;
}

interface TrendData {
  id: string;
  title: string;
  source: string;
  type: string;
  url: string;
  rawData: any;
}

interface ProductData {
  id: string;
  name: string;
  marketplace: string;
  price: string;
  url: string;
  rawData: any;
}

interface OpportunityData {
  id: string;
  scores: any;
  justification: string;
  trend: TrendData;
  product: ProductData;
}

function StatusIcon({ status }: { status: string }) {
  if (status === 'coletado') return <CheckCircle2 className="w-4 h-4 text-emerald-400" />;
  if (status === 'parcial') return <AlertTriangle className="w-4 h-4 text-amber-400" />;
  return <XCircle className="w-4 h-4 text-red-400" />;
}

const sourceLabel: Record<string, string> = {
  google: 'Google Trends',
  reddit: 'Reddit',
  youtube: 'YouTube',
  mercadolivre: 'Mercado Livre',
  amazon: 'Amazon',
  shopee: 'Shopee',
  aliexpress: 'AliExpress',
  tiktokshop: 'TikTok Shop',
};

const typeColor: Record<string, string> = {
  'tendência': 'bg-purple-500/20 text-purple-300',
  'discussão': 'bg-blue-500/20 text-blue-300',
  'vídeo viral': 'bg-red-500/20 text-red-300',
  'geral': 'bg-gray-500/20 text-gray-300',
};

const marketplaceColor: Record<string, string> = {
  'Mercado Livre': 'bg-yellow-500/20 text-yellow-300',
  'Amazon': 'bg-orange-500/20 text-orange-300',
  'Shopee': 'bg-rose-500/20 text-rose-300',
  'AliExpress': 'bg-red-500/20 text-red-300',
};

export function IADashboard() {
  const [period, setPeriod] = useState('24h');
  const [productTerm, setProductTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingOpps, setLoadingOpps] = useState(false);
  const [searchId, setSearchId] = useState<string | null>(null);
  const [trendSources, setTrendSources] = useState<SourceStatus>({});
  const [productSources, setProductSources] = useState<SourceStatus>({});
  const [trends, setTrends] = useState<TrendData[]>([]);
  const [products, setProducts] = useState<ProductData[]>([]);
  const [opportunities, setOpportunities] = useState<OpportunityData[]>([]);
  const [selectedOpp, setSelectedOpp] = useState<OpportunityData | null>(null);
  const [activeTab, setActiveTab] = useState('tendencias');
  const [marketplaceFilter, setMarketplaceFilter] = useState('todos');
  const [sourceDetails, setSourceDetails] = useState<SourceStatus>({});
  const [searchMessage, setSearchMessage] = useState('');
  const [hasSearched, setHasSearched] = useState(false);

  const searchTrends = useCallback(async () => {
    setLoading(true);
    setHasSearched(true);
    setSearchId(null);
    setTrendSources({});
    setProductSources({});
    setSourceDetails({});
    setSearchMessage('');
    setActiveTab('tendencias');
    setMarketplaceFilter('todos');
    setTrends([]);
    setProducts([]);
    setOpportunities([]);
    setSelectedOpp(null);
    try {
      const res = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ period, productTerm }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? 'Erro na pesquisa');

      setSearchId(data?.searchId ?? null);
      setTrendSources(data?.trendSources ?? {});
      setProductSources(data?.productSources ?? {});
      setSourceDetails(data?.sourceDetails ?? {});
      setSearchMessage(data?.message ?? '');

      // Fetch full search data
      if (data?.searchId) {
        const detailRes = await fetch(`/api/search/${data.searchId}`);
        const detail = await detailRes.json();
        if (!detailRes.ok) throw new Error(detail?.error ?? 'Não foi possível carregar os resultados salvos.');
        setTrends(detail?.trends ?? []);
        setProducts(detail?.products ?? []);
      }

      if (data.status === 'completo') toast.success(data.message);
      else toast.warning(data.message ?? 'Pesquisa sem cobertura completa.');
    } catch (err: any) {
      console.error('Falha na pesquisa:', err);
      setSearchMessage(err?.message ?? 'Erro na pesquisa');
      toast.error(err?.message ?? 'Erro na pesquisa');
    } finally {
      setLoading(false);
    }
  }, [period, productTerm]);

  const generateOpportunities = useCallback(async () => {
    if (!searchId) return;
    setLoadingOpps(true);
    try {
      const res = await fetch('/api/opportunities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ searchId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? 'Erro ao gerar oportunidades');
      setOpportunities(data?.opportunities ?? []);
      setActiveTab('oportunidades');
      toast.success('Oportunidades identificadas!');
    } catch (err: any) {
      toast.error(err?.message ?? 'Erro ao gerar oportunidades');
    } finally {
      setLoadingOpps(false);
    }
  }, [searchId]);

  const filteredProducts = marketplaceFilter === 'todos'
    ? products
    : products.filter((p: ProductData) => p?.marketplace === marketplaceFilter);

  const marketplaces = ['todos', ...Array.from(new Set((products ?? []).map((p: ProductData) => p?.marketplace).filter(Boolean)))];

  if (selectedOpp) {
    return (
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-xl">
          <div className="max-w-[1200px] mx-auto px-4 py-3 flex items-center gap-3">
            <div className="bg-primary rounded-lg p-2">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <span className="font-display font-bold text-lg tracking-tight">IA <span className="text-primary">TRENDS</span></span>
            <div className="flex-1" />
            <Button variant="ghost" onClick={() => setSelectedOpp(null)}>← Voltar</Button>
          </div>
        </header>
        <main className="max-w-[1200px] mx-auto px-4 py-8">
          <ScriptGenerator opportunity={selectedOpp} />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="max-w-[1200px] mx-auto px-4 py-3 flex items-center gap-3">
          <div className="bg-primary rounded-lg p-2">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <span className="font-display font-bold text-lg tracking-tight">IA <span className="text-primary">TRENDS</span></span>
        </div>
      </header>

      <main className="max-w-[1200px] mx-auto px-4 py-8 space-y-8">
        {/* Hero section */}
        <FadeIn>
          <div className="space-y-2">
            <Badge className="bg-primary/20 text-primary border-0">PLATAFORMA DE INTELIGÊNCIA CRIATIVA</Badge>
            <h1 className="font-display text-4xl font-bold tracking-tight">Transforme tendências em <span className="text-primary">oportunidades</span>.</h1>
            <p className="text-muted-foreground max-w-2xl">Consulte sinais de interesse e acompanhe a disponibilidade das fontes. Interesses de busca não comprovam vídeos virais nem produtos em alta; o cruzamento depende de tendências e produtos verificáveis.</p>
          </div>
        </FadeIn>

        {/* Search controls */}
        <SlideIn from="bottom">
          <Card className="bg-card border-border">
            <CardContent className="pt-6 space-y-4">
              <div className="flex flex-wrap gap-3 items-end">
                <div className="flex-1 min-w-[200px]">
                  <label className="text-sm font-medium mb-1.5 block">Produto ou termo de busca (opcional)</label>
                  <Input
                    placeholder="Ex: fone bluetooth, smartwatch, massageador..."
                    value={productTerm}
                    onChange={(e: any) => setProductTerm(e?.target?.value ?? '')}
                    className="bg-background border-border"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Período</label>
                  <div className="flex gap-2">
                    <Button
                      variant={period === '24h' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setPeriod('24h')}
                    >
                      Últimas 24h
                    </Button>
                    <Button
                      variant={period === '7d' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setPeriod('7d')}
                    >
                      Últimos 7 dias
                    </Button>
                  </div>
                </div>
                <Button
                  onClick={searchTrends}
                  disabled={loading}
                  className="min-w-[200px]"
                >
                  {loading ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Pesquisando...</>
                  ) : (
                    <><Search className="w-4 h-4 mr-2" /> Pesquisar Tendências</>
                  )}
                </Button>
              </div>

              <p className="text-xs text-muted-foreground">O período filtra as datas dos registros disponíveis. O feed recente não garante cobertura integral de 7 dias. A busca de produtos está indisponível e não usa IA para simular resultados.</p>
              {searchMessage && <p role="status" className="text-sm text-amber-300">{searchMessage}</p>}

              {/* Source status */}
              {(Object.keys(trendSources ?? {}).length > 0 || Object.keys(productSources ?? {}).length > 0) && (
                <div className="grid gap-3 pt-2 md:grid-cols-2">
                  {Object.entries({ ...(trendSources ?? {}), ...(productSources ?? {}) }).map(([key, status]: [string, any]) => (
                    <div key={key} className="text-xs space-y-1">
                      <div className="flex items-center gap-1.5">
                        <StatusIcon status={status} />
                        <span>{sourceLabel[key] ?? key}: {status}</span>
                      </div>
                      <p className="text-muted-foreground">{sourceDetails[key]}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </SlideIn>

        {/* Main content tabs */}
        {hasSearched && !loading && (
          <FadeIn>
            <Tabs value={activeTab} onValueChange={(v: string) => setActiveTab(v)}>
              <TabsList className="bg-muted">
                <TabsTrigger value="tendencias">
                  <TrendingUp className="w-4 h-4 mr-1.5" /> Tendências ({trends?.length ?? 0})
                </TabsTrigger>
                <TabsTrigger value="produtos">
                  <ShoppingBag className="w-4 h-4 mr-1.5" /> Produtos ({products?.length ?? 0})
                </TabsTrigger>
                <TabsTrigger value="oportunidades">
                  <Zap className="w-4 h-4 mr-1.5" /> Oportunidades ({opportunities?.length ?? 0})
                </TabsTrigger>
                <TabsTrigger value="historico">
                  <History className="w-4 h-4 mr-1.5" /> Histórico
                </TabsTrigger>
              </TabsList>

              {/* Tendências */}
              <TabsContent value="tendencias" className="mt-6">
                <Stagger staggerDelay={0.05}>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {(trends ?? []).map((trend: TrendData, idx: number) => (
                      <StaggerItem key={trend?.id ?? `trend-${idx}`}>
                        <Card className="bg-card border-border hover:border-primary/40 transition-colors h-full">
                          <CardHeader className="pb-3">
                            <div className="flex items-start justify-between gap-2">
                              <CardTitle className="text-sm font-semibold leading-tight line-clamp-2">{trend?.title ?? 'Sem título'}</CardTitle>
                            </div>
                            <div className="flex flex-wrap gap-1.5 mt-2">
                              <Badge variant="secondary" className={typeColor[trend?.type ?? 'geral'] ?? typeColor['geral']}>
                                {trend?.type ?? 'geral'}
                              </Badge>
                              <Badge variant="outline" className="text-xs">{trend?.source ?? ''}</Badge>
                            </div>
                          </CardHeader>
                          <CardContent>
                            {trend.rawData?.publicado_em && (
                              <p className="text-xs text-muted-foreground mb-2">Data na fonte: <SafeDate date={trend.rawData.publicado_em} options={{ dateStyle: 'short', timeStyle: 'short' }} /></p>
                            )}
                            {trend.rawData?.limitacao && <p className="text-xs text-muted-foreground mb-2">{trend.rawData.limitacao}</p>}
                            {trend?.url && (
                              <a href={trend.url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline">Ver evidência →</a>
                            )}
                          </CardContent>
                        </Card>
                      </StaggerItem>
                    ))}
                  </div>
                </Stagger>
                {trends.length > 0 && (
                  <div className="mt-6 flex justify-center">
                    <Button onClick={generateOpportunities} disabled={loadingOpps || products.length === 0} size="lg" title={products.length === 0 ? 'É necessário coletar produtos verificáveis antes de cruzar oportunidades.' : undefined}>
                      {loadingOpps ? (
                        <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Analisando cruzamentos...</>
                      ) : (
                        <><Zap className="w-4 h-4 mr-2" /> Gerar Oportunidades com IA</>
                      )}
                    </Button>
                  </div>
                )}
              </TabsContent>

              {/* Produtos */}
              <TabsContent value="produtos" className="mt-6">
                {products.length === 0 && <p className="text-sm text-muted-foreground mb-4">Nenhum produto verificável foi coletado. As fontes de marketplaces precisam de acesso autorizado ou de uma integração validada. Sem produtos, não é possível gerar oportunidades.</p>}
                <div className="flex flex-wrap gap-2 mb-4">
                  {marketplaces.map((mp: string) => (
                    <Button
                      key={mp}
                      variant={marketplaceFilter === mp ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setMarketplaceFilter(mp)}
                    >
                      {mp === 'todos' ? 'Todos' : mp}
                    </Button>
                  ))}
                </div>
                <Stagger staggerDelay={0.05}>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {(filteredProducts ?? []).map((product: ProductData, idx: number) => (
                      <StaggerItem key={product?.id ?? `prod-${idx}`}>
                        <Card className="bg-card border-border hover:border-primary/40 transition-colors h-full">
                          <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-semibold leading-tight line-clamp-2">{product?.name ?? 'Sem nome'}</CardTitle>
                            <div className="flex flex-wrap gap-1.5 mt-2">
                              <Badge className={marketplaceColor[product?.marketplace ?? ''] ?? 'bg-gray-500/20 text-gray-300'}>
                                {product?.marketplace ?? ''}
                              </Badge>
                              {product?.price && (
                                <Badge variant="outline" className="text-xs font-mono">{product.price}</Badge>
                              )}
                            </div>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-1">
                              {(product?.rawData as any)?.dado_observado && (
                                <p className="text-[10px] text-emerald-400">✓ Dado observado na fonte</p>
                              )}
                              {product?.url && (
                                <a href={product.url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline">Ver produto →</a>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      </StaggerItem>
                    ))}
                  </div>
                </Stagger>
              </TabsContent>

              {/* Oportunidades */}
              <TabsContent value="oportunidades" className="mt-6">
                {opportunities.length === 0 ? (
                  <Card className="bg-card border-border">
                    <CardContent className="py-12 text-center">
                      <Zap className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">O cruzamento exige tendências e produtos verificáveis. Consulte a disponibilidade das fontes antes de gerar oportunidades.</p>
                    </CardContent>
                  </Card>
                ) : (
                  <Stagger staggerDelay={0.1}>
                    <div className="grid gap-6">
                      {(opportunities ?? []).map((opp: OpportunityData, idx: number) => {
                        const scores = opp?.scores as any ?? {};
                        return (
                          <StaggerItem key={opp?.id ?? `opp-${idx}`}>
                            <Card className="bg-card border-border hover:border-primary/40 transition-colors">
                              <CardHeader>
                                <div className="flex items-start justify-between">
                                  <div>
                                    <CardTitle className="text-base">
                                      {opp?.trend?.title ?? '?'} × {opp?.product?.name ?? '?'}
                                    </CardTitle>
                                    <CardDescription className="mt-1">
                                      {opp?.trend?.source ?? ''} → {opp?.product?.marketplace ?? ''}
                                    </CardDescription>
                                  </div>
                                  <Badge className="bg-primary/20 text-primary text-lg font-mono border-0">
                                    {scores?.total ?? 0}/30
                                  </Badge>
                                </div>
                              </CardHeader>
                              <CardContent className="space-y-4">
                                <div className="grid grid-cols-3 gap-4">
                                  <div className="text-center">
                                    <div className="text-2xl font-mono font-bold text-primary">{scores?.relevancia_topica ?? 0}</div>
                                    <div className="text-xs text-muted-foreground">Relevância Tópica</div>
                                  </div>
                                  <div className="text-center">
                                    <div className="text-2xl font-mono font-bold text-emerald-400">{scores?.adequacao_formato ?? 0}</div>
                                    <div className="text-xs text-muted-foreground">Adequação Formato</div>
                                  </div>
                                  <div className="text-center">
                                    <div className="text-2xl font-mono font-bold text-amber-400">{scores?.potencial_comercial ?? 0}</div>
                                    <div className="text-xs text-muted-foreground">Potencial Comercial</div>
                                  </div>
                                </div>
                                <p className="text-sm text-muted-foreground">{opp?.justification ?? ''}</p>
                                <Button onClick={() => setSelectedOpp(opp)} className="w-full">
                                  <Sparkles className="w-4 h-4 mr-2" /> Gerar Roteiro
                                </Button>
                              </CardContent>
                            </Card>
                          </StaggerItem>
                        );
                      })}
                    </div>
                  </Stagger>
                )}
              </TabsContent>

              {/* Histórico */}
              <TabsContent value="historico" className="mt-6">
                <HistoryTab />
              </TabsContent>
            </Tabs>
          </FadeIn>
        )}

        {/* Empty state */}
        {trends.length === 0 && products.length === 0 && !loading && (
          <FadeIn>
            <Card className="bg-card border-border">
              <CardContent className="py-16 text-center">
                <TrendingUp className="w-16 h-16 text-primary/30 mx-auto mb-4" />
                <h2 className="font-display text-xl font-semibold mb-2">{hasSearched ? 'Nenhum resultado verificável' : 'Pronto para começar'}</h2>
                <p className="text-muted-foreground max-w-md mx-auto">
                  {hasSearched ? 'Veja os motivos por fonte acima. Nenhum dado foi inventado para preencher os resultados.' : 'Selecione o período e clique em "Pesquisar Tendências" para consultar os sinais disponíveis e as limitações de cada fonte.'}
                </p>
              </CardContent>
            </Card>
          </FadeIn>
        )}
      </main>

      <footer className="border-t border-border py-6 text-center text-sm text-muted-foreground">
        IA Trends · Plataforma de Inteligência Criativa
      </footer>
    </div>
  );
}
