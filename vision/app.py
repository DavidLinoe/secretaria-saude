"""
Serviço de visão (FastAPI + YOLO) que conta caixas numa foto.

É a "API Python" que o backend NestJS já chama pela `PythonBridgeService`
(`PYTHON_API_URL`, padrão http://localhost:8000):

  POST /process-image   multipart, campo `file`   -> 1 imagem
  POST /process-images  multipart, campo `files`  -> várias imagens (soma o total)

Modelo:
  - Padrão: YOLOE-11s (detecção por vocabulário aberto). Não precisa treinar:
    basta dizer em texto o que procurar ("box"). Também aceita YOLO-World
    (`VISION_MODEL=yolov8s-worldv2.pt`).
    Sem treino a contagem é APROXIMADA: em pilhas apertadas ele às vezes
    junta duas caixas ou divide uma caixa comprida em duas.
  - Se você treinar um modelo próprio (ver `treinar.py`), aponte
    `VISION_MODEL` para o `best.pt` gerado — aí as classes do próprio modelo
    são usadas e `VISION_CLASSES` é ignorado.

Variáveis de ambiente (todas opcionais):
  VISION_MODEL      caminho/nome do peso (padrão: yoloe-11s-seg.pt)
  VISION_CLASSES    classes em texto, separadas por vírgula (YOLOE/YOLO-World)
  VISION_CONF       confiança mínima (padrão 0.02 — sem treino os scores são
                    baixos; com modelo treinado use ~0.4)
  VISION_CONF_MIN   piso do limiar adaptativo (padrão 0.005)
  VISION_CONF_REL   limiar adaptativo: se até a melhor detecção da foto tem nota
                    baixa, o corte vira CONF_REL × melhor nota (padrão 0.25).
                    Caixas iguais sobre fundo liso saem todas com ~0.015 — um
                    corte fixo em 0.02 descartaria todas.
  VISION_IOU        IoU do NMS (padrão 0.5)
  VISION_IMGSZ      tamanhos de entrada, separados por vírgula (padrão 640,960).
                    Roda o modelo em cada um e junta: caixa fraca numa escala
                    costuma aparecer na outra. Mais tamanhos = mais lento.
  VISION_MAX_AREA   descarta detecções que cobrem mais que essa fração da
                    imagem (padrão 0.6 — evita contar a pilha inteira como 1 caixa)
  VISION_CONTIDA    descarta uma detecção que está essa fração dentro de outra
                    maior (padrão 0.8 — evita contar a tampa e a caixa)
  VISION_MAX_PROPORCAO  descarta detecções mais alongadas que isso (lado maior ÷
                    menor; padrão 8 — faixas finas na borda da foto não são caixa)
  VISION_CONF_PISO_REL  descarta o que tiver nota abaixo dessa fração da melhor
                    detecção da foto (padrão 0.1 — laterais de caixas vistas de
                    lado e papéis saem com ~5% da nota das caixas de verdade)
  VISION_SOBREPOSTA descarta uma detecção com essa fração dentro de outra MAIS
                    confiante (padrão 0.5 — lateral/bula por trás de uma caixa)
  VISION_ALINHAMENTO  só junta pedaços cujo topo E base batem com essa folga
                    (fração da altura; padrão 0.1)
  VISION_FUNDIR     1/0 — junta pedaços lado a lado da mesma caixa quando não
                    há fresta escura entre eles (padrão 1; ver `fundir_pedacos`)
  VISION_FRESTA     quão escura a divisa precisa ser p/ contar como fresta entre
                    2 caixas, relativo ao lado mais escuro (padrão 0.8). Medido
                    nas fotos de teste: divisas reais entre caixas dão 0.02–0.75;
                    pedaços da mesma caixa (só troca de cor) dão 0.84+.
"""

from __future__ import annotations

import base64
import io
import os
import time
import unicodedata
from typing import Any

import cv2
import numpy as np
from fastapi import FastAPI, File, HTTPException, UploadFile
from PIL import Image, ImageOps
from ultralytics import YOLO

import nomes

