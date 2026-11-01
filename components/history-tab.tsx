'use client';

import { useState, useEffect } from 'react';
import { History, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { SafeDate } from '@/components/safe-format';
import { Stagger, StaggerItem } from '@/components/ui/animate';

interface SearchRecord {
  id: string;
  createdAt: string;
  period: string;
  status: string;
  _count: {
    trends: number;
    products: number;
    opportunities: number;
  };
}

export function HistoryTab() {
  const [searches, setSearches] = useState<SearchRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await fetch('/api/history');
        const data = await res.json();
        setSearches(data?.searches ?? []);
      } catch { /* ignore */ }
      setLoading(false);
    };
    fetchHistory();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (searches.length === 0) {
    return (
      <Card className="bg-card border-border">
        <CardContent className="py-12 text-center">
          <History className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">Nenhuma pesquisa anterior encontrada.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Stagger staggerDelay={0.05}>
      <div className="space-y-3">
        {searches.map((s: SearchRecord) => (
          <StaggerItem key={s?.id}>
            <Card className="bg-card border-border">
              <CardHeader className="py-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <CardTitle className="text-sm">
                      <SafeDate date={s?.createdAt} options={{ dateStyle: 'medium', timeStyle: 'short' }} />
                    </CardTitle>
                    <Badge variant="outline" className="text-xs">{s?.period ?? '24h'}</Badge>
                    <Badge variant={s?.status === 'concluído' ? 'default' : 'secondary'} className="text-xs">{s?.status ?? ''}</Badge>
                  </div>
                  <div className="flex gap-4 text-xs text-muted-foreground">
                    <span>{s?._count?.trends ?? 0} tendências</span>
                    <span>{s?._count?.products ?? 0} produtos</span>
                    <span>{s?._count?.opportunities ?? 0} oportunidades</span>
                  </div>
                </div>
              </CardHeader>
            </Card>
          </StaggerItem>
        ))}
      </div>
    </Stagger>
  );
}
