import Link from "next/link";

import { createCompetitor } from "../../_actions/subjects";
import { FormFeedback, SubjectFields } from "../../../../features/admin/subject-fields";
import { requireAdminCapability } from "../../../../server/auth/permissions";
import { db } from "../../../../server/db";

type Props = { searchParams: Promise<{ error?: string }> };

export default async function NewCompetitorPage({ searchParams }: Props) {
  await requireAdminCapability(["SUBJECT_MANAGE"], "/admin/competidores/nuevo");
  const [{ error }, regions] = await Promise.all([
    searchParams,
    db.region.findMany({ orderBy: [{ type: "asc" }, { name: "asc" }] }),
  ]);
  return (
    <>
      <header className="admin-header">
        <div><p className="eyebrow">Competidores</p><h1>Nuevo</h1></div>
      </header>
      <FormFeedback error={error} />
      <form action={createCompetitor} className="admin-editor">
        <SubjectFields />
        <label>
          Región de origen
          <select name="homeRegionId" defaultValue="">
            <option value="">Sin región</option>
            {regions.map((region) => <option key={region.id} value={region.id}>{region.name}</option>)}
          </select>
        </label>
        <label>Fecha de nacimiento<input type="date" name="birthDate" /></label>
        <div className="admin-form-actions">
          <Link href="/admin/competidores">Cancelar</Link><button type="submit">Crear competidor</button>
        </div>
      </form>
    </>
  );
}
