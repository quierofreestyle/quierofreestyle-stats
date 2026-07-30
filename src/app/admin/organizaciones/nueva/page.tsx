import { createOrganization } from "../../_actions/subjects";
import { AdminSubjectForm } from "../../../../features/admin/admin-subject-form";
import { SubjectFields } from "../../../../features/admin/subject-fields";
import { requireAdminCapability } from "../../../../server/auth/permissions";

type Props = { searchParams: Promise<{ returnTo?: string }> };

export default async function NewOrganizationPage({ searchParams }: Props) {
  await requireAdminCapability(["SUBJECT_MANAGE"], "/admin/organizaciones/nueva");
  const { returnTo } = await searchParams;
  const safeReturnTo = returnTo === "/admin/competencias/nueva" ? returnTo : "";
  return (
    <>
      <header className="admin-header"><div><p className="eyebrow">Organizaciones</p><h1>Nueva</h1></div></header>
      <p className="admin-required-note"><span className="admin-required">*</span> Campos obligatorios</p>
      <AdminSubjectForm action={createOrganization} cancelHref={safeReturnTo || "/admin/organizaciones"} submitLabel="Crear organización">
        <input type="hidden" name="returnTo" value={safeReturnTo} />
        <SubjectFields />
        <label>Tipo <span className="admin-required">*</span><select name="organizationType" required defaultValue="ORGANIZER"><option value="ORGANIZER">Organizadora</option><option value="LEAGUE">Liga</option><option value="MEDIA">Medio</option><option value="COLLECTIVE">Colectivo</option><option value="OTHER">Otro</option></select></label>
        <label>Fundación<input type="date" name="foundedOn" /></label>
        <label className="admin-field-wide">Sitio web<input type="url" name="websiteUrl" placeholder="https://..." /></label>
      </AdminSubjectForm>
    </>
  );
}
