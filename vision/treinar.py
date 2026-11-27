"""
Ajuste fino (fine-tuning) de um YOLO só para "caixa", com fotos do próprio almoxarifado.

O YOLO-World usado por padrão em `app.py` já conta caixas sem treino, mas erra
mais em pilhas apertadas e caixas parcialmente escondidas. Com ~100-300 fotos
anotadas do estoque real o modelo treinado fica bem mais preciso.

1. Anote as fotos no formato YOLO (Roboflow, CVAT ou Label Studio exportam
   direto), com UMA classe: `caixa`. Estrutura esperada:

     dataset/
       data.yaml          # ver exemplo abaixo
       images/train/*.jpg   labels/train/*.txt
       images/val/*.jpg     labels/val/*.txt

   data.yaml:
     path: dataset
     train: images/train
     val: images/val
     names: {0: caixa}

2. Treine:
     .venv\\Scripts\\python treinar.py dataset/data.yaml --epochs 80

3. Use o modelo treinado no serviço:
     set VISION_MODEL=runs\\detect\\caixas\\weights\\best.pt
     .venv\\Scripts\\python -m uvicorn app:app --port 8000
"""

import argparse

from ultralytics import YOLO

parser = argparse.ArgumentParser()
parser.add_argument("data", help="caminho do data.yaml")
parser.add_argument("--base", default="yolov8n.pt", help="peso inicial (yolov8n/s/m.pt)")
parser.add_argument("--epochs", type=int, default=80)
parser.add_argument("--imgsz", type=int, default=960)
parser.add_argument("--batch", type=int, default=8)
parser.add_argument("--device", default=None, help="0 para GPU, cpu para CPU (padrão: automático)")
args = parser.parse_args()

YOLO(args.base).train(
    data=args.data,
    epochs=args.epochs,
    imgsz=args.imgsz,
    batch=args.batch,
    device=args.device,
    name="caixas",
    exist_ok=True,
)
