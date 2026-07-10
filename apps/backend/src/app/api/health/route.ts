import { NextResponse } from "next/server";
import { EVENT_STATUSES } from "@deef/shared";
// Importing env makes health fail loudly on a missing/invalid environment
import "@/lib/env";

export function GET(): NextResponse {
  // knownStatuses proves the @deef/shared workspace wiring end to end;
  // real consumers arrive with the pipeline modules (checkpoint 3+)
  return NextResponse.json({ ok: true, knownStatuses: EVENT_STATUSES.length });
}
