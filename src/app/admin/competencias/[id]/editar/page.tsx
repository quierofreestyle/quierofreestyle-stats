import Link from "next/link";
import { notFound } from "next/navigation";

import { updateCompetition } from "../../../_actions/subjects";
import { dateInputValue, FormFeedback, SubjectFields } from "../../../../../features/admin/subject-fields";
import { requireAdminCapability } from "../../../../../server/auth/permissions";
import { db } from "../../../../../server/db";

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string }> };

export default async function EditCompetitionPage({ params, searchParams }: Props) {
  const { id } = await params;
  await requireAdminCapability(["SUBJECT_MANAGE"], `/admin/competencias/${id}/editar`);
  const [{ error }, competition, organizations, regions] = await Promise.all([
    searchParams,
    db.competition.findUnique({ where: { subjectId: id }, include: { subject: true } }),
    db.organization.findMany({ include: { subject: true }, orderBy: { subject: { displayName: "asc" } } }),
    db.region.findMany({ orderBy: [{ type: "asc" }, { name: "asc" }] }),
  ]);
  if (!competition) notFound();
  const action = updateCompetition.bind(null, id);
  return (
    <>
      <header className="admin-header"><div><p className="eyebrow">Competencias</p><h1>Editar</h1></div></header>
      <FormFeedback error={error} />
      <form action={action} className="admin-editor">
        <SubjectFields defaults={competition.subject} />
        <label>Organización<select name="organizationId" required defaultValue={competition.organizationId}>{organizations.map((item) => <option key={item.subjectId} value={item.subjectId}>{item.subject.displayName}</option>)}</select></label>
        <label>Nombre corto<input name="shortName" maxLength={80} defaultValue={competition.shortName ?? ""} /></label>
        <label>Alcance<select name="defaultScope" defaultValue={competition.defaultScope}><option value="LOCAL">Local</option><option value="REGIONAL">Regional</option><option value="PROVINCIAL">Provincial</option><option value="NATIONAL">Nacional</option><option value="INTERNATIONAL">Internacional</option><option value="OTHER">Otro</option></select></label>
        <label>Región predeterminada<select name="defaultRegionId" defaultValue={competition.defaultRegionId ?? ""}><option value="">Sin región</option>{regions.map((region) => <option key={region.id} value={region.id}>{region.name}</option>)}</select></label>
        <label>Fundación<input type="date" name="foundedOn" defaultValue={dateInputValue(competition.foundedOn)} /></label>
        <div className="admin-form-actions"><Link href="/admin/competencias">Cancelar</Link><button type="submit">Guardar cambios</button></div>
      </form>
    </>
  );
}
