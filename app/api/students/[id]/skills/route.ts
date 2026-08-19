import { NextResponse } from "next/server";

import { calculateStudentSkillProfile } from "../../../../../lib/student-skill-profile";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  if (!id || id.trim() === "") {
    return NextResponse.json(
      {
        success: false,
        error: "Student ID is required.",
      },
      { status: 400 },
    );
  }

  try {
    const profile = await calculateStudentSkillProfile(id);
    return NextResponse.json({
      success: true,
      data: profile,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to calculate student skill profile.";
    const status = message.includes("not found") ? 404 : message.includes("required") ? 400 : 500;

    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status },
    );
  }
}
