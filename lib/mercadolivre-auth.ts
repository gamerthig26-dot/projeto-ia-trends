import crypto from 'crypto';

export function generatePKCE() {
  const verifier = crypto.randomBytes(32).toString('base64url');
  const challenge = crypto
    .createHash('sha256')
    .update(verifier)
    .digest('base64url');
  return { verifier, challenge };
}

export function getMLAuthUrl(appId: string, redirectUri: string, codeChallenge: string, state: string) {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: appId,
    redirect_uri: redirectUri,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
    state,
  });
  return `https://auth.mercadolivre.com.br/authorization?${params.toString()}`;
}

export async function exchangeCodeForToken(
  appId: string,
  clientSecret: string,
  code: string,
  redirectUri: string,
  codeVerifier: string
) {
  const res = await fetch('https://api.mercadolibre.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: appId,
      client_secret: clientSecret,
      code,
      redirect_uri: redirectUri,
      code_verifier: codeVerifier,
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`ML token exchange failed (${res.status}): ${text}`);
  }
  return res.json() as Promise<{
    access_token: string;
    token_type: string;
    expires_in: number;
    scope: string;
    user_id: number;
    refresh_token: string;
  }>;
}

export async function refreshMLToken(appId: string, clientSecret: string, refreshToken: string) {
  const res = await fetch('https://api.mercadolibre.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: appId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`ML token refresh failed (${res.status}): ${text}`);
  }
  return res.json() as Promise<{
    access_token: string;
    token_type: string;
    expires_in: number;
    scope: string;
    user_id: number;
    refresh_token: string;
  }>;
}

/** Returns a valid access token, refreshing if expired. Returns null if not authorized. */
export async function getValidMLToken(): Promise<string | null> {
  const { prisma } = await import('@/lib/db');
  const token = await prisma.mlToken.findUnique({ where: { id: 'singleton' } });
  if (!token) return null;

  // If token expires in less than 5 minutes, refresh
  if (token.expiresAt.getTime() - Date.now() < 5 * 60 * 1000) {
    const appId = process.env.ML_APP_ID;
    const secret = process.env.ML_CLIENT_SECRET;
    if (!appId || !secret) return null;

    try {
      const refreshed = await refreshMLToken(appId, secret, token.refreshToken);
      const expiresAt = new Date(Date.now() + refreshed.expires_in * 1000);
      await prisma.mlToken.update({
        where: { id: 'singleton' },
        data: {
          accessToken: refreshed.access_token,
          refreshToken: refreshed.refresh_token,
          expiresAt,
          userId: String(refreshed.user_id),
        },
      });
      return refreshed.access_token;
    } catch (err) {
      console.error('Falha ao renovar token ML:', err);
      return null;
    }
  }

  return token.accessToken;
}
