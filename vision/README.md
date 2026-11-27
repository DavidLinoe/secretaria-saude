# vision — contador de caixas

Serviço em Python (FastAPI + YOLO) que recebe uma foto, **conta as caixas** e **lê o nome do remédio**
no rótulo de cada uma. A aba **Escanear** do app usa esse serviço: o frontend envia a foto ao backend
NestJS, e o backend repassa para cá (`PYTHON_API_URL`, padrão `http://localhost:8000`).

```
frontend (4200) ──► backend NestJS (3000) ──► vision (8000)
                     POST /notas/imagem         POST /process-image
```

## Requisitos

- **Python 3.10 ou mais novo** (testado no 3.11)
- **Git** no PATH: uma dependência (`clip`) é instalada direto do GitHub
- ~2 GB de disco (PyTorch + modelos) e ~2 GB de RAM livre
- Internet **na primeira execução**, que baixa os pesos do modelo e do OCR

Não precisa de placa de vídeo: roda na CPU.

## Instalação (uma vez)

Dentro da pasta `vision/`:

**Windows (PowerShell ou CMD)**
```bat
py -3.11 -m venv .venv
.venv\Scripts\python -m pip install --upgrade pip
.venv\Scripts\pip install -r requirements.txt
```

**Linux / macOS**
```bash
python3 -m venv .venv
.venv/bin/python -m pip install --upgrade pip
.venv/bin/pip install -r requirements.txt
```

A instalação leva alguns minutos (o PyTorch sozinho tem quase 1 GB).

## Rodar

**Windows**
```bat
.venv\Scripts\python -m uvicorn app:app --port 8000
```

**Linux / macOS**
```bash
.venv/bin/python -m uvicorn app:app --port 8000
```

Ele está pronto quando aparece `Application startup complete.`

Na **primeira vez**, antes disso ele baixa sozinho os pesos para a própria pasta `vision/`: o
`yoloe-11s-seg.pt` (~27 MB), o encoder de texto `mobileclip_blt.ts` e os modelos do OCR. Isso pode
levar 1–2 minutos. Nas próximas vezes sobe em poucos segundos. Esses arquivos estão no `.gitignore`.

Para o app inteiro funcionar, suba também o backend e o frontend (ver o [README da raiz](../README.md)).
O backend procura este serviço em `PYTHON_API_URL`, configurado no `backend/.env`.

## Testar se está funcionando

```bash
# status
curl http://localhost:8000/
# → {"ok":true,"modelo":"yoloe-11s-seg.pt","classes":["box"]}

# contar caixas numa foto
curl -F "file=@testes/ibuprofeno-fileira.png" http://localhost:8000/process-image
```

A resposta traz, entre outros campos:

| Campo | O que é |
|---|---|
| `total_caixas` | total de caixas em todas as fotos enviadas |
| `medicamentos` | caixas por remédio lido no rótulo: `[{"nome": "Ibuprofeno 400 mg", "caixas": 5}]` (`nome: null` = sem nome legível) |
| `medicamento_sugerido` | nome do remédio que domina a foto (≥ 60% das caixas), ou `null` se for misturado |
| `imagens[].deteccoes` | posição, confiança e nome de cada caixa |
| `imagens[].imagem_anotada` | a foto com as caixas numeradas e nomeadas (JPEG em base64, `data:image/jpeg;...`) |

Várias fotos de uma vez: `POST /process-images` com o campo `files` repetido (o total é somado).

## Medir a precisão

`testes/` tem fotos com a contagem conferida à mão em `testes/gabarito.json` (créditos das imagens em
`testes/CREDITOS.md`). Depois de mudar qualquer parâmetro ou modelo, rode:

```bat
.venv\Scripts\python avaliar.py
```

Ele mostra esperado × contado por foto e salva as imagens anotadas em `testes/saida/` para conferir no
olho. Ajustar parâmetros olhando uma foto só costuma piorar as outras: use sempre o conjunto inteiro.
Para incluir uma foto nova, coloque-a em `testes/` e acrescente a contagem certa no `gabarito.json`.

## Configuração

Tudo é opcional e vai por variável de ambiente, definida antes de subir o serviço:

```bat
:: Windows (CMD)
set VISION_OCR=0
.venv\Scripts\python -m uvicorn app:app --port 8000
```
```bash
# Linux / macOS
VISION_OCR=0 .venv/bin/python -m uvicorn app:app --port 8000
```

As mais úteis:

| Variável | Padrão | Para quê |
|---|---|---|
| `VISION_OCR` | `1` | `0` desliga a leitura do nome (3–5× mais rápido; só conta) |
| `VISION_MODEL` | `yoloe-11s-seg.pt` | outro peso, por exemplo o `best.pt` treinado (ver abaixo) |
| `VISION_IMGSZ` | `640,960` | tamanhos em que a foto é analisada; menos tamanhos = mais rápido |
| `VISION_CONF` | `0.02` | confiança mínima; com modelo treinado use ~`0.4` |

A lista completa, com o motivo de cada valor padrão, está no início do [`app.py`](app.py). A lista de
laboratórios ignorados na leitura do nome (logos como "airela", "sanofi") está no [`nomes.py`](nomes.py).

## Treinar um modelo próprio

Sem treino a contagem é aproximada: o modelo erra em pilhas de papelão pardo na penumbra e às vezes
confunde móveis com caixa. Com 100–300 fotos reais do almoxarifado anotadas fica bem mais preciso.
O passo a passo (formato das anotações, comando de treino, como usar o resultado) está no topo do
[`treinar.py`](treinar.py). Resumo:

```bat
.venv\Scripts\python treinar.py dataset\data.yaml --epochs 80
set VISION_MODEL=runs\detect\caixas\weights\best.pt
.venv\Scripts\python -m uvicorn app:app --port 8000
```

Treinar na CPU é lento. Para usar uma placa NVIDIA, instale o PyTorch com CUDA (ver
https://pytorch.org/get-started/locally/) e passe `--device 0`.

## Problemas comuns

| Sintoma | Causa provável / solução |
|---|---|
| App mostra "API de processamento (Python) indisponível" | Este serviço não está rodando, ou o backend aponta para outro endereço. Confira com `curl http://localhost:8000/` e veja `PYTHON_API_URL` no `backend/.env`. |
| `pip install` falha no `clip` | Git não está instalado ou fora do PATH. |
| Primeira subida demora ou falha baixando arquivos | Precisa de internet só na primeira vez. Rode de novo; se insistir em falhar, apague o arquivo `.pt`/`.ts` incompleto na pasta `vision/` e tente outra vez. |
| `not enough memory` / `DefaultCPUAllocator` | Pouca RAM livre. Feche outros programas; evite modelos maiores (`yoloe-11m`, `yoloe-11l`). |
| Envio de lote dá timeout | Cada foto leva ~3–10 s com OCR. O backend espera até `PYTHON_API_TIMEOUT_MS` (120 s no `.env`). Para lotes grandes, aumente esse valor ou use `VISION_OCR=0`. |
| Remédio sai com o nome do fabricante | O laboratório não está na lista `LABORATORIOS` do `nomes.py`: acrescente lá. |

## Arquivos

| Arquivo | Conteúdo |
|---|---|
| `app.py` | API (FastAPI), detecção das caixas e filtros de pós-processamento |
| `nomes.py` | leitura do nome do remédio (OCR) e agrupamento por remédio |
| `avaliar.py` | mede a precisão nas fotos de `testes/` |
| `treinar.py` | treino de um modelo próprio |
| `testes/` | fotos de teste, gabarito e créditos |
