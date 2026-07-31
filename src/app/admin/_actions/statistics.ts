"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireAdminCapability } from "../../../server/auth/permissions";
import {
  processNextRecalculationRun,
  processRecalculationRun,
  queueFullRebuild,
  retryRecalculationRun,
} from "../../../server/statistics/recalculation";

const RECALCULATE = ["BADGE_RECALCULATE"] as const;

function message(error: unknown) {
  return error instanceof Error ? error.message : "No se pudo procesar el recálculo.";
}

export async function queueStatisticsRebuild(formData: FormData) {
  const actor = await requireAdminCapability(RECALCULATE, "/admin/estadisticas");
  const mode = formData.get("mode") === "DRY_RUN" ? "DRY_RUN" : "APPLY";
  const run = await queueFullRebuild(actor.id, mode);
  revalidatePath("/admin/estadisticas");
  redirect(`/admin/estadisticas?success=queued&run=${run.id}`);
}

export async function processNextStatisticsRun() {
  await requireAdminCapability(RECALCULATE, "/admin/estadisticas");
  let runId: string | null = null;
  try {
    const run = await processNextRecalculationRun();
    runId = run?.id ?? null;
    revalidatePath("/admin/estadisticas");
  } catch (error) {
    redirect(`/admin/estadisticas?error=${encodeURIComponent(message(error))}`);
  }
  redirect(
    runId
      ? `/admin/estadisticas?success=processed&run=${runId}`
      : "/admin/estadisticas?success=empty",
  );
}

export async function processStatisticsRun(id: string) {
  await requireAdminCapability(RECALCULATE, "/admin/estadisticas");
  try {
    await processRecalculationRun(id);
    revalidatePath("/admin/estadisticas");
  } catch (error) {
    redirect(`/admin/estadisticas?error=${encodeURIComponent(message(error))}&run=${id}`);
  }
  redirect(`/admin/estadisticas?success=processed&run=${id}`);
}

export async function retryStatisticsRun(id: string) {
  const actor = await requireAdminCapability(RECALCULATE, "/admin/estadisticas");
  try {
    await retryRecalculationRun(id, actor.id);
    revalidatePath("/admin/estadisticas");
  } catch (error) {
    redirect(`/admin/estadisticas?error=${encodeURIComponent(message(error))}&run=${id}`);
  }
  redirect(`/admin/estadisticas?success=retried&run=${id}`);
}
