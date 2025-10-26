// lib/db.ts
import { PrismaClient } from "@prisma/client";

declare global {
  // prevent multiple instances during hot reload in dev
  var prisma: PrismaClient | undefined;
}

export const db =
  global.prisma ||
  new PrismaClient({
    log: ["query"], // optional: logs SQL queries
  });

if (process.env.NODE_ENV !== "production") global.prisma = db;
