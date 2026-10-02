import { BadRequestException, Body, Controller, Delete, Get, Param, Post, Res, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { conferenciaUploadOptions } from '../conferencia/conferencia-upload.options';
import { DocumentosService } from './documentos.service';

@Controller('documentos')
export class DocumentosController {
  constructor(private readonly service: DocumentosService) {}

  /** Lista exemplos (assets/), importados e arquivos de conferências. */
  @Get()
  listar() {
    return this.service.listar();
  }

  /** multipart: `file` (PDF/imagem) e `tipo` (nota_fiscal | romaneio | outro). */
  @Post()
  @UseInterceptors(FileInterceptor('file', conferenciaUploadOptions))
  importar(@UploadedFile() file: Express.Multer.File, @Body('tipo') tipo: string) {
    if (!file) throw new BadRequestException('Envie o arquivo no campo "file".');
    return this.service.salvar(file, tipo);
  }

  @Get(':id/arquivo')
  arquivo(@Param('id') id: string, @Res() res: Response) {
    const { abs, mimetype, nome } = this.service.caminho(id);
    res.setHeader('Content-Type', mimetype);
    res.setHeader('Content-Disposition', `inline; filename*=UTF-8''${encodeURIComponent(nome)}`);
    res.sendFile(abs);
  }

  @Delete(':id')
  remover(@Param('id') id: string) {
    this.service.remover(id);
    return { removido: true };
  }
}
