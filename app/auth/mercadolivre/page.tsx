'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import Link from 'next/link';

function AuthStatusContent() {
  const searchParams = useSearchParams();
  const status = searchParams.get('status');
  const message = searchParams.get('message');

  return (
    <div className="min-h-screen bg-[#0b1020] flex items-center justify-center p-4">
      <div className="bg-[#151a30] rounded-2xl p-8 max-w-md w-full border border-[#2a2f45] text-center">
        <h1 className="text-2xl font-bold text-white mb-4">
          Autorização Mercado Livre
        </h1>

        {status === 'success' && (
          <>
            <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-green-400 text-lg mb-2">Conexão autorizada!</p>
            <p className="text-gray-400 text-sm mb-6">
              O IA Trends agora pode pesquisar produtos no Mercado Livre usando sua conta.
            </p>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <p className="text-red-400 text-lg mb-2">Falha na autorização</p>
            <p className="text-gray-400 text-sm mb-6">
              {message || 'Não foi possível conectar ao Mercado Livre. Tente novamente.'}
            </p>
            <a
              href="/api/auth/mercadolivre/authorize"
              className="inline-block px-6 py-2 bg-[#7c3aed] hover:bg-[#6d28d9] text-white rounded-lg transition-colors mb-4"
            >
              Tentar novamente
            </a>
          </>
        )}

        {!status && (
          <>
            <p className="text-gray-400 text-sm mb-6">
              Conecte sua conta do Mercado Livre para permitir a pesquisa de produtos.
            </p>
            <a
              href="/api/auth/mercadolivre/authorize"
              className="inline-block px-6 py-2 bg-[#7c3aed] hover:bg-[#6d28d9] text-white rounded-lg transition-colors mb-4"
            >
              Conectar Mercado Livre
            </a>
          </>
        )}

        <div>
          <Link href="/" className="text-[#7c3aed] hover:text-[#6d28d9] text-sm">
            ← Voltar ao painel
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function MercadoLivreAuthPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#0b1020] flex items-center justify-center">
        <p className="text-gray-400">Carregando...</p>
      </div>
    }>
      <AuthStatusContent />
    </Suspense>
  );
}
