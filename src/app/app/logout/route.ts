import { NextResponse } from "next/server";
import { appUrl } from "@/config/env";
import { endAgentSession } from "@/lib/auth/session";

export async function POST() {
  await endAgentSession();
  return NextResponse.redirect(`${appUrl}/app/login`, { status: 303 });
}
