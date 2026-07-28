import Link from "next/link";

import { createOrganization } from "../../_actions/subjects";
import { FormFeedback, SubjectFields } from "../../../../features/admin/subject-fields";
import { requireAdminCapability } from "../../../../server/auth/permissions";

type Props = { searchParams: Promise<{ error?: string }> };

export default async function NewOrganizationPage({ searchParams }: Props) {
  await requireAdminCapability(["SUBJECT_MANAGE"], "/admin/organizaciones/nueva");
  const { error } = await searchParams;
  return (
    <>
      <header className="admin-header"><div><p className="eyebrow">Organizaciones</p><h1>Nueva</h1></div></header>
      <FormFeedback error={error} />
      <form action={createOrganization} className="admin-editor">
        <SubjectFields />
        <label>Tipo<select name="organizationType" defaultValue="ORGANIZER"><option value="ORGANIZER">Organizadora</option><option value="LEAGUE">Liga</option><option value="MEDIA">Medio</option><option value="COLLECTIVE">Colectivo</option><option value="OTHER">Otro</option></select></label>
        <label>Fundación<input type="date" name="foundedOn" /></label>
        <label className="admin-field-wide">Sitio web<input type="url" name="websiteUrl" placeholder="https://..." /></label>
        <div className="admin-form-actions"><Link href="/admin/organizaciones">Cancelar</Link><button type="submit">Crear organización</button></div>
      </form>
    </>
  );
}
