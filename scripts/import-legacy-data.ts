import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { PrismaPg } from "@prisma/adapter-pg";
import { config } from "dotenv";

import { PrismaClient } from "../src/generated/prisma/client";
import { applyLegacyImportPlan } from "../src/server/import/apply-legacy-data";
import { buildLegacyImportPlan } from "../src/server/import/legacy-data";

async function readJson(path: string) {
  return JSON.parse(await readFile(resolve(path), "utf8")) as unknown;
}

async function main() {
  const plan = buildLegacyImportPlan({
    competitions: await readJson("data/competencias.json"),
    competitors: await readJson("data/competidores.json"),
    events: await readJson("data/eventos.json"),
  });

  if (process.argv.includes("--dry-run")) {
    console.log(
      JSON.stringify({ mode: "dry-run", ...plan.report, issues: plan.issues }, null, 2),
    );
    return;
  }

  config({ path: ".env" });
  const connectionString = process.env.DIRECT_URL;
  if (!connectionString) {
    throw new Error("No se encontró DIRECT_URL en el archivo .env");
  }

  const database = new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
  });
  try {
    const result = await applyLegacyImportPlan(database, plan);
    console.log(JSON.stringify({ mode: "import", ...result }, null, 2));
  } finally {
    await database.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
