import { NextResponse } from "next/server";
import { isSetupCompleted } from "@/lib/system";

export async function GET() {
  try {
    const completed = await isSetupCompleted();
    return NextResponse.json({ 
      setupCompleted: completed,
      needsSetup: !completed 
    });
  } catch (error) {
    return NextResponse.json({ 
      setupCompleted: false, 
      needsSetup: true 
    });
  }
}
