import { notFound } from "next/navigation";

import { updateBadge } from "../../../_actions/badges";
import { AdminBadgeForm } from "../../../../../features/admin/admin-badge-form";
import { requireAdminCapability } from "../../../../../server/auth/permissions";
import { db } from "../../../../../server/db";

type Props = { params: Promise<{ id: string }> };
export default async function EditBadgePage({ params }: Props) {
  const { id } = await params;
  await requireAdminCapability(["BADGE_MANAGE"], `/admin/insignias/${id}/editar`);
  const [badge, competitions, metrics] = await Promise.all([
    db.badgeDefinition.findUnique({ where: { id }, include: {
      instances: { take: 1, include: { scope: true } },
      ruleVersions: { orderBy: { versionNumber: "desc" }, take: 1, include: { tiers: { orderBy: { rank: "asc" } } } },
    } }),
    db.competition.findMany({ where: { subject: { status: { in: ["DRAFT", "ACTIVE"] } } }, include: { subject: true }, orderBy: { subject: { displayName: "asc" } } }),
    db.metricDefinition.findMany({ where: { isActive: true }, include: { recipientTypes: true }, orderBy: { name: "asc" } }),
  ]);
  if (!badge || !badge.instances[0]) notFound();
  const instance = badge.instances[0]; const rule = badge.ruleVersions[0];
  return <><header className="admin-header"><div><p className="eyebrow">Insignias</p><h1>Editar insignia</h1></div><span className="admin-status">{badge.code}</span></header><p className="admin-required-note"><span className="admin-required">*</span> Campos obligatorios</p><AdminBadgeForm action={updateBadge.bind(null, id)} submitLabel="Guardar nueva versión" competitions={competitions.map((item) => ({ id: item.subjectId, label: item.subject.displayName }))} metrics={metrics.map((item) => ({ id: item.id, label: item.name, recipientTypes: item.recipientTypes.map(({ recipientType }) => recipientType) }))} defaults={{
    code: badge.code, name: instance.displayName, slug: instance.slug, description: instance.description,
    publicRule: badge.publicRule, imageUrl: badge.imageUrl ?? "", kind: badge.kind,
    assignmentMode: badge.assignmentMode, recipientType: badge.recipientType,
    permanenceMode: badge.permanenceMode, status: badge.status,
    scopeType: instance.scope?.scopeType ?? "GLOBAL", competitionId: instance.scope?.competitionId ?? "",
    metricId: rule?.metricId ?? "", operator: rule?.operator ?? "GTE",
    threshold: rule?.baseThreshold?.toString() ?? "", reason: "Actualización de la configuración",
    tiers: rule?.tiers.map((tier) => ({ rank: tier.rank, code: tier.code, displayName: tier.displayName, threshold: Number(tier.threshold), color: tier.color })) ?? [],
  }} /></>;
}
