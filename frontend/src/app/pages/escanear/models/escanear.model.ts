export type NotaTipo = 'imagem_unica' | 'lote_imagens';
export type NotaStatus = 'processada' | 'erro';

/**
 * Informado pelo usuário junto com a foto. A foto só enxerga a camada de cima;
 * `camadas` = quantas camadas há empilhadas (contando a de cima), e o total
 * estimado é caixas na foto × camadas.
 */
export interface NotaMetadados {
  medicamento?: string;
  camadas: number;
}

/** Espelha `NotaRegistro` do backend (`backend/src/modules/notas/notas.model.ts`). */
export interface NotaRegistro extends NotaMetadados {
  id: string;
  /** true = nome lido do rótulo na foto (OCR), não digitado. */
  medicamento_automatico?: boolean;
  tipo: NotaTipo;
  arquivos: string[];
  status: NotaStatus;
  resultado_python?: unknown;
  erro?: string;
  criado_em: string;
}

/** Resposta do serviço `vision/` (contador de caixas com YOLO). */
/** Caixas por remédio lido no rótulo; `nome: null` = caixas sem nome legível. */
export interface ContagemPorMedicamento {
  nome: string | null;
  caixas: number;
}

export interface DeteccaoCaixa {
  medicamento?: string | null;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  confianca: number;
  classe: string;
}

export interface ContagemImagem {
  arquivo: string;
  caixas: number;
  largura: number;
  altura: number;
  deteccoes: DeteccaoCaixa[];
  imagem_anotada: string;
  tempo_ms: number;
}

export interface ResultadoContagem {
  tipo: 'contagem_caixas';
  modelo: string;
  total_caixas: number;
  medicamentos?: ContagemPorMedicamento[];
  medicamento_sugerido?: string | null;
  imagens: ContagemImagem[];
}