MODEL_PATH = os.getenv("VISION_MODEL", "yoloe-11s-seg.pt")
CLASSES = [c.strip() for c in os.getenv(
    "VISION_CLASSES", "box"
).split(",") if c.strip()]
CONF = float(os.getenv("VISION_CONF", "0.02"))
CONF_MIN = float(os.getenv("VISION_CONF_MIN", "0.005"))
CONF_REL = float(os.getenv("VISION_CONF_REL", "0.25"))
CONF_PISO_REL = float(os.getenv("VISION_CONF_PISO_REL", "0.1"))
IOU = float(os.getenv("VISION_IOU", "0.5"))
IMGSZ = [int(t) for t in os.getenv("VISION_IMGSZ", "640,960").split(",") if t.strip()]
MAX_AREA = float(os.getenv("VISION_MAX_AREA", "0.6"))
CONTIDA = float(os.getenv("VISION_CONTIDA", "0.8"))
MAX_PROPORCAO = float(os.getenv("VISION_MAX_PROPORCAO", "8"))
FUNDIR = os.getenv("VISION_FUNDIR", "1") != "0"
ALINHAMENTO = float(os.getenv("VISION_ALINHAMENTO", "0.1"))
SOBREPOSTA = float(os.getenv("VISION_SOBREPOSTA", "0.5"))
FRESTA = float(os.getenv("VISION_FRESTA", "0.8"))
ANOTADA_MAX_LADO = 1280

app = FastAPI(title="Secretaria da Saúde — contador de caixas")

_model: YOLO | None = None
_vocab_aberto = False


def get_model() -> YOLO:
    global _model, _vocab_aberto
    if _model is None:
        model = YOLO(MODEL_PATH)
        nome = os.path.basename(MODEL_PATH).lower()
        if "yoloe" in nome:
            model.set_classes(CLASSES, model.get_text_pe(CLASSES))
            _vocab_aberto = True
        elif "world" in nome:
            model.set_classes(CLASSES)
            _vocab_aberto = True
        _model = model
    return _model


