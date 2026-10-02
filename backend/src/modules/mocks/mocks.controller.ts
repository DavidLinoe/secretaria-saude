import { Controller, Get, Param, Res } from '@nestjs/common';
import type { Response } from 'express';
import { MocksService } from './mocks.service';

@Controller('mocks')
export class MocksController {
  constructor(private readonly service: MocksService) {}

  @Get()
  listar() {
    return this.service.listar();
  }

  /** Baixa/visualiza um arquivo de assets (ex.: /mocks/arquivo/notas-fiscais/set-01-sem-divergencia.pdf). */
  @Get('arquivo/*path')
  arquivo(@Param('path') partes: string[] | string, @Res() res: Response) {
    const rel = Array.isArray(partes) ? partes.join('/') : partes;
    res.sendFile(this.service.resolver(rel));
  }
}
