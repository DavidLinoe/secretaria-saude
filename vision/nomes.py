"""
Lê o nome do remédio em cada caixa detectada (OCR com RapidOCR/ONNX).

Fluxo:
  1. OCR UMA vez na foto inteira (bem mais rápido que caixa por caixa).
  2. Cada linha de texto vai para a caixa onde cai o centro dela.
  3. Em cada caixa, o nome é a linha de maior destaque (altura da letra ×
     tamanho da palavra), depois de descartar dosagens ("400 mg"), dizeres de
     embalagem ("uso oral", "contém"...) e nomes de laboratório (a logo
     "airela" às vezes tem letra mais alta que o próprio nome).
  4. Junta a dosagem achada na mesma caixa: "Ibuprofeno 400 mg".

É melhor esforço: caixa virada, de lado, com reflexo ou com letra pequena
pode ficar sem nome (`medicamento: None`).
"""

from __future__ import annotations

import os
import re
import unicodedata
from collections import Counter
from difflib import SequenceMatcher
from typing import Any

import numpy as np

_ocr = None

# Laboratórios/marcas de fabricante comuns no Brasil — aparecem em destaque
# (logo) e não são o nome do remédio. Comparação sem acento/caixa.
LABORATORIOS = {
    "airela", "neo quimica", "neoquimica", "neo", "quimica", "sanofi", "ems", "biolab", "cimed", "medley",
    "eurofarma", "ache", "germed", "prati", "donaduzzi", "prati-donaduzzi", "teuto", "legrand", "novartis",
    "bayer", "pfizer", "sandoz", "hypera", "hypermarcas", "libbs", "mantecorp", "torrent", "abbott", "roche",
    "gsk", "glaxosmithkline", "boehringer", "takeda", "merck", "msd", "astrazeneca", "zydus", "nova quimica",
    "cristalia", "uniao quimica", "geolab", "vitamedic", "brainfarma", "farmaceutica", "farmaceutico",
}

# Dizeres de embalagem: se a linha contém algum, não é o nome.
DIZERES = (
    "uso oral", "uso adulto", "uso pediatrico", "via oral", "contem", "comprimido", "capsula", "dragea",
    "revestido", "analgesico", "antitermico", "dor e febre", "venda sob", "prescricao", "medicamento",
    "generico", "sintomas", "gripe", "resfriado", "relaxante", "muscular", "registro", "farmaceutic",
    "lote", "validade", "fab", "sac", "servico", "atendimento", "industria", "brasileira", "contra os",
    "embalagem", "frasco", "envelope", "solucao", "suspensao", "gotas", "xarope", "pomada", "creme",
)

# Início de palavra: "gripe" não pode derrubar "Cimegripe"; "comprimido" pega "comprimidos".
_DIZERES_RE = re.compile("(?<![a-z])(?:" + "|".join(re.escape(d) for d in DIZERES) + ")")

DOSAGEM = re.compile(r"(\d+(?:[.,]\d+)?)\s*(mg|mcg|µg|ug|g|ml|ui|%)(?:\s*/\s*(ml|g|gota|dose))?\b", re.IGNORECASE)


def _sem_acento(texto: str) -> str:
    return "".join(c for c in unicodedata.normalize("NFD", texto) if unicodedata.category(c) != "Mn").lower()


def get_ocr():
    global _ocr
    if _ocr is None:
        from rapidocr_onnxruntime import RapidOCR  # import tardio: só carrega se o OCR estiver ligado
        _ocr = RapidOCR()
    return _ocr


def _candidato_a_nome(texto: str) -> bool:
    t = _sem_acento(texto).strip()
    letras = re.sub(r"[^a-z]", "", t)
    if len(letras) < 3:
        return False
    if DOSAGEM.search(t) or sum(c.isdigit() for c in t) > 2:
        return False
    if t in LABORATORIOS or letras in {re.sub(r"[^a-z]", "", lab) for lab in LABORATORIOS}:
        return False
    if _DIZERES_RE.search(t):
        return False
    return True


def _formatar_nome(texto: str) -> str:
    texto = re.sub(r"[®™©*]", "", texto).strip(" .,-:;")
    # Caixa alta inteira ("DORFLEX") vira "Dorflex"; misto fica como está.
    return texto.title() if texto.isupper() or texto.islower() else texto


