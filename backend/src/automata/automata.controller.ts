import {
  Body, Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Patch, Post, Query,
} from '@nestjs/common';
import { AutomataService } from './automata.service';
import {
  CompareDto, CreateAutomatonDto, DeterminizeDto, UpdateAutomatonDto,
} from './dto/automaton.dto';
import { AutomatonKind, AutomatonModel } from '../domain/automaton';

/** Rotas da biblioteca de autômatos e da determinização. Base: /api/automata */
@Controller('automata')
export class AutomataController {
  constructor(private readonly service: AutomataService) {}

  @Get()
  findAll(@Query('kind') kind?: AutomatonKind) {
    return this.service.findAll(kind === 'afd' || kind === 'afn' ? kind : undefined);
  }

  /** Converte um AFN em AFD (não persiste nada). */
  @Post('determinize')
  @HttpCode(200)
  determinize(@Body() dto: DeterminizeDto) {
    return this.service.determinize(dto.model as unknown as AutomatonModel);
  }

  /** Diz se `model` aceita a mesma linguagem que o autômato salvo (não persiste). */
  @Post(':id/compare')
  @HttpCode(200)
  compare(@Param('id', ParseUUIDPipe) id: string, @Body() dto: CompareDto) {
    return this.service.compare(id, dto.model as unknown as AutomatonModel);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateAutomatonDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateAutomatonDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
