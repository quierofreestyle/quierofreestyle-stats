import Link from "next/link";
import { notFound } from "next/navigation";

import { updateCompetitor } from "../../../_actions/subjects";
import { dateInputValue, FormFeedback, SubjectFields } from "../../../../../features/admin/subject-fields";
import { requireAdminCapability } from "../../../../../server/auth/permissions";
import { db } from "../../../../../server/db";

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string }> };

export default async function EditCompetitorPage({ params, searchParams }: Props) {
  const { id } = await params;
  await requireAdminCapability(["SUBJECT_MANAGE"], `/admin/competidores/${id}/editar`);
  const [{ error }, competitor, regions] = await Promise.all([
    searchParams,
    db.competitor.findUnique({ where: { subjectId: id }, include: { subject: true } }),
    db.region.findMany({ orderBy: [{ type: "asc" }, { name: "asc" }] }),
  ]);
  if (!competitor) notFound();
  const action = updateCompetitor.bind(null, id);
  return (
    <>
      <header className="admin-header"><div><p className="eyebrow">Competidores</p><h1>Editar</h1></div></header>
      <FormFeedback error={error} />
      <form action={action} className="admin-editor">
        <SubjectFields defaults={competitor.subject} />
        <label>Región de origen<select name="homeRegionId" defaultValue={competitor.homeRegionId ?? ""}><option value="">Sin región</option>{regions.map((region) => <option key={region.id} value={region.id}>{region.name}</option>)}</select></label>
        <label>Fecha de nacimiento<input type="date" name="birthDate" defaultValue={dateInputValue(competitor.birthDate)} /></label>
        <div className="admin-form-actions"><Link href="/admin/competidores">Cancelar</Link><button type="submit">Guardar cambios</button></div>
      </form>
    </>
  );
}
