import { NotaRegistro } from '../models/escanear.model';

export class EscanearAdapter {
  static statusLabel(nota: NotaRegistro): string {
    return nota.status === 'processada' ? 'Processada' : 'Erro';
  }

  static statusColor(nota: NotaRegistro): 'success' | 'danger' {
    return nota.status === 'processada' ? 'success' : 'danger';
  }

  static tipoLabel(nota: NotaRegistro): string {
    return nota.tipo === 'lote_imagens' ? `Lote (${nota.arquivos.length} fotos)` : 'Foto única';
  }
}
