import { Injectable, NotFoundException } from '@nestjs/common';
import { PythonBridgeService } from '../python-bridge/python-bridge.service';
import { NotasRepository } from './notas.repository';
import { NotaMetadados, NotaRegistro } from './notas.model';

@Injectable()
export class NotasService {
  constructor(
    private readonly pythonBridge: PythonBridgeService,
    private readonly repository: NotasRepository,
  ) {}

  async processarImagem(file: Express.Multer.File, meta: NotaMetadados): Promise<NotaRegistro> {
    try {
      const resultado = await this.pythonBridge.processarImagem(file);
      return this.repository.create({
        ...this.comNomeLido(meta, resultado),
        tipo: 'imagem_unica',
        arquivos: [file.originalname],
        status: 'processada',
        resultado_python: resultado,
      });
    } catch (err) {
      return this.repository.create({
        ...meta,
        tipo: 'imagem_unica',
        arquivos: [file.originalname],
        status: 'erro',
        erro: (err as Error).message,
      });
    }
  }

  async processarImagens(files: Express.Multer.File[], meta: NotaMetadados): Promise<NotaRegistro> {
    try {
      const resultado = await this.pythonBridge.processarImagens(files);
      return this.repository.create({
        ...this.comNomeLido(meta, resultado),
        tipo: 'lote_imagens',
        arquivos: files.map((f) => f.originalname),
        status: 'processada',
        resultado_python: resultado,
      });
    } catch (err) {
      return this.repository.create({
        ...meta,
        tipo: 'lote_imagens',
        arquivos: files.map((f) => f.originalname),
        status: 'erro',
        erro: (err as Error).message,
      });
    }
  }

  /**
   * Campo "Remédio" em branco → usa o nome que o serviço de visão leu no
   * rótulo, quando um remédio domina a foto (`medicamento_sugerido`).
   */
  private comNomeLido(meta: NotaMetadados, resultado: unknown): NotaMetadados & { medicamento_automatico?: boolean } {
    const sugerido = (resultado as { medicamento_sugerido?: unknown } | null)?.medicamento_sugerido;
    if (meta.medicamento || typeof sugerido !== 'string' || !sugerido.trim()) return meta;
    return { ...meta, medicamento: sugerido.trim(), medicamento_automatico: true };
  }

  listar(): NotaRegistro[] {
    return this.repository.findAll();
  }

  buscarUm(id: string): NotaRegistro {
    const nota = this.repository.findOne(id);
    if (!nota) throw new NotFoundException('Nota não encontrada');
    return nota;
  }

  atualizar(id: string, meta: Partial<NotaMetadados>): NotaRegistro {
    const nota = this.repository.update(id, meta);
    if (!nota) throw new NotFoundException('Nota não encontrada');
    return nota;
  }

  resetar(): void {
    this.repository.clear();
  }

  remover(id: string): void {
    const removed = this.repository.remove(id);
    if (!removed) throw new NotFoundException('Nota não encontrada');
  }
}
