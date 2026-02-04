import { PrismaClient } from "@prisma/client";

let prisma: PrismaClient;

if (process.env.NODE_ENV === "production") {
  prisma = new PrismaClient();
} else {
  const globalForPrisma = globalThis as unknown as {
    prisma?: PrismaClient;
  };

  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = new PrismaClient();
  }
  prisma = globalForPrisma.prisma;
}

export { prisma };

// Warm up connection pool on startup (for production)
if (typeof window === "undefined" && process.env.NODE_ENV === "production") {
  prisma
    .$connect()
    .then(() => {
      console.log("Prisma connection pool warmed up");
    })
    .catch(console.error);
}
