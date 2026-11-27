import { BadRequestException } from '@nestjs/common';
import { NotaMetadados } from './notas.model';

const CAMADAS_MAX = 999;
const MEDICAMENTO_MAX = 120;

/**
 * Lê/valida `medicamento` e `camadas` vindos do corpo (multipart no upload,
 * JSON no PATCH — em multipart tudo chega como string). `parcial` = PATCH:
 * campo ausente fica de fora em vez de cair no padrão.
 */
export function lerMetadados(body: Record<string, unknown> | undefined, parcial: true): Partial<NotaMetadados>;
export function lerMetadados(body: Record<string, unknown> | undefined, parcial?: false): NotaMetadados;
export function lerMetadados(body: Record<string, unknown> | undefined, parcial = false): Partial<NotaMetadados> {
  const out: Partial<NotaMetadados> = {};

  if (body?.medicamento !== undefined) {
    const nome = String(body.medicamento ?? '').trim();
    if (nome.length > MEDICAMENTO_MAX) {
      throw new BadRequestException(`Nome do medicamento muito longo (máx. ${MEDICAMENTO_MAX} caracteres).`);
    }
    out.medicamento = nome || undefined;
  }

  const bruto = body?.camadas;
  if (bruto === undefined || bruto === null || bruto === '') {
    if (!parcial) out.camadas = 1;
  } else {
    const camadas = Number(bruto);
    if (!Number.isInteger(camadas) || camadas < 1 || camadas > CAMADAS_MAX) {
      throw new BadRequestException(`Camadas deve ser um número inteiro entre 1 e ${CAMADAS_MAX}.`);
    }
    out.camadas = camadas;
  }

  return out;
}
