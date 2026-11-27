"""
Mede o contador nas fotos de `testes/` contra o gabarito (`testes/gabarito.json`).

    .venv\Scripts\python avaliar.py              # usa a config padrão de app.py
    set VISION_CONF=0.1 && .venv\Scripts\python avaliar.py   # testa outra config

Salva as imagens anotadas em `testes/saida/` pra conferir no olho.
Rode sempre depois de mexer em parâmetros/modelo: ajustar olhando uma foto só
costuma piorar as outras.
"""

import base64
import json
import os
import sys

import cv2

import app

PASTA = os.path.join(os.path.dirname(os.path.abspath(__file__)), "testes")
SAIDA = os.path.join(PASTA, "saida")


def main() -> int:
    gabarito = {k: v for k, v in json.load(open(os.path.join(PASTA, "gabarito.json"), encoding="utf-8")).items()
                if not k.startswith("_")}
    os.makedirs(SAIDA, exist_ok=True)
    acertos, erro_abs, esperado_total = 0, 0, 0
    print(f"modelo={app.MODEL_PATH} conf={app.CONF} imgsz={app.IMGSZ} fundir={app.FUNDIR}\n")
    print(f"{'imagem':16s} {'esperado':>8s} {'contou':>6s}  resultado")
    for nome, g in gabarito.items():
        img = cv2.imread(os.path.join(PASTA, nome))
        if img is None:
            print(f"{nome:16s} (arquivo não encontrado)")
            continue
        r = app.contar(img, nome)
        diff = r["caixas"] - g["caixas"]
        ok = abs(diff) <= g.get("tolerancia", 0)
        acertos += ok
        erro_abs += abs(diff)
        esperado_total += g["caixas"]
        print(f"{nome:16s} {g['caixas']:8d} {r['caixas']:6d}  {'OK' if ok else 'ERRO'} ({diff:+d})")
        with open(os.path.join(SAIDA, nome.rsplit('.', 1)[0] + ".jpg"), "wb") as f:
            f.write(base64.b64decode(r["imagem_anotada"].split(",", 1)[1]))
    print(f"\nacertos: {acertos}/{len(gabarito)}   erro absoluto total: {erro_abs} caixas "
          f"({erro_abs / max(1, esperado_total):.0%} do total esperado)")
    return 0 if acertos == len(gabarito) else 1


if __name__ == "__main__":
    sys.exit(main())
