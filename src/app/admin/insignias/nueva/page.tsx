import { createBadge } from "../../_actions/badges";
import { AdminBadgeForm } from "../../../../features/admin/admin-badge-form";
import { requireAdminCapability } from "../../../../server/auth/permissions";
import { db } from "../../../../server/db";

export default async function NewBadgePage() {
  await requireAdminCapability(["BADGE_MANAGE"], "/admin/insignias/nueva");
  const [competitions, metrics] = await Promise.all([
    db.competition.findMany({ where: { subject: { status: { in: ["DRAFT", "ACTIVE"] } } }, include: { subject: true }, orderBy: { subject: { displayName: "asc" } } }),
    db.metricDefinition.findMany({ where: { isActive: true }, include: { recipientTypes: true }, orderBy: { name: "asc" } }),
  ]);
  return <><header className="admin-header"><div><p className="eyebrow">Insignias</p><h1>Nueva insignia</h1></div></header><p className="admin-required-note"><span className="admin-required">*</span> Campos obligatorios</p><AdminBadgeForm action={createBadge} submitLabel="Crear insignia" competitions={competitions.map((item) => ({ id: item.subjectId, label: item.subject.displayName }))} metrics={metrics.map((item) => ({ id: item.id, label: item.name, recipientTypes: item.recipientTypes.map(({ recipientType }) => recipientType) }))} /></>;
}
