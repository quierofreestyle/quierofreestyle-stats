import { notFound } from "next/navigation";

import { updateOrganization } from "../../../_actions/subjects";
import { AdminSubjectForm } from "../../../../../features/admin/admin-subject-form";
import { dateInputValue } from "../../../../../features/admin/date-input-value";
import { SubjectFields } from "../../../../../features/admin/subject-fields";
import { requireAdminCapability } from "../../../../../server/auth/permissions";
import { db } from "../../../../../server/db";

type Props = { params: Promise<{ id: string }> };

export default async function EditOrganizationPage({ params }: Props) {
  const { id } = await params;
  await requireAdminCapability(["SUBJECT_MANAGE"], `/admin/organizaciones/${id}/editar`);
  const organization = await db.organization.findUnique({ where: { subjectId: id }, include: { subject: true } });
  if (!organization) notFound();
  const action = updateOrganization.bind(null, id);
  return (
    <>
      <header className="admin-header"><div><p className="eyebrow">Organizaciones</p><h1>Editar</h1></div></header>
      <p className="admin-required-note"><span className="admin-required">*</span> Campos obligatorios</p>
      <AdminSubjectForm action={action} cancelHref="/admin/organizaciones" submitLabel="Guardar cambios">
        <SubjectFields defaults={organization.subject} />
        <label>Tipo <span className="admin-required">*</span><select name="organizationType" required defaultValue={organization.organizationType}><option value="ORGANIZER">Organizadora</option><option value="LEAGUE">Liga</option><option value="MEDIA">Medio</option><option value="COLLECTIVE">Colectivo</option><option value="OTHER">Otro</option></select></label>
        <label>Fundación<input type="date" name="foundedOn" defaultValue={dateInputValue(organization.foundedOn)} /></label>
        <label className="admin-field-wide">Sitio web<input type="url" name="websiteUrl" defaultValue={organization.websiteUrl ?? ""} /></label>
      </AdminSubjectForm>
    </>
  );
}
