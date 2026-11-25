import { Body, Controller, Delete, Get, Param, Post, Put } from '@nestjs/common';
import { PoloInput, PolosService } from './polos.service';

@Controller('polos')
export class PolosController {
  constructor(private readonly service: PolosService) {}

  @Get()
  listar() {
    return this.service.listar();
  }

  @Get(':id')
  buscar(@Param('id') id: string) {
    return this.service.buscar(id);
  }

  @Get(':id/estoque')
  estoque(@Param('id') id: string) {
    return this.service.estoqueDoPolo(id);
  }

  @Get(':id/distribuicoes')
  historico(@Param('id') id: string) {
    return this.service.historico(id);
  }

  @Post()
  criar(@Body() body: PoloInput) {
    return this.service.criar(body);
  }

  @Put(':id')
  atualizar(@Param('id') id: string, @Body() body: PoloInput) {
    return this.service.atualizar(id, body);
  }

  @Delete(':id')
  remover(@Param('id') id: string) {
    this.service.remover(id);
    return { removido: true };
  }
}
