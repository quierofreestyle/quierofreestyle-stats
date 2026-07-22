import { config } from "dotenv";
import { defineConfig } from "prisma/config";

config({ path: ".env" });

const directUrl = process.env.DIRECT_URL;

if (!directUrl) {
  throw new Error("No se encontró DIRECT_URL en el archivo .env");
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: directUrl,
  },
});