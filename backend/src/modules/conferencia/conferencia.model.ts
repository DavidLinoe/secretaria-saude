import { DocumentoExtraido, ItemExtraido, NotaExtraida } from '../extracao/extracao.model';

export type LinhaStatus = 'ok' | 'quantidade' | 'lote' | 'validade' | 'so_nota' | 'so_documento' | 'sem_documento';
export type ConferenciaStatus = 'pendente' | 'confirmada' | 'rejeitada';

export interface LinhaComparacao {
  /** identificador estável da linha dentro da conferência */
  chave: string;
  status: LinhaStatus;
  nota?: ItemExtraido;
  documento?: ItemExtraido;
  /** mensagens legíveis: o que diverge */
  divergencias: string[];
  /** alertas de validade (independem da comparação) */
  alertas: string[];
  /** vencido: nunca entra no estoque, mesmo que aceito */
  bloqueada: boolean;
}

export interface Conferencia {
  id: string;
  status: ConferenciaStatus;
  criadaEm: string;
  confirmadaEm?: string;
  arquivos: { nota: string; documento?: string };
  /** URLs relativas pra visualizar os arquivos originais */
  urls?: { nota?: string; documento?: string };
  nota: NotaExtraida;
  documento?: DocumentoExtraido;
  linhas: LinhaComparacao[];
  resumo: { total: number; ok: number; divergentes: number; bloqueadas: number };
  avisos: string[];
  /** ids dos itens de estoque afetados na confirmação */
  itensEstoque?: string[];
}
