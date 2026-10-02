export type DocumentoTipo = 'nota_fiscal' | 'romaneio' | 'outro';
export type DocumentoOrigem = 'exemplo' | 'importado' | 'conferencia';

export interface Documento {
  id: string;
  nome: string;
  tipo: DocumentoTipo;
  origem: DocumentoOrigem;
  mimetype: string;
  tamanho: number;
  criadoEm?: string;
  url: string;
  removivel: boolean;
}

export const TIPO_ROTULO: Record<DocumentoTipo, string> = { nota_fiscal: 'Nota fiscal', romaneio: 'Romaneio', outro: 'Outro' };
export const ORIGEM_ROTULO: Record<DocumentoOrigem, string> = { exemplo: 'Exemplo', importado: 'Importado', conferencia: 'Conferência' };
