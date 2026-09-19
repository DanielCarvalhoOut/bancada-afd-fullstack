import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AutomatonEntity } from './automaton.entity';
import { AutomataService } from './automata.service';
import { AutomataController } from './automata.controller';

@Module({
  imports: [TypeOrmModule.forFeature([AutomatonEntity])],
  controllers: [AutomataController],
  providers: [AutomataService],
  exports: [AutomataService],
})
export class AutomataModule {}
