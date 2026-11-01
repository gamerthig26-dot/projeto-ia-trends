export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    const token = await prisma.mlToken.findUnique({ where: { id: 'singleton' } });
    if (!token) {
      return NextResponse.json({ connected: false });
    }
    const expired = token.expiresAt.getTime() < Date.now();
    return NextResponse.json({
      connected: true,
      expired,
      userId: token.userId,
      expiresAt: token.expiresAt.toISOString(),
    });
  } catch {
    return NextResponse.json({ connected: false });
  }
}
