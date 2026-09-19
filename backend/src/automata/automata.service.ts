import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AutomatonEntity } from './automaton.entity';
import { CreateAutomatonDto, UpdateAutomatonDto } from './dto/automaton.dto';
import {
  AutomatonKind, AutomatonModel, Determinization, determinize, Equivalence, equivalence,
} from '../domain/automaton';

@Injectable()
export class AutomataService {
  constructor(
    @InjectRepository(AutomatonEntity)
    private readonly repo: Repository<AutomatonEntity>,
  ) {}

  findAll(kind?: AutomatonKind): Promise<AutomatonEntity[]> {
    return this.repo.find({
      where: kind ? { kind } : {},
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<AutomatonEntity> {
    const item = await this.repo.findOne({ where: { id } });
    if (!item) throw new NotFoundException(`Autômato ${id} não encontrado.`);
    return item;
  }

  create(dto: CreateAutomatonDto): Promise<AutomatonEntity> {
    const model = dto.model as unknown as AutomatonModel;
    const kind: AutomatonKind = dto.kind ?? model.kind ?? 'afd';
    const entity = this.repo.create({
      name: dto.name,
      kind,
      model: { ...model, kind },
      stateCount: model.states.length,
    });
    return this.repo.save(entity);
  }

  async update(id: string, dto: UpdateAutomatonDto): Promise<AutomatonEntity> {
    const item = await this.findOne(id);
    if (dto.name !== undefined) item.name = dto.name;
    if (dto.kind !== undefined) item.kind = dto.kind;
    if (dto.model !== undefined) {
      const model = dto.model as unknown as AutomatonModel;
      const kind = dto.kind ?? model.kind ?? item.kind;
      item.kind = kind;
      item.model = { ...model, kind };
      item.stateCount = model.states.length;
    }
    return this.repo.save(item);
  }

  async remove(id: string): Promise<void> {
    const res = await this.repo.delete(id);
    if (!res.affected) throw new NotFoundException(`Autômato ${id} não encontrado.`);
  }

  /** Converte um AFN em AFD por construção de subconjuntos (cálculo puro). */
  determinize(model: AutomatonModel): Determinization {
    const result = determinize(model);
    if ('error' in result) throw new BadRequestException(result.error);
    return result;
  }

  /** Compara `model` com o autômato salvo `id` (ex.: gabarito): mesma linguagem? */
  async compare(id: string, model: AutomatonModel): Promise<Equivalence & { reference: string }> {
    const saved = await this.findOne(id);
    const result = equivalence(model, saved.model);
    if ('error' in result) throw new BadRequestException(result.error);
    return { ...result, reference: saved.name };
  }
}
