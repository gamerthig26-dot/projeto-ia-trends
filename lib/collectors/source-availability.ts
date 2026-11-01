// These paths failed a real access test. Do not repeatedly contact blocked hosts
// or substitute another scraping endpoint. Restore collection only after an
// authorized data source has been configured and tested.
export const unavailableSources = {
  reddit: 'A consulta sem autenticação retornou HTTP 403. Coleta suspensa; acesso autorizado ainda não configurado.',
  youtube: 'O endereço RSS usado para vídeos populares retornou HTTP 400. A integração com a API oficial ainda não está configurada.',
  mercadolivre: 'Integração via OAuth configurada. Autorize o acesso em /auth/mercadolivre para pesquisar produtos.',
  amazon: 'A consulta retornou HTTP 503. Coleta suspensa; é necessária uma fonte autorizada e verificável para produtos.',
  shopee: 'A consulta retornou HTTP 403. Coleta suspensa; acesso autorizado ainda não configurado.',
  aliexpress: 'A página respondeu, mas o coletor não extraiu produtos verificáveis. Integração pendente; nenhum resultado foi inventado.',
  tiktokshop: 'A pesquisa de produtos do TikTok Shop ainda não foi implementada. O Creative Center não substitui um catálogo verificado do Shop.',
} as const;
