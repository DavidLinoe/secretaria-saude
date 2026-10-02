# Secretaria da Saúde — Conferência de Notas e Estoque de Medicamentos

Projeto acadêmico (MVP). **Dor:** a entrada de medicamentos no estoque da secretaria depende de
conferência manual da nota fiscal contra o que chega fisicamente — processo lento e sujeito a erro
de lote, validade e quantidade.

## Objetivo

Receber a nota fiscal (PDF ou foto) e o documento que acompanha a carga (romaneio), **extrair os
dados automaticamente, comparar item a item, apontar divergências e, só depois da confirmação do
usuário, lançar a entrada no estoque** — com rastreio por lote e validade.

## O que o projeto faz hoje

### Fluxo principal
1. **Conferir** — o usuário envia a nota fiscal e, opcionalmente, o romaneio (ou usa um dos exemplos).
2. **Extração** — PDFs com texto são lidos com `pdfjs-dist`; fotos passam por OCR (`tesseract`, melhor esforço).
3. **Comparação** — cruza produto + lote e aponta: quantidade diferente, lote diferente, validade
   diferente, item só na nota, item só no romaneio, validade curta (< 180 dias) e vencido.
4. **Confirmação** — itens que conferem entram no estoque; divergentes só entram se o usuário aceitar
   (informando a quantidade que de fato chegou); **vencidos nunca entram**. Nota já confirmada (mesma
   chave de acesso) gera aviso de duplicidade.

### Estoque (CRUD completo)
Cadastro, edição e exclusão de itens (medicamento + lote + validade), busca, filtros (vencendo,
vencidos, estoque baixo), resumo, movimentações (entrada, saída, ajuste) com histórico por item.

### Documentos
Aba que lista os PDFs/imagens de exemplo (`assets/`), os **importados** pelo usuário e os originais
das conferências, com visualizador em tela cheia. Importação salva o arquivo em disco.

### Reset do ambiente de teste
Abrir **`/reset`** no app zera estoque, movimentações, conferências, documentos salvos e histórico de
notas (`POST /reset` no backend). Os exemplos de `assets/` não são apagados.

### Exemplos (mocks)
`assets/` traz 6 notas fiscais (PDF + PNG) e 6 romaneios fictícios com divergências planejadas
(sem divergência, quantidade, lote/validade, item faltando/extra, vencido, carga grande). Gerados por
`node assets/scripts/gerar-mocks.js`. Aparecem em "Testar com exemplos" na aba Conferir.

## Estrutura

```
secretaria-saude/
  backend/    NestJS (porta 3000) — conferência, estoque, documentos, reset, ponte opcional p/ API Python
  frontend/   Angular 20 + Ionic/Capacitor, mobile-first — Início, Conferir, Estoque, Documentos, Escanear
  assets/     PDFs/PNGs de exemplo + scripts/ (gerador) + manifest.json
```

## Como rodar

```bash
cd backend  && cp .env.example .env && npm install && npm run dev     # http://localhost:3000
cd frontend && npm install && npx ng serve                            # http://localhost:4200 (proxy p/ o backend)
```

Variáveis úteis do backend: `PORT`, `DATA_DIR` (onde ficam JSON e uploads; padrão `backend/data`),
`ASSETS_DIR`, `OCR_LANG` (padrão `eng`; use `por` se o idioma estiver instalado).
Ao alterar `frontend/proxy.conf.js` é preciso reiniciar o `ng serve`.

### API (resumo)
| Área | Rotas |
|---|---|
| Conferências | `POST /conferencias` (multipart `nota`, `documento`) · `POST /conferencias/mock/:setId` · `GET /conferencias[/:id]` · `POST /conferencias/:id/confirmar` · `POST /conferencias/:id/rejeitar` · `DELETE /conferencias/:id` |
| Estoque | `GET/POST /estoque` · `GET/PUT/PATCH/DELETE /estoque/:id` · `GET /estoque/resumo` · `POST/GET /estoque/:id/movimentos` |
| Documentos | `GET/POST /documentos` · `GET /documentos/:id/arquivo` · `DELETE /documentos/:id` |
| Outros | `GET /mocks` · `POST /reset` · `/notas/*` (ponte legada p/ API Python de OCR) |

## Limitações atuais (honestas)

- **Persistência em arquivos JSON** (`backend/data/`) — serve ao MVP, não escala nem tem concorrência.
- **Parsers feitos para o layout dos mocks.** DANFEs reais variam de layout; precisam de ajuste em
  `backend/src/modules/extracao/parsers.ts`. OCR de foto é best-effort (acentos e lotes podem errar).
- **Sem autenticação/perfis** — todas as rotas são públicas; `POST /reset` apaga tudo sem confirmação.
- **Sem bipagem** — a conferência é documento × documento, não contra o que chegou fisicamente.
- **Sem testes automatizados nem CI/CD.**
- A "API Python" citada nos planos originais (pasta `fabrica de projetos`) hoje é só um contador de
  caixas por webcam (YOLO), não um serviço HTTP; a ponte `/notas/*` continua disponível mas opcional.
- Capacitor configurado, mas o projeto Android nativo ainda não foi gerado (`npx cap add android`).

## Próximos passos

1. **Banco de verdade** (Postgres + Prisma/TypeORM) no lugar dos JSONs; arquivos em S3/objeto.
2. **Bipagem/conferência física** — escanear código de barras/QR do lote com a câmera e comparar com
   a nota (o objetivo original do produto); `Conferência` passa a ligar nota × documento × itens bipados.
3. **Extração robusta** — suportar DANFE/XML de NF-e real (o XML é estruturado e dispensa OCR), OCR
   melhor (idioma `por`, pré-processamento), e extração por LLM/visão como fallback.
4. **Autenticação e perfis** (almoxarife, auditor, gestor) e trilha de auditoria; proteger o reset.
5. **Regras de estoque** — FEFO (primeiro a vencer, primeiro a sair), alertas de vencimento/mínimo,
   múltiplos locais, requisições/saídas por unidade de saúde.
6. **Relatórios** — divergências por fornecedor, perdas por vencimento, exportação (CSV/PDF).
7. **Mobile nativo** — gerar APK (`npm run build:apk`), câmera nativa, uso offline.
8. **Testes** (parsers/comparador com os mocks como fixtures) e CI/CD.
