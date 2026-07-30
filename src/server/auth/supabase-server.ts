import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import {
  getSupabasePublishableKey,
  getSupabaseUrl,
} from "../env";

export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient(
    getSupabaseUrl(),
    getSupabasePublishableKey(),
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // Los Server Components no pueden escribir cookies. proxy.ts refresca la sesión.
          }
        },
      },
    },
  );
}
