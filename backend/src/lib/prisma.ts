import { PrismaPg } from '@prisma/adapter-pg';
import { env } from '../config/env';
import { PrismaClient } from '../generated/prisma/client';

// One shared client for the whole API. Prisma 7 talks to PostgreSQL through the
// node-postgres driver adapter, which also manages the connection pool.
const adapter = new PrismaPg({ connectionString: env.DATABASE_URL });

export const prisma = new PrismaClient({ adapter });
