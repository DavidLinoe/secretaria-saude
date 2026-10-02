import { BadRequestException, Body, Controller, Delete, Get, Param, Post, UploadedFiles, UseInterceptors } from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { Aceite, ConferenciaService } from './conferencia.service';
import { conferenciaUploadOptions } from './conferencia-upload.options';
import { MocksService } from '../mocks/mocks.service';

type Arquivos = { nota?: Express.Multer.File[]; documento?: Express.Multer.File[] };

@Controller('conferencias')
export class ConferenciaController {
  constructor(
    private readonly service: ConferenciaService,
    private readonly mocks: MocksService,
  ) {}

  /** multipart: `nota` (obrigatório: PDF/foto da NF) e `documento` (opcional: romaneio PDF/foto). */
  @Post()
  @UseInterceptors(FileFieldsInterceptor([{ name: 'nota', maxCount: 1 }, { name: 'documento', maxCount: 1 }], conferenciaUploadOptions))
  criar(@UploadedFiles() files: Arquivos) {
    if (!files?.nota?.[0]) throw new BadRequestException('Envie o arquivo da nota fiscal no campo "nota".');
    return this.service.criar(files.nota[0], files.documento?.[0]);
  }

  /** Roda a conferência com um dos mocks de `assets/` (demo sem precisar de arquivo). */
  @Post('mock/:setId')
  criarComMock(@Param('setId') setId: string) {
    const { nota, documento, urls } = this.mocks.arquivos(setId);
    return this.service.criar(nota, documento, urls);
  }

  @Get()
  listar() {
    return this.service.listar();
  }

  @Get(':id')
  buscar(@Param('id') id: string) {
    return this.service.buscar(id);
  }

  @Post(':id/confirmar')
  confirmar(@Param('id') id: string, @Body() body: { aceitar?: Aceite[] }) {
    return this.service.confirmar(id, body?.aceitar ?? []);
  }

  @Post(':id/rejeitar')
  rejeitar(@Param('id') id: string) {
    return this.service.rejeitar(id);
  }

  @Delete(':id')
  remover(@Param('id') id: string) {
    this.service.remover(id);
    return { removido: true };
  }
}