def _tem_fresta(cinza: np.ndarray, a: dict[str, Any], b: dict[str, Any]) -> bool:
    """
    Há uma fresta/sombra física entre `a` (esquerda) e `b` (direita)?

    Entre duas caixas encostadas sempre aparece um vale escuro na divisa
    (fresta, sombra, quina). Já quando o modelo corta UMA caixa em dois
    pedaços (ex.: onde a embalagem muda de amarelo pra vermelho), a divisa é
    só uma troca de cor — degrau, não vale. Compara a coluna mais escura da
    divisa com o brilho dos dois lados.
    """
    y1 = max(a["y1"], b["y1"]); y2 = min(a["y2"], b["y2"])
    margem = 0.15 * (y2 - y1)  # ignora quinas/topos, onde há sombra de outra fileira
    ys = slice(int(y1 + margem), max(int(y1 + margem) + 1, int(y2 - margem)))
    largura = min(a["x2"] - a["x1"], b["x2"] - b["x1"])
    meia = max(6, int(0.08 * largura))
    xc = int((a["x2"] + b["x1"]) / 2)
    x0, x1 = max(0, xc - meia), min(cinza.shape[1], xc + meia + 1)
    if x1 - x0 < 6:
        return True
    colunas = cinza[ys, x0:x1].mean(axis=0)
    lado = max(2, len(colunas) // 5)
    esq, dir_ = colunas[:lado].mean(), colunas[-lado:].mean()
    vale = colunas[lado:-lado].min() if len(colunas) > 2 * lado else colunas.min()
    return vale < FRESTA * min(esq, dir_)


def fundir_pedacos(deteccoes: list[dict[str, Any]], cinza: np.ndarray) -> list[dict[str, Any]]:
    """
    Junta detecções lado a lado que são pedaços da mesma caixa: mesma fileira
    (topo e base alinhados), encostadas, e SEM fresta escura entre elas.
    """
    W = cinza.shape[1]
    dets = [dict(d) for d in deteccoes]
    mudou = True
    while mudou:
        mudou = False
        dets.sort(key=lambda d: d["x1"])
        for i in range(len(dets)):
            for j in range(len(dets)):
                if i == j:
                    continue
                a, b = dets[i], dets[j]
                if not a["x1"] < b["x1"]:
                    continue
                ha, hb = a["y2"] - a["y1"], b["y2"] - b["y1"]
                # Pedaços da MESMA caixa têm topo e base alinhados (mesmo
                # objeto cortado); caixas vizinhas de alturas parecidas não.
                tol = ALINHAMENTO * min(ha, hb)
                if min(ha, hb) <= 0 or abs(a["y1"] - b["y1"]) > tol or abs(a["y2"] - b["y2"]) > tol:
                    continue
                vao = b["x1"] - a["x2"]
                largura = min(a["x2"] - a["x1"], b["x2"] - b["x1"])
                if vao > 0.03 * W or vao < -0.3 * largura:
                    continue  # longe demais, ou sobrepostas demais (NMS já tratou)
                if _tem_fresta(cinza, a, b):
                    continue
                dets[i] = {
                    "x1": min(a["x1"], b["x1"]), "y1": min(a["y1"], b["y1"]),
                    "x2": max(a["x2"], b["x2"]), "y2": max(a["y2"], b["y2"]),
                    "confianca": max(a["confianca"], b["confianca"]),
                    "classe": a["classe"] if a["confianca"] >= b["confianca"] else b["classe"],
                }
                del dets[j]
                mudou = True
                break
            if mudou:
                break
    return dets


def ordem_de_leitura(deteccoes: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Agrupa em fileiras (centro vertical dentro da metade da altura típica) e ordena cada uma da esquerda p/ direita."""
    if not deteccoes:
        return deteccoes
    alturas = sorted(d["y2"] - d["y1"] for d in deteccoes)
    meia = alturas[len(alturas) // 2] / 2
    fileiras: list[list[dict[str, Any]]] = []
    for d in sorted(deteccoes, key=lambda d: (d["y1"] + d["y2"]) / 2):
        cy = (d["y1"] + d["y2"]) / 2
        if fileiras and abs(cy - sum((o["y1"] + o["y2"]) / 2 for o in fileiras[-1]) / len(fileiras[-1])) <= meia:
            fileiras[-1].append(d)
        else:
            fileiras.append([d])
    return [d for f in fileiras for d in sorted(f, key=lambda d: d["x1"])]


def remover_contidas(deteccoes: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """
    Resolve detecções aninhadas, em 2 passos:

    1. Uma detecção que contém 2+ outras é a PILHA inteira (o modelo às vezes
       marca a coluna toda como "uma caixa") → sai; ficam as caixas de dentro.
    2. Uma detecção quase inteira dentro de UMA outra maior é tampa/etiqueta
       da mesma caixa → sai a menor.
    """
    def area(d: dict[str, Any]) -> float:
        return max(0.0, d["x2"] - d["x1"]) * max(0.0, d["y2"] - d["y1"])

    def dentro(menor: dict[str, Any], maior: dict[str, Any]) -> bool:
        ix = max(0.0, min(menor["x2"], maior["x2"]) - max(menor["x1"], maior["x1"]))
        iy = max(0.0, min(menor["y2"], maior["y2"]) - max(menor["y1"], maior["y1"]))
        return ix * iy / (area(menor) or 1.0) >= CONTIDA

    deteccoes = [
        d for d in deteccoes
        if sum(1 for o in deteccoes if o is not d and area(o) < 0.9 * area(d) and dentro(o, d)) < 2
    ]

    ordenadas = sorted(deteccoes, key=area, reverse=True)
    mantidas: list[dict[str, Any]] = []
    for d in ordenadas:
        a = area(d) or 1.0
        contida = False
        for m in mantidas:
            ix = max(0.0, min(d["x2"], m["x2"]) - max(d["x1"], m["x1"]))
            iy = max(0.0, min(d["y2"], m["y2"]) - max(d["y1"], m["y1"]))
            fracao = ix * iy / a
            # Quase toda dentro de outra → tampa/etiqueta. Boa parte dentro de
            # uma detecção MAIS CONFIANTE → lateral de caixa vista de lado,
            # bula/papel por baixo etc.
            if fracao >= CONTIDA or (fracao >= SOBREPOSTA and m["confianca"] > d["confianca"]):
                contida = True
                break
        if not contida:
            mantidas.append(d)
    return mantidas


@app.on_event("startup")
def warmup() -> None:
    # Baixa os pesos e roda uma inferência vazia já na subida, pra 1ª
    # requisição não estourar o timeout de 30s do backend.
    get_model().predict(np.zeros((320, 320, 3), dtype=np.uint8), verbose=False)
    if nomes.LIGADO:
        nomes.get_ocr()(np.full((64, 256, 3), 255, dtype=np.uint8))


def ler_imagem(dados: bytes) -> np.ndarray:
    try:
        img = Image.open(io.BytesIO(dados))
        img = ImageOps.exif_transpose(img).convert("RGB")  # foto de celular vem girada pelo EXIF
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=400, detail=f"Imagem inválida: {exc}") from exc
    return cv2.cvtColor(np.array(img), cv2.COLOR_RGB2BGR)


def anotar(img: np.ndarray, deteccoes: list[dict[str, Any]]) -> str:
    out = img.copy()
    espessura = max(2, round(max(out.shape[:2]) / 400))
    escala = max(0.5, max(out.shape[:2]) / 1400)
    for i, d in enumerate(deteccoes, start=1):
        x1, y1, x2, y2 = (int(v) for v in (d["x1"], d["y1"], d["x2"], d["y2"]))
        cv2.rectangle(out, (x1, y1), (x2, y2), (40, 200, 40), espessura)
        rotulo = str(i)
        (tw, th), _ = cv2.getTextSize(rotulo, cv2.FONT_HERSHEY_SIMPLEX, escala, espessura)
        cv2.rectangle(out, (x1, y1), (x1 + tw + 8, y1 + th + 10), (40, 200, 40), -1)
        cv2.putText(out, rotulo, (x1 + 4, y1 + th + 4), cv2.FONT_HERSHEY_SIMPLEX, escala, (255, 255, 255), espessura)
        if d.get("medicamento"):
            # OpenCV não desenha acento: tira antes de escrever.
            nome = unicodedata.normalize("NFKD", d["medicamento"]).encode("ascii", "ignore").decode()[:22]
            esc = escala * 0.8
            (nw, nh), _ = cv2.getTextSize(nome, cv2.FONT_HERSHEY_SIMPLEX, esc, max(1, espessura - 1))
            cv2.rectangle(out, (x1, y2 - nh - 10), (min(x2, x1 + nw + 8), y2), (40, 200, 40), -1)
            cv2.putText(out, nome, (x1 + 4, y2 - 5), cv2.FONT_HERSHEY_SIMPLEX, esc, (255, 255, 255), max(1, espessura - 1))

    texto = f"{len(deteccoes)} caixa(s)"
    (tw, th), _ = cv2.getTextSize(texto, cv2.FONT_HERSHEY_SIMPLEX, escala * 1.4, espessura + 1)
    cv2.rectangle(out, (0, 0), (tw + 20, th + 20), (20, 20, 20), -1)
    cv2.putText(out, texto, (10, th + 10), cv2.FONT_HERSHEY_SIMPLEX, escala * 1.4, (255, 255, 255), espessura + 1)

    h, w = out.shape[:2]
    fator = ANOTADA_MAX_LADO / max(h, w)
    if fator < 1:
        out = cv2.resize(out, (round(w * fator), round(h * fator)), interpolation=cv2.INTER_AREA)
    ok, buf = cv2.imencode(".jpg", out, [cv2.IMWRITE_JPEG_QUALITY, 80])
    if not ok:
        return ""
    return "data:image/jpeg;base64," + base64.b64encode(buf.tobytes()).decode()


def contar(img: np.ndarray, arquivo: str) -> dict[str, Any]:
    model = get_model()
    inicio = time.perf_counter()
    h, w = img.shape[:2]
    area_img = float(h * w)

    # Multiescala: roda o modelo em cada tamanho de IMGSZ e junta tudo. Uma
    # caixa que some numa escala (nota 0.004 em 960) aparece em outra (0.013
    # em 640/800); o NMS abaixo tira as duplicatas entre escalas.
    candidatas: list[dict[str, Any]] = []
    for tamanho in IMGSZ:
        # agnostic_nms: a mesma caixa detectada como "box" e "carton" vira 1 só.
        r = model.predict(img, conf=CONF_MIN, iou=IOU, imgsz=tamanho, agnostic_nms=True, verbose=False)[0]
        # Limiar adaptativo: a escala das notas varia muito de foto pra foto
        # (0.4 numa pilha variada, 0.02 numa grade de caixas idênticas). Usa
        # CONF, mas se nem a melhor detecção chega perto disso, desce junto.
        notas = r.boxes.conf.tolist()
        corte = max(CONF_MIN, min(CONF, CONF_REL * max(notas)), CONF_PISO_REL * max(notas)) if notas else CONF
        for (x1, y1, x2, y2), conf, cls in zip(r.boxes.xyxy.tolist(), notas, r.boxes.cls.tolist()):
            lados = sorted((max(1.0, x2 - x1), max(1.0, y2 - y1)))
            if conf < corte or (x2 - x1) * (y2 - y1) / area_img > MAX_AREA or lados[1] / lados[0] > MAX_PROPORCAO:
                continue
            candidatas.append({
                "x1": round(x1, 1), "y1": round(y1, 1), "x2": round(x2, 1), "y2": round(y2, 1),
                "confianca": round(conf, 3),
                "classe": r.names.get(int(cls), str(int(cls))),
            })

    manter = cv2.dnn.NMSBoxes(
        [[d["x1"], d["y1"], d["x2"] - d["x1"], d["y2"] - d["y1"]] for d in candidatas],
        [d["confianca"] for d in candidatas], 0.0, IOU,
    ) if candidatas else []
    deteccoes = [candidatas[i] for i in np.array(manter).flatten()]
    deteccoes = remover_contidas(deteccoes)
    if FUNDIR:
        deteccoes = fundir_pedacos(deteccoes, cv2.cvtColor(img, cv2.COLOR_BGR2GRAY))
    # Ordem de leitura (cima→baixo, esquerda→direita) pra numeração fazer sentido.
    deteccoes = ordem_de_leitura(deteccoes)
    if nomes.LIGADO:
        nomes.identificar(img, deteccoes)

    return {
        "arquivo": arquivo,
        "caixas": len(deteccoes),
        "medicamentos": nomes.resumir([deteccoes]) if nomes.LIGADO else [],
        "largura": w,
        "altura": h,
        "deteccoes": deteccoes,
        "imagem_anotada": anotar(img, deteccoes),
        "tempo_ms": round((time.perf_counter() - inicio) * 1000),
    }


def resposta(imagens: list[dict[str, Any]]) -> dict[str, Any]:
    resumo = nomes.resumir([i["deteccoes"] for i in imagens]) if nomes.LIGADO else []
    return {
        "tipo": "contagem_caixas",
        "modelo": os.path.basename(MODEL_PATH),
        "total_caixas": sum(i["caixas"] for i in imagens),
        # Caixas por remédio lido no rótulo (OCR) e, se um domina a foto, o
        # nome sugerido p/ o formulário.
        "medicamentos": resumo,
        "medicamento_sugerido": nomes.sugerir(resumo),
        "imagens": imagens,
    }


@app.get("/")
def status() -> dict[str, Any]:
    return {"ok": True, "modelo": os.path.basename(MODEL_PATH), "classes": CLASSES if _vocab_aberto else None}


@app.post("/process-image")
async def process_image(file: UploadFile = File(...)) -> dict[str, Any]:
    img = ler_imagem(await file.read())
    return resposta([contar(img, file.filename or "imagem")])


@app.post("/process-images")
async def process_images(files: list[UploadFile] = File(...)) -> dict[str, Any]:
    imagens = []
    for f in files:
        imagens.append(contar(ler_imagem(await f.read()), f.filename or "imagem"))
    return resposta(imagens)
