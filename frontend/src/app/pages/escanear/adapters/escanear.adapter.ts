import { ContagemPorMedicamento, NotaRegistro, ResultadoContagem } from '../models/escanear.model';

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

  /** Resultado da contagem de caixas, se a resposta do Python for desse tipo. */
  static contagem(nota: NotaRegistro): ResultadoContagem | null {
    const r = nota.resultado_python as Partial<ResultadoContagem> | undefined;
    return r?.tipo === 'contagem_caixas' && Array.isArray(r.imagens) ? (r as ResultadoContagem) : null;
  }

  static camadas(nota: NotaRegistro): number {
    return nota.camadas && nota.camadas > 0 ? nota.camadas : 1;
  }

  /** Total estimado = caixas vistas na foto × camadas empilhadas. */
  static totalEstimado(nota: NotaRegistro): number | null {
    const c = EscanearAdapter.contagem(nota);
    return c ? c.total_caixas * EscanearAdapter.camadas(nota) : null;
  }

  /** Contagem por remédio lido nos rótulos (só quando há pelo menos 1 nome lido). */
  static porMedicamento(nota: NotaRegistro): ContagemPorMedicamento[] {
    const itens = EscanearAdapter.contagem(nota)?.medicamentos ?? [];
    return itens.some((i) => i.nome) ? itens : [];
  }

  static caixasLabel(total: number): string {
    return total === 1 ? '1 caixa' : `${total} caixas`;
  }
}
