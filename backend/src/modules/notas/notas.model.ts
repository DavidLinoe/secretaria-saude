export type NotaTipo = 'imagem_unica' | 'lote_imagens';
export type NotaStatus = 'processada' | 'erro';

/**
 * O que o usuário informa junto com a foto da contagem de caixas:
 * - `medicamento`: nome do remédio (livre, opcional).
 * - `camadas`: quantas camadas de caixas existem empilhadas, contando a de
 *   cima. A foto só enxerga a camada do topo; o total estimado é
 *   caixas na foto × camadas (ver adapter do front).
 */
export interface NotaMetadados {
  medicamento?: string;
  camadas: number;
}

/**
 * Cópia leve do que a ponte Python devolveu, guardada em memória só pra
 * alimentar o CRUD de listagem do front (histórico de notas enviadas nesta
 * sessão do processo). Quem persiste de verdade o resultado do OCR/parsing é
 * o banco da API Python — ver nota em `PythonBridgeService`.
 */
export interface NotaRegistro extends NotaMetadados {
  id: string;
  /** true = `medicamento` foi lido do rótulo na foto (OCR), não digitado. */
  medicamento_automatico?: boolean;
  tipo: NotaTipo;
  arquivos: string[];
  status: NotaStatus;
  resultado_python?: unknown;
  erro?: string;
  criado_em: string;
}
