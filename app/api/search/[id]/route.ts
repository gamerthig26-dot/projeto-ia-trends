export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const search = await prisma.search.findUnique({
      where: { id },
      include: {
        trends: true,
        products: true,
        opportunities: {
          include: {
            trend: true,
            product: true,
            scripts: true,
          },
        },
      },
    });
    if (!search) return NextResponse.json({ error: 'Pesquisa não encontrada' }, { status: 404 });
    return NextResponse.json(search);
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? 'Erro' }, { status: 500 });
  }
}
