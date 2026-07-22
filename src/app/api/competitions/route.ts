import { NextResponse } from "next/server";

import { listPublicCompetitions } from "../../../server/queries/public-competitions";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    const competitions = await listPublicCompetitions();

    return NextResponse.json({ data: competitions });
  } catch (error) {
    console.error("No se pudieron consultar las competencias públicas", error);

    return NextResponse.json(
      { error: "No se pudieron consultar las competencias" },
      { status: 500 },
    );
  }
}
