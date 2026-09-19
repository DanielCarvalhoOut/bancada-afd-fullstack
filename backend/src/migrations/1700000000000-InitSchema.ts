import { MigrationInterface, QueryRunner, Table } from 'typeorm';

/**
 * Migration inicial: cria a tabela `automata` (biblioteca de autômatos AFD/AFN).
 * O grafo fica em JSONB; `kind` e `stateCount` em colunas para consulta.
 * Rode com:  npm run migration:run
 */
export class InitSchema1700000000000 implements MigrationInterface {
  name = 'InitSchema1700000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');

    await queryRunner.createTable(
      new Table({
        name: 'automata',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, default: 'uuid_generate_v4()' },
          { name: 'name', type: 'varchar', length: '120' },
          { name: 'kind', type: 'varchar', length: '8', default: "'afd'" },
          { name: 'stateCount', type: 'int', default: 0 },
          { name: 'model', type: 'jsonb' },
          { name: 'createdAt', type: 'timestamp', default: 'now()' },
          { name: 'updatedAt', type: 'timestamp', default: 'now()' },
        ],
      }),
      true,
    );
    await queryRunner.query('CREATE INDEX "IDX_automata_kind" ON "automata" ("kind")');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX IF EXISTS "IDX_automata_kind"');
    await queryRunner.dropTable('automata', true);
  }
}