def _formatar_dosagem(m: re.Match) -> str:
    numero, unidade, por = m.group(1), m.group(2).lower().replace("ug", "mcg").replace("µg", "mcg"), m.group(3)
    unidade = {"ui": "UI", "ml": "mL"}.get(unidade, unidade)
    return f"{numero} {unidade}" + (f"/{por.lower()}" if por else "")


def identificar(img: np.ndarray, deteccoes: list[dict[str, Any]]) -> None:
    """Preenche `medicamento` (str | None) em cada detecção, in-place."""
    for d in deteccoes:
        d["medicamento"] = None
    if not deteccoes:
        return

    resultado, _ = get_ocr()(img)
    linhas = []
    for quad, texto, score in resultado or []:
        xs = [p[0] for p in quad]; ys = [p[1] for p in quad]
        linhas.append({
            "texto": texto, "score": float(score),
            "cx": sum(xs) / 4, "cy": sum(ys) / 4,
            "altura": max(ys) - min(ys), "y1": min(ys),
        })

    def area(d: dict[str, Any]) -> float:
        return (d["x2"] - d["x1"]) * (d["y2"] - d["y1"])

    por_caixa: list[list[dict[str, Any]]] = [[] for _ in deteccoes]
    for ln in linhas:
        dentro = [i for i, d in enumerate(deteccoes)
                  if d["x1"] <= ln["cx"] <= d["x2"] and d["y1"] <= ln["cy"] <= d["y2"]]
        if dentro:
            por_caixa[min(dentro, key=lambda i: area(deteccoes[i]))].append(ln)

    for d, lns in zip(deteccoes, por_caixa):
        nomes = [ln for ln in lns if ln["score"] >= 0.6 and _candidato_a_nome(ln["texto"])]
        if not nomes:
            continue
        nome = max(nomes, key=lambda ln: ln["altura"] * min(len(re.sub(r"\W", "", ln["texto"])), 12))
        # Dosagem: só de linha que é SÓ a dose ("400 mg") ou da própria linha do
        # nome. Linha de composição ("paracetamol 400 mg" no Cimegripe,
        # "citrato de orfenadrina 35 mg" no Dorflex) é de um componente, não do produto.
        dosagens = [
            (ln, m) for ln in lns if ln["score"] >= 0.6
            for m in [DOSAGEM.search(ln["texto"])]
            if m and (ln is nome or len(re.sub(r"[^a-z]", "", _sem_acento(DOSAGEM.sub("", ln["texto"])))) <= 2)
        ]
        # Dosagem principal: a de maior letra.
        dosagem = max(dosagens, key=lambda t: t[0]["altura"]) if dosagens else None
        d["medicamento"] = _formatar_nome(nome["texto"]) + (f" {_formatar_dosagem(dosagem[1])}" if dosagem else "")


def resumir(deteccoes_por_imagem: list[list[dict[str, Any]]]) -> list[dict[str, Any]]:
    """Agrupa por nome (sem acento/caixa) → [{nome, caixas}], mais caixas primeiro; sem nome no fim."""
    grupos: dict[str, Counter] = {}
    sem_nome = 0
    for deteccoes in deteccoes_por_imagem:
        for d in deteccoes:
            nome = d.get("medicamento")
            if not nome:
                sem_nome += 1
                continue
            base = _sem_acento(DOSAGEM.sub("", nome)).strip()
            # Erro de 1-2 letras do OCR ("Lbuprofeno") cai no grupo já existente.
            parecido = next((g for g in grupos if SequenceMatcher(None, g, base).ratio() >= 0.85), None)
            grupos.setdefault(parecido or base, Counter())[nome] += 1
    # Nome exibido do grupo: a grafia mais frequente, preferindo a que tem dosagem.
    itens = [
        {"nome": max(c.items(), key=lambda kv: (bool(DOSAGEM.search(kv[0])), kv[1]))[0], "caixas": sum(c.values())}
        for c in grupos.values()
    ]
    itens.sort(key=lambda i: -i["caixas"])
    if sem_nome:
        itens.append({"nome": None, "caixas": sem_nome})
    return itens


def sugerir(resumo: list[dict[str, Any]]) -> str | None:
    """Nome p/ preencher o formulário: só quando um remédio domina a foto (≥ 60% das caixas com nome)."""
    com_nome = [i for i in resumo if i["nome"]]
    total = sum(i["caixas"] for i in com_nome)
    if com_nome and com_nome[0]["caixas"] / total >= 0.6:
        return com_nome[0]["nome"]
    return None


LIGADO = os.getenv("VISION_OCR", "1") != "0"
