# Secretaria da Saúde — Controle de Estoque via Nota Fiscal

Projeto acadêmico. Dor apresentada: entrada de medicamentos/insumos no
estoque da secretaria depende de conferência manual de nota fiscal contra o
que chega fisicamente — processo lento e sujeito a erro de lote/quantidade.

## Ideia do produto

App que:
1. **Recebe a nota** — foto da nota fiscal (uma imagem ou um lote de imagens).
2. **Parseia os itens** (OCR + extração estruturada, feito por um serviço
   Python externo) e já cadastra cada item no estoque (medicamento, lote,
   quantidade, validade).
3. **Bipa a conferência física** *(ainda não implementado)* — usuário
   escaneia (câmera/código de barras) os itens/lotes recebidos fisicamente e
   o app compara contra o que a nota declarou, sinalizando divergência de
   lote ou quantidade antes de fechar o recebimento.

Entrada por nota (cadastro) + bipagem por item (validação) = garante que o
que foi declarado é o que chegou.

## Este repositório

Extraído dos monorepos `web-who/mobile-root` (front) e `web-who/webwhoapi`
(back), onde este app nasceu como mais um produto dentro da IA maior da
empresa. Virou repositório próprio porque é um projeto à parte (acadêmico,
sem relação de produto com o resto do ecossistema Web Who) — sem depender
da lib compartilhada (`@shared`), do backend `core` (auth/JWT) ou do
tooling Nx dos monorepos originais.

```
secretaria-saude/
  backend/   NestJS — ponte para a API Python de OCR/parsing + CRUD leve pro front
  frontend/  Angular 20 + Ionic + Capacitor — Home e Escanear Nota
```

## Como rodar

Precisa de 3 processos (backend, frontend, e a API Python de OCR — essa
última é um serviço externo, fora deste repo):

```bash
# backend (porta 3000)
cd backend
cp .env.example .env   # ajuste PYTHON_API_URL se a API Python não estiver em localhost:8000
npm install
npm run dev

# frontend (porta 4200, com proxy pro backend em dev)
cd frontend
npm install
npx ng serve
```

Sem a API Python rodando, tudo funciona normalmente exceto o processamento
em si: o upload chega no backend, a ponte tenta chamar o Python, falha, e a
nota fica salva com `status: "erro"` no histórico — visível na tela
Escanear (é assim que o front foi pensado: nunca mostrar "processada" sem
ter processado de verdade).

## Escopo do MVP atual

- **Front:** shell do app (bottom nav simples, sem auth) + páginas **Home**
  (status do backend + atalhos) e **Escanear Nota** (foto única ou lote,
  histórico com remoção). Bipar/Estoque/Perfil aparecem na navegação mas
  ainda redirecionam pra Home — mostram a IA completa do produto, não são
  features implementadas.
- **Back:** `GET /` (status) e:
  - `POST /notas/imagem`, `POST /notas/imagens` — **ponte** (`PythonBridgeService`)
    pro serviço Python externo que faz o OCR/parsing de verdade e já grava
    o resultado no banco dele; este backend só repassa o(s) arquivo(s) via
    multipart e devolve a resposta;
  - `GET /notas`, `GET /notas/:id`, `DELETE /notas/:id` — **CRUD leve para
    o front**, cópia local (em memória) do que foi processado nesta sessão.

Nada de bipagem, autenticação real ou persistência de verdade (banco) ainda.

## Débitos técnicos assumidos

- **Sem persistência de verdade** — `NotasRepository` (backend) é um `Map`
  em memória; reinicia zerado e não escala pra mais de uma instância. O
  resultado "de verdade" do OCR/parsing mora no banco do serviço Python,
  fora do alcance deste backend.
- **Contrato com a API Python não validado** — `PythonBridgeService` assume
  `POST {PYTHON_API_URL}/process-image` (campo multipart `file`) e
  `POST {PYTHON_API_URL}/process-images` (campo `files`, repetido). Ajustar
  `backend/.env` e, se o shape divergir mais que isso, `python-bridge.service.ts`
  quando o contrato real for confirmado.
- **Sem autenticação** — todas as rotas são públicas. Entra quando houver
  necessidade real de RBAC (ex.: recebimento/almoxarife vs. auditor/gestor).
- **Bottom nav com rotas "fantasma"** — Bipar/Estoque/Perfil roteiam pra
  Home (não existem containers reais ainda).
- **Sem testes, sem CI/CD.**
- **Capacitor configurado mas sem projeto nativo gerado** — `capacitor.config.ts`
  existe e as dependências (`@capacitor/core`, `@capacitor/cli`,
  `@capacitor/android`) estão instaladas, mas ninguém rodou
  `npx cap add android` ainda (gera a pasta `android/`, não versionada).

## Passos seguintes (pós-MVP, em ordem sugerida)

1. **Modelagem de domínio** — `Medicamento`/`Insumo`, `Lote`, `NotaFiscal`,
   `ItemNota`, `MovimentoEstoque`, `ConferenciaEntrada` (a entidade que liga
   nota × itens bipados × divergências).
2. **Banco de verdade** — Postgres + Prisma (ou TypeORM) no backend,
   substituindo `NotasRepository`. Ler o resultado estruturado da resposta
   do Python (`NotaRegistro.resultado_python`, hoje um blob bruto) e
   mapear pra esse domínio.
3. **Confirmar contrato da API Python** — paths, campo multipart e shape da
   resposta contra o serviço real (hoje são um chute razoável).
4. **Bipagem/conferência** — tela de scanner (código de barras/QR do lote,
   fallback foto) comparando contra os itens da nota.
5. **Autenticação/autorização**, se o uso real justificar.
