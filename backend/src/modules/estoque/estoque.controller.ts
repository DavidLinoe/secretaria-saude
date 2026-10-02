import { Body, Controller, Delete, Get, Param, Patch, Post, Put, Query } from '@nestjs/common';
import { EstoqueInput, EstoqueService } from './estoque.service';
import { MovimentoTipo } from './estoque.model';

@Controller('estoque')
export class EstoqueController {
  constructor(private readonly service: EstoqueService) {}

  @Get()
  listar(@Query('q') q?: string, @Query('status') status?: string) {
    return this.service.listar({ q, status });
  }

  @Get('resumo')
  resumo() {
    return this.service.resumo();
  }

  @Get(':id')
  buscar(@Param('id') id: string) {
    return this.service.buscar(id);
  }

  @Get(':id/movimentos')
  historico(@Param('id') id: string) {
    return this.service.historico(id);
  }

  @Post()
  criar(@Body() body: EstoqueInput) {
    return this.service.criar(body);
  }

  @Put(':id')
  atualizar(@Param('id') id: string, @Body() body: EstoqueInput) {
    return this.service.atualizar(id, body);
  }

  @Patch(':id')
  atualizarParcial(@Param('id') id: string, @Body() body: EstoqueInput) {
    return this.service.atualizar(id, body);
  }

  @Post(':id/movimentos')
  movimentar(@Param('id') id: string, @Body() body: { tipo: MovimentoTipo; quantidade: number; motivo?: string }) {
    return this.service.movimentar(id, body.tipo, Number(body.quantidade), body.motivo);
  }

  @Delete(':id')
  remover(@Param('id') id: string) {
    this.service.remover(id);
    return { removido: true };
  }
}
