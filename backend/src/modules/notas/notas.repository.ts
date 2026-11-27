import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { NotaRegistro } from './notas.model';

/**
 * Repositório em memória — de propósito, é o débito técnico documentado no
 * README ("Sem persistência"). Dado some a cada restart do processo. Vira
 * um banco de verdade (Postgres + Prisma/TypeORM) quando o domínio de
 * estoque estiver desenhado.
 */
@Injectable()
export class NotasRepository {
  private readonly notas = new Map<string, NotaRegistro>();

  create(data: Omit<NotaRegistro, 'id' | 'criado_em'>): NotaRegistro {
    const nota: NotaRegistro = {
      ...data,
      id: randomUUID(),
      criado_em: new Date().toISOString(),
    };
    this.notas.set(nota.id, nota);
    return nota;
  }

  findAll(): NotaRegistro[] {
    return [...this.notas.values()].sort((a, b) => b.criado_em.localeCompare(a.criado_em));
  }

  findOne(id: string): NotaRegistro | undefined {
    return this.notas.get(id);
  }

  update(id: string, data: Partial<Pick<NotaRegistro, 'medicamento' | 'camadas'>>): NotaRegistro | undefined {
    const nota = this.notas.get(id);
    if (!nota) return undefined;
    const atualizada: NotaRegistro = { ...nota, ...data };
    if ('medicamento' in data) {
      delete atualizada.medicamento_automatico; // editado à mão
      if (!data.medicamento) delete atualizada.medicamento;
    }
    this.notas.set(id, atualizada);
    return atualizada;
  }

  clear(): void {
    this.notas.clear();
  }

  remove(id: string): boolean {
    return this.notas.delete(id);
  }
}
