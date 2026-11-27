import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UploadedFile,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { NotasService } from './notas.service';
import { singleImageUploadOptions, multipleImagesUploadOptions } from './notas-upload.options';
import { lerMetadados } from './notas-metadados';

/** Sem guard/auditoria ainda — MVP sem autenticação real (ver README). */
@Controller('notas')
export class NotasController {
  constructor(private readonly notasService: NotasService) {}

  @Post('imagem')
  @UseInterceptors(FileInterceptor('file', singleImageUploadOptions))
  processarImagem(@UploadedFile() file: Express.Multer.File, @Body() body: Record<string, unknown>) {
    if (!file) throw new BadRequestException('Nenhum arquivo enviado.');
    return this.notasService.processarImagem(file, lerMetadados(body));
  }

  @Post('imagens')
  @UseInterceptors(FilesInterceptor('files', 10, multipleImagesUploadOptions))
  processarImagens(@UploadedFiles() files: Express.Multer.File[], @Body() body: Record<string, unknown>) {
    if (!files?.length) throw new BadRequestException('Nenhum arquivo enviado.');
    return this.notasService.processarImagens(files, lerMetadados(body));
  }

  @Get()
  listar() {
    return this.notasService.listar();
  }

  @Get(':id')
  buscarUm(@Param('id') id: string) {
    return this.notasService.buscarUm(id);
  }

  /** Corrige nome do remédio e/ou camadas depois de ver a contagem. */
  @Patch(':id')
  atualizar(@Param('id') id: string, @Body() body: Record<string, unknown>) {
    return this.notasService.atualizar(id, lerMetadados(body, true));
  }

  @Delete(':id')
  remover(@Param('id') id: string) {
    this.notasService.remover(id);
    return { removido: true };
  }
}
