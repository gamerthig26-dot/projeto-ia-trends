export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { generatePKCE, getMLAuthUrl } from '@/lib/mercadolivre-auth';
import crypto from 'crypto';
import { cookies } from 'next/headers';

export async function GET() {
  const appId = process.env.ML_APP_ID;
  if (!appId) {
    return NextResponse.json(
      { error: 'ML_APP_ID não configurado. Configure as credenciais do Mercado Livre.' },
      { status: 500 }
    );
  }

  const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
  const redirectUri = `${baseUrl}/api/auth/mercadolivre/callback`;

  const { verifier, challenge } = generatePKCE();
  const state = crypto.randomBytes(16).toString('hex');

  // Store verifier and state in cookies (httpOnly, short-lived)
  const cookieStore = await cookies();
  cookieStore.set('ml_pkce_verifier', verifier, {
    httpOnly: true,
    secure: baseUrl.startsWith('https'),
    maxAge: 600, // 10 minutes
    path: '/',
    sameSite: 'lax',
  });
  cookieStore.set('ml_oauth_state', state, {
    httpOnly: true,
    secure: baseUrl.startsWith('https'),
    maxAge: 600,
    path: '/',
    sameSite: 'lax',
  });

  const authUrl = getMLAuthUrl(appId, redirectUri, challenge, state);
  return NextResponse.redirect(authUrl);
}
