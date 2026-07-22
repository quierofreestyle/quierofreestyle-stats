# Acceso seguro a Prisma y primer módulo público

Este paquete se aplica sobre la rama `feat/database-access` del repositorio `quierofreestyle/quierofreestyle-stats`.

## 1. Copiar los archivos

Extraé el ZIP en la raíz del repositorio y aceptá reemplazar los archivos existentes. El paquete no contiene `.env`, credenciales ni el cliente generado.

## 2. Configurar la conexión local

En `.env`, conservá `DIRECT_URL` y agregá `DATABASE_URL` con la cadena **Transaction Pooler** de Supabase (puerto 6543):

```env
DATABASE_URL="postgresql://postgres.PROJECT_REF:CONTRASEÑA@REGION.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1"
DIRECT_URL="postgresql://postgres.PROJECT_REF:CONTRASEÑA@REGION.pooler.supabase.com:5432/postgres"
```

Codificá únicamente los caracteres especiales de la contraseña. No subas `.env` a GitHub.

## 3. Instalar y validar

```powershell
npm install
npm run db:validate
npm run typecheck
npm run lint
npm test
npm run build
```

`npm install` genera automáticamente `src/generated/prisma/`, que continúa ignorada por Git.

## 4. Probar la consulta

```powershell
npm run dev
```

Abrí `http://localhost:3000/api/competitions`. Mientras no existan competencias activas con eventos publicados, la respuesta correcta es:

```json
{"data":[]}
```

El endpoint excluye borradores y eventos anulados. Incluye organización, eventos publicados o corregidos, finalistas, campeones y agrupaciones ocasionales.

## 5. Revisar y versionar

```powershell
git status
git diff --check
git diff --stat
git add package.json package-lock.json README.md .github/workflows/ci.yml src/server src/app/api/competitions tests/server
git diff --cached --check
git commit -m "Agregar acceso seguro a Prisma y consulta de competencias"
git push
```

Después del push, revisá que GitHub Actions finalice en verde antes de abrir o fusionar el PR hacia `Preproduccion`.
