import 'reflect-metadata';
import { config } from 'dotenv';
import { DataSource, DataSourceOptions } from 'typeorm';
import { AutomatonEntity } from '../automata/automaton.entity';

config();

/**
 * Opções de conexão do TypeORM. Reutilizadas pelo AppModule (runtime) e
 * pelo CLI de migrations (via a instância `AppDataSource` exportada abaixo).
 * `synchronize: false` — o schema é gerido só por migrations.
 */
export const dataSourceOptions: DataSourceOptions = {
  type: 'postgres',
  host: process.env.DB_HOST ?? 'localhost',
  port: parseInt(process.env.DB_PORT ?? '54327', 10),
  username: process.env.DB_USER ?? 'bancada',
  password: process.env.DB_PASSWORD ?? 'bancada',
  database: process.env.DB_NAME ?? 'bancada_afd',
  entities: [AutomatonEntity],
  migrations: [__dirname + '/../migrations/*.{ts,js}'],
  synchronize: false,
  logging: ['error', 'warn'],
};

export const AppDataSource = new DataSource(dataSourceOptions);
