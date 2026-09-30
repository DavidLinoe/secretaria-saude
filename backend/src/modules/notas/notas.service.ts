import { Injectable, NotFoundException } from '@nestjs/common';
import { PythonBridgeService } from '../python-bridge/python-bridge.service';
import { NotasRepository } from './notas.repository';
import { NotaRegistro } from './notas.model';

@Injectable()
export class NotasService {
  constructor(
    private readonly pythonBridge: PythonBridgeService,
    private readonly repository: NotasRepository,
  ) {}

  async processarImagem(file: Express.Multer.File): Promise<NotaRegistro> {
    try {
      const resultado = await this.pythonBridge.processarImagem(file);
      return this.repository.create({
        tipo: 'imagem_unica',
        arquivos: [file.originalname],
        status: 'processada',
        resultado_python: resultado,
      });
    } catch (err) {
      return this.repository.create({
        tipo: 'imagem_unica',
        arquivos: [file.originalname],
        status: 'erro',
        erro: (err as Error).message,
      });
    }
  }

  async processarImagens(files: Express.Multer.File[]): Promise<NotaRegistro> {
    try {
      const resultado = await this.pythonBridge.processarImagens(files);
      return this.repository.create({
        tipo: 'lote_imagens',
        arquivos: files.map((f) => f.originalname),
        status: 'processada',
        resultado_python: resultado,
      });
    } catch (err) {
      return this.repository.create({
        tipo: 'lote_imagens',
        arquivos: files.map((f) => f.originalname),
        status: 'erro',
        erro: (err as Error).message,
      });
    }
  }

  listar(): NotaRegistro[] {
    return this.repository.findAll();
  }

  buscarUm(id: string): NotaRegistro {
    const nota = this.repository.findOne(id);
    if (!nota) throw new NotFoundException('Nota não encontrada');
    return nota;
  }

  remover(id: string): void {
    const removed = this.repository.remove(id);
    if (!removed) throw new NotFoundException('Nota não encontrada');
  }
}
