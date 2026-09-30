export type NotaTipo = 'imagem_unica' | 'lote_imagens';
export type NotaStatus = 'processada' | 'erro';

/** Espelha `NotaRegistro` do backend (`backend/src/modules/notas/notas.model.ts`). */
export interface NotaRegistro {
  id: string;
  tipo: NotaTipo;
  arquivos: string[];
  status: NotaStatus;
  resultado_python?: unknown;
  erro?: string;
  criado_em: string;
}
