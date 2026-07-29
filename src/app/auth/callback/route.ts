import { NextResponse, type NextRequest } from "next/server";

import { db } from "../../../server/db";
import { createSupabaseServerClient } from "../../../server/auth/supabase-server";

function safeNextPath(value: string | null): string {
  return value?.startsWith("/") && !value.startsWith("//") ? value : "/admin";
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const nextPath = safeNextPath(request.nextUrl.searchParams.get("next"));

  if (!code) {
    return NextResponse.redirect(new URL("/login?error=callback", request.url));
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.user) {
    return NextResponse.redirect(new URL("/login?error=callback", request.url));
  }

  await db.appUser.upsert({
    where: { authSubject: data.user.id },
    create: {
      authSubject: data.user.id,
      email: data.user.email,
      emailVerifiedAt: data.user.email_confirmed_at
        ? new Date(data.user.email_confirmed_at)
        : null,
      lastLoginAt: new Date(),
      status: "ACTIVE",
    },
    update: {
      email: data.user.email,
      emailVerifiedAt: data.user.email_confirmed_at
        ? new Date(data.user.email_confirmed_at)
        : null,
      lastLoginAt: new Date(),
    },
  });

  return NextResponse.redirect(new URL(nextPath, request.url));
}
