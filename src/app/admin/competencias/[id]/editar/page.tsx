import { notFound } from "next/navigation";

import { updateCompetition } from "../../../_actions/subjects";
import { AdminSubjectForm } from "../../../../../features/admin/admin-subject-form";
import { dateInputValue } from "../../../../../features/admin/date-input-value";
import { SubjectFields } from "../../../../../features/admin/subject-fields";
import { requireAdminCapability } from "../../../../../server/auth/permissions";
import { db } from "../../../../../server/db";

type Props = { params: Promise<{ id: string }> };

export default async function EditCompetitionPage({ params }: Props) {
  const { id } = await params;
  await requireAdminCapability(["SUBJECT_MANAGE"], `/admin/competencias/${id}/editar`);
  const [competition, organizations] = await Promise.all([
    db.competition.findUnique({ where: { subjectId: id }, include: { subject: true } }),
    db.organization.findMany({ include: { subject: true }, orderBy: { subject: { displayName: "asc" } } }),
  ]);
  if (!competition) notFound();
  const action = updateCompetition.bind(null, id);
  return (
    <>
      <header className="admin-header"><div><p className="eyebrow">Competencias</p><h1>Editar</h1></div></header>
      <p className="admin-required-note"><span className="admin-required">*</span> Campos obligatorios</p>
      <AdminSubjectForm action={action} cancelHref="/admin/competencias" submitLabel="Guardar cambios">
        <SubjectFields defaults={competition.subject} />
        <label>Organización <span className="admin-required">*</span><select name="organizationId" required defaultValue={competition.organizationId}>{organizations.map((item) => <option key={item.subjectId} value={item.subjectId}>{item.subject.displayName}</option>)}</select></label>
        <label>Nombre corto o abreviatura<input name="shortName" maxLength={80} defaultValue={competition.shortName ?? ""} /><small>Opcional. Se usa en espacios reducidos; si queda vacío se mostrará el nombre visible.</small></label>
        <label>Fundación<input type="date" name="foundedOn" defaultValue={dateInputValue(competition.foundedOn)} /></label>
      </AdminSubjectForm>
    </>
  );
}
