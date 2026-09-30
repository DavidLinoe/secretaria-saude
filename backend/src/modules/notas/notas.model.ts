export type NotaTipo = 'imagem_unica' | 'lote_imagens';
export type NotaStatus = 'processada' | 'erro';

/**
 * Cópia leve do que a ponte Python devolveu, guardada em memória só pra
 * alimentar o CRUD de listagem do front (histórico de notas enviadas nesta
 * sessão do processo). Quem persiste de verdade o resultado do OCR/parsing é
 * o banco da API Python — ver nota em `PythonBridgeService`.
 */
export interface NotaRegistro {
  id: string;
  tipo: NotaTipo;
  arquivos: string[];
  status: NotaStatus;
  resultado_python?: unknown;
  erro?: string;
  criado_em: string;
}
