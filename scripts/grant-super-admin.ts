import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

async function main() {
  const email = process.argv[2]?.trim().toLowerCase();
  const connectionString = process.env.DIRECT_URL;

  if (!email || !email.includes("@")) {
    throw new Error("Uso: npm run admin:grant -- correo@ejemplo.com");
  }
  if (!connectionString) {
    throw new Error("DIRECT_URL es obligatoria");
  }

  const db = new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
  });

  try {
    const user = await db.appUser.findUnique({ where: { email } });
    if (!user) {
      throw new Error("La cuenta debe iniciar sesión al menos una vez antes de recibir permisos.");
    }

    const role = await db.role.findUnique({ where: { code: "SUPER_ADMIN" } });
    if (!role) {
      throw new Error("No existe el rol SUPER_ADMIN. Ejecutá primero npm run db:seed.");
    }

    await db.$transaction(async (tx) => {
      const existing = await tx.userRole.findUnique({
        where: { userId_roleId: { userId: user.id, roleId: role.id } },
      });

      await tx.userRole.upsert({
        where: { userId_roleId: { userId: user.id, roleId: role.id } },
        create: { userId: user.id, roleId: role.id },
        update: {},
      });

      if (!existing) {
        await tx.auditLog.create({
          data: {
            actorType: "SYSTEM",
            action: "GRANT_ROLE",
            entityKind: "AppUser",
            entityId: user.id,
            afterData: { role: "SUPER_ADMIN" },
            reason: "Concesión inicial explícita mediante admin:grant",
          },
        });
      }
    });

    console.log(`SUPER_ADMIN asignado a ${email}.`);
  } finally {
    await db.$disconnect();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
