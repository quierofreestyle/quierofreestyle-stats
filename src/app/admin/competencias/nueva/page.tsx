import Link from "next/link";

import { createCompetition } from "../../_actions/subjects";
import { FormFeedback, SubjectFields } from "../../../../features/admin/subject-fields";
import { requireAdminCapability } from "../../../../server/auth/permissions";
import { db } from "../../../../server/db";

type Props = { searchParams: Promise<{ error?: string }> };

export default async function NewCompetitionPage({ searchParams }: Props) {
  await requireAdminCapability(["SUBJECT_MANAGE"], "/admin/competencias/nueva");
  const [{ error }, organizations, regions] = await Promise.all([
    searchParams,
    db.organization.findMany({ include: { subject: true }, orderBy: { subject: { displayName: "asc" } } }),
    db.region.findMany({ orderBy: [{ type: "asc" }, { name: "asc" }] }),
  ]);
  return (
    <>
      <header className="admin-header"><div><p className="eyebrow">Competencias</p><h1>Nueva</h1></div></header>
      <FormFeedback error={error} />
      <form action={createCompetition} className="admin-editor">
        <SubjectFields />
        <label>Organización<select name="organizationId" required defaultValue=""><option value="" disabled>Seleccionar</option>{organizations.map((item) => <option key={item.subjectId} value={item.subjectId}>{item.subject.displayName}</option>)}</select></label>
        <label>Nombre corto<input name="shortName" maxLength={80} /></label>
        <label>Alcance<select name="defaultScope" defaultValue="LOCAL"><option value="LOCAL">Local</option><option value="REGIONAL">Regional</option><option value="PROVINCIAL">Provincial</option><option value="NATIONAL">Nacional</option><option value="INTERNATIONAL">Internacional</option><option value="OTHER">Otro</option></select></label>
        <label>Región predeterminada<select name="defaultRegionId" defaultValue=""><option value="">Sin región</option>{regions.map((region) => <option key={region.id} value={region.id}>{region.name}</option>)}</select></label>
        <label>Fundación<input type="date" name="foundedOn" /></label>
        <div className="admin-form-actions"><Link href="/admin/competencias">Cancelar</Link><button type="submit">Crear competencia</button></div>
      </form>
    </>
  );
}
