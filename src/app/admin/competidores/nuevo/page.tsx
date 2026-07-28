import { createCompetitor } from "../../_actions/subjects";
import { AdminSubjectForm } from "../../../../features/admin/admin-subject-form";
import { SubjectFields } from "../../../../features/admin/subject-fields";
import { requireAdminCapability } from "../../../../server/auth/permissions";
import { db } from "../../../../server/db";

export default async function NewCompetitorPage() {
  await requireAdminCapability(["SUBJECT_MANAGE"], "/admin/competidores/nuevo");
  const regions = await db.region.findMany({ orderBy: [{ type: "asc" }, { name: "asc" }] });
  return (
    <>
      <header className="admin-header">
        <div><p className="eyebrow">Competidores</p><h1>Nuevo</h1></div>
      </header>
      <p className="admin-required-note"><span className="admin-required">*</span> Campos obligatorios</p>
      <AdminSubjectForm action={createCompetitor} cancelHref="/admin/competidores" submitLabel="Crear competidor">
        <SubjectFields />
        <label>
          Región de origen
          <select name="homeRegionId" defaultValue="">
            <option value="">Sin región</option>
            {regions.map((region) => <option key={region.id} value={region.id}>{region.name}</option>)}
          </select>
        </label>
        <label>Fecha de nacimiento<input type="date" name="birthDate" /></label>
      </AdminSubjectForm>
    </>
  );
}
