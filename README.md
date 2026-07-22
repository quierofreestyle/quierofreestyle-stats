# quierofreestyle-stats

Página de estadísticas de Quiero Freestyle.

## Acceso a PostgreSQL

La aplicación usa Prisma 7 con el adaptador oficial de PostgreSQL. Las conexiones se crean únicamente en módulos de servidor.

Variables requeridas:

- `DATABASE_URL`: Transaction Pooler de Supabase (puerto 6543), utilizada por la aplicación.
- `DIRECT_URL`: Session Pooler de Supabase (puerto 5432), utilizada por migraciones y seed.

Comandos principales:

```bash
npm install
npm run db:validate
npm run typecheck
npm test
npm run build
```

El cliente Prisma se genera automáticamente durante `npm install` y no se versiona.

## Primer endpoint público

`GET /api/competitions` devuelve competencias activas con sus eventos publicados o corregidos, organización, finalistas y resultados. Nunca devuelve borradores ni eventos anulados.
