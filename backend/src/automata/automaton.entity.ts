import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { AutomatonKind, AutomatonModel } from '../domain/automaton';

/**
 * Autômato salvo pelo usuário (a "biblioteca"). O grafo (estados e transições)
 * é guardado como JSONB — flexível e sem tabelas extras — enquanto os metadados
 * (nome, tipo, nº de estados) ficam em colunas para consulta e ordenação.
 */
@Entity('automata')
export class AutomatonEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 120 })
  name: string;

  /** Tipo do autômato: 'afd' (determinístico) ou 'afn' (não determinístico). */
  @Column({ type: 'varchar', length: 8, default: 'afd' })
  kind: AutomatonKind;

  @Column({ type: 'int', default: 0 })
  stateCount: number;

  @Column({ type: 'jsonb' })
  model: AutomatonModel;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
