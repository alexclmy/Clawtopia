import { NextResponse } from "next/server";
import { getClubDirectory } from "@/lib/mock-data";

export async function GET() {
  const clubs = await getClubDirectory();
  return NextResponse.json({ clubs });
}
