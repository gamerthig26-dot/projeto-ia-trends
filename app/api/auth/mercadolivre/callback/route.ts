export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { exchangeCodeForToken } from '@/lib/mercadolivre-auth';
import { prisma } from '@/lib/db';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');

  if (error) {
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    return NextResponse.redirect(
      `${baseUrl}/auth/mercadolivre?status=error&message=${encodeURIComponent(error)}`
    );
  }

  if (!code || !state) {
    return NextResponse.json({ error: 'Parâmetros ausentes (code ou state).' }, { status: 400 });
  }

  const cookieStore = await cookies();
  const storedState = cookieStore.get('ml_oauth_state')?.value;
  const verifier = cookieStore.get('ml_pkce_verifier')?.value;

  if (!storedState || storedState !== state) {
    return NextResponse.json({ error: 'State inválido. Tente autorizar novamente.' }, { status: 403 });
  }
  if (!verifier) {
    return NextResponse.json({ error: 'PKCE verifier ausente. Tente autorizar novamente.' }, { status: 400 });
  }

  const appId = process.env.ML_APP_ID;
  const clientSecret = process.env.ML_CLIENT_SECRET;
  if (!appId || !clientSecret) {
    return NextResponse.json({ error: 'Credenciais do Mercado Livre não configuradas.' }, { status: 500 });
  }

  const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
  const redirectUri = `${baseUrl}/api/auth/mercadolivre/callback`;

  try {
    const tokenData = await exchangeCodeForToken(appId, clientSecret, code, redirectUri, verifier);
    const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000);

    await prisma.mlToken.upsert({
      where: { id: 'singleton' },
      update: {
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token,
        expiresAt,
        userId: String(tokenData.user_id),
      },
      create: {
        id: 'singleton',
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token,
        expiresAt,
        userId: String(tokenData.user_id),
      },
    });

    // Clean up cookies
    cookieStore.delete('ml_pkce_verifier');
    cookieStore.delete('ml_oauth_state');

    return NextResponse.redirect(
      `${baseUrl}/auth/mercadolivre?status=success`
    );
  } catch (err) {
    console.error('ML OAuth callback error:', err);
    return NextResponse.redirect(
      `${baseUrl}/auth/mercadolivre?status=error&message=${encodeURIComponent('Falha ao trocar código por token.')}`
    );
  }
}
