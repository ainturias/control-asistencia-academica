// DataSource para el CLI de TypeORM (migration:run / migration:revert).
import 'dotenv/config';
import { DataSource } from 'typeorm';
import { buildDataSourceOptions } from './data-source-options';

export default new DataSource(buildDataSourceOptions((key) => process.env[key]));
