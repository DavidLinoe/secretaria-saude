// Rotas da API que também são rotas do app (/estoque, /documentos, /reset): navegação do
// navegador na raiz da rota (Accept: text/html) fica no Angular; fetch/XHR e arquivos
// (ex.: iframe em /documentos/:id/arquivo) continuam indo pro backend.
const target = 'http://localhost:3000';
const bypass = (req) =>
  (req.headers.accept || '').includes('text/html') && !req.url.split('?')[0].replace(/^\/[^/]+\/?/, '') ? '/index.html' : undefined;
const rota = (extra = {}) => ({ target, secure: false, changeOrigin: true, bypass, ...extra });

module.exports = {
  '/notas': rota(),
  '/estoque': rota(),
  '/conferencias': rota(),
  '/documentos': rota(),
  '/reset': rota(),
  '/mocks': rota(),
  '/status': rota({ pathRewrite: { '^/status': '/' } }),
};
