import {
  BadRequestException,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UploadedFile,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { NotasService } from './notas.service';
import { singleImageUploadOptions, multipleImagesUploadOptions } from './notas-upload.options';

/** Sem guard/auditoria ainda — MVP sem autenticação real (ver README). */
@Controller('notas')
export class NotasController {
  constructor(private readonly notasService: NotasService) {}

  @Post('imagem')
  @UseInterceptors(FileInterceptor('file', singleImageUploadOptions))
  processarImagem(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('Nenhum arquivo enviado.');
    return this.notasService.processarImagem(file);
  }

  @Post('imagens')
  @UseInterceptors(FilesInterceptor('files', 10, multipleImagesUploadOptions))
  processarImagens(@UploadedFiles() files: Express.Multer.File[]) {
    if (!files?.length) throw new BadRequestException('Nenhum arquivo enviado.');
    return this.notasService.processarImagens(files);
  }

  @Get()
  listar() {
    return this.notasService.listar();
  }

  @Get(':id')
  buscarUm(@Param('id') id: string) {
    return this.notasService.buscarUm(id);
  }

  @Delete(':id')
  remover(@Param('id') id: string) {
    this.notasService.remover(id);
    return { removido: true };
  }
}
