import { z } from "zod";

const databaseUrlSchema = z
  .string({ error: "DATABASE_URL es obligatoria" })
  .trim()
  .min(1, "DATABASE_URL es obligatoria")
  .refine(
    (value) => value.startsWith("postgresql://") || value.startsWith("postgres://"),
    "DATABASE_URL debe ser una URL de PostgreSQL",
  );

export function parseDatabaseUrl(value: string | undefined): string {
  const result = databaseUrlSchema.safeParse(value);

  if (!result.success) {
    throw new Error(result.error.issues[0]?.message ?? "DATABASE_URL no es válida");
  }

  return result.data;
}

export function getDatabaseUrl(): string {
  return parseDatabaseUrl(process.env.DATABASE_URL);
}
