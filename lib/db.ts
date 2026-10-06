import "server-only";
import { PrismaClient } from "@prisma/client";

// One client per process; in development the module is re-evaluated on every hot reload.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const db = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
