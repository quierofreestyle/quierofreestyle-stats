import { createCompetition } from "../../_actions/subjects";
import { AdminSubjectForm } from "../../../../features/admin/admin-subject-form";
import { SubjectFields } from "../../../../features/admin/subject-fields";
import { requireAdminCapability } from "../../../../server/auth/permissions";
import { db } from "../../../../server/db";

type Props = { searchParams: Promise<{ organizationId?: string }> };

export default async function NewCompetitionPage({ searchParams }: Props) {
  await requireAdminCapability(["SUBJECT_MANAGE"], "/admin/competencias/nueva");
  const [{ organizationId }, organizations] = await Promise.all([
    searchParams,
    db.organization.findMany({ include: { subject: true }, orderBy: { subject: { displayName: "asc" } } }),
  ]);
  return (
    <>
      <header className="admin-header"><div><p className="eyebrow">Competencias</p><h1>Nueva</h1></div></header>
      <p className="admin-required-note"><span className="admin-required">*</span> Campos obligatorios</p>
      <AdminSubjectForm action={createCompetition} cancelHref="/admin/competencias" storageKey="new-competition-draft" submitLabel="Crear competencia">
        <SubjectFields />
        <label>Organización <span className="admin-required">*</span><select name="organizationId" required defaultValue={organizationId ?? ""}><option value="" disabled>Seleccionar</option>{organizations.map((item) => <option key={item.subjectId} value={item.subjectId}>{item.subject.displayName}</option>)}</select></label>
        <label>Nombre corto o abreviatura<input name="shortName" maxLength={80} /><small>Opcional. Se usa en espacios reducidos; si queda vacío se mostrará el nombre visible.</small></label>
        <label>Fundación<input type="date" name="foundedOn" /></label>
      </AdminSubjectForm>
    </>
  );
}
