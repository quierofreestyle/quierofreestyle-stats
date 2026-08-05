import "server-only";

import { redirect } from "next/navigation";

import { db } from "../db";
import { ADMIN_CAPABILITIES, hasAnyCapability } from "./capabilities";
import { createSupabaseServerClient } from "./supabase-server";

export async function getAuthenticatedAppUser() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const appUser = await db.appUser.findUnique({
    where: { authSubject: user.id },
    include: {
      userRoles: {
        include: {
          role: {
            include: {
              permissions: { include: { permission: true } },
            },
          },
        },
      },
    },
  });

  if (!appUser || appUser.status !== "ACTIVE") {
    return null;
  }

  const permissions = new Set(
    appUser.userRoles.flatMap(({ role }) =>
      role.permissions.map(({ permission }) => permission.code),
    ),
  );

  return {
    id: appUser.id,
    email: appUser.email ?? user.email ?? null,
    permissions,
  };
}

export async function requireAdminUser() {
  const user = await getAuthenticatedAppUser();

  if (!user) {
    redirect("/login?next=/admin");
  }

  if (!hasAnyCapability(user.permissions, ADMIN_CAPABILITIES)) {
    redirect("/sin-acceso");
  }

  return user;
}

export async function requireAdminCapability(
  required: readonly string[],
  nextPath: string,
) {
  const user = await getAuthenticatedAppUser();

  if (!user) {
    redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  }

  if (!hasAnyCapability(user.permissions, required)) {
    redirect("/sin-acceso");
  }

  return user;
}

export async function requireAuthenticatedUser(nextPath: string) {
  const user = await getAuthenticatedAppUser();

  if (!user) {
    redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  }

  return user;
}

export async function requireManagedCompetitor(
  subjectId: string,
  nextPath = "/mi-perfil/insignias",
) {
  const user = await requireAuthenticatedUser(nextPath);
  const management = await db.subjectManager.findFirst({
    where: {
      userId: user.id,
      subjectId,
      accessLevel: { in: ["OWNER", "EDITOR"] },
      validFrom: { lte: new Date() },
      OR: [{ validTo: null }, { validTo: { gt: new Date() } }],
      subject: { type: "COMPETITOR" },
    },
    select: { id: true },
  });

  if (!management) {
    redirect("/sin-acceso");
  }

  return user;
}
