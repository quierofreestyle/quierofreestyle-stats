import { notFound } from "next/navigation";

import { updateCompetitor } from "../../../_actions/subjects";
import { AdminSubjectForm } from "../../../../../features/admin/admin-subject-form";
import { dateInputValue } from "../../../../../features/admin/date-input-value";
import { SubjectFields } from "../../../../../features/admin/subject-fields";
import { requireAdminCapability } from "../../../../../server/auth/permissions";
import { db } from "../../../../../server/db";

type Props = { params: Promise<{ id: string }> };

export default async function EditCompetitorPage({ params }: Props) {
  const { id } = await params;
  await requireAdminCapability(["SUBJECT_MANAGE"], `/admin/competidores/${id}/editar`);
  const [competitor, regions] = await Promise.all([
    db.competitor.findUnique({ where: { subjectId: id }, include: { subject: true } }),
    db.region.findMany({ orderBy: [{ type: "asc" }, { name: "asc" }] }),
  ]);
  if (!competitor) notFound();
  const action = updateCompetitor.bind(null, id);
  return (
    <>
      <header className="admin-header"><div><p className="eyebrow">Competidores</p><h1>Editar</h1></div></header>
      <p className="admin-required-note"><span className="admin-required">*</span> Campos obligatorios</p>
      <AdminSubjectForm action={action} cancelHref="/admin/competidores" submitLabel="Guardar cambios">
        <SubjectFields defaults={competitor.subject} />
        <label>Región de origen<select name="homeRegionId" defaultValue={competitor.homeRegionId ?? ""}><option value="">Sin región</option>{regions.map((region) => <option key={region.id} value={region.id}>{region.name}</option>)}</select></label>
        <label>Fecha de nacimiento<input type="date" name="birthDate" defaultValue={dateInputValue(competitor.birthDate)} /></label>
      </AdminSubjectForm>
    </>
  );
}
