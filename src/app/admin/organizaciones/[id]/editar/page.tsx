import Link from "next/link";
import { notFound } from "next/navigation";

import { updateOrganization } from "../../../_actions/subjects";
import { dateInputValue, FormFeedback, SubjectFields } from "../../../../../features/admin/subject-fields";
import { requireAdminCapability } from "../../../../../server/auth/permissions";
import { db } from "../../../../../server/db";

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string }> };

export default async function EditOrganizationPage({ params, searchParams }: Props) {
  const { id } = await params;
  await requireAdminCapability(["SUBJECT_MANAGE"], `/admin/organizaciones/${id}/editar`);
  const [{ error }, organization] = await Promise.all([
    searchParams,
    db.organization.findUnique({ where: { subjectId: id }, include: { subject: true } }),
  ]);
  if (!organization) notFound();
  const action = updateOrganization.bind(null, id);
  return (
    <>
      <header className="admin-header"><div><p className="eyebrow">Organizaciones</p><h1>Editar</h1></div></header>
      <FormFeedback error={error} />
      <form action={action} className="admin-editor">
        <SubjectFields defaults={organization.subject} />
        <label>Tipo<select name="organizationType" defaultValue={organization.organizationType}><option value="ORGANIZER">Organizadora</option><option value="LEAGUE">Liga</option><option value="MEDIA">Medio</option><option value="COLLECTIVE">Colectivo</option><option value="OTHER">Otro</option></select></label>
        <label>Fundación<input type="date" name="foundedOn" defaultValue={dateInputValue(organization.foundedOn)} /></label>
        <label className="admin-field-wide">Sitio web<input type="url" name="websiteUrl" defaultValue={organization.websiteUrl ?? ""} /></label>
        <div className="admin-form-actions"><Link href="/admin/organizaciones">Cancelar</Link><button type="submit">Guardar cambios</button></div>
      </form>
    </>
  );
}
