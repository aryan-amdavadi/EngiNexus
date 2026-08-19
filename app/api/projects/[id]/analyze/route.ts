import { NextResponse } from "next/server";

import { analyzeProject } from "../../../../../lib/project-analysis";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  if (!id || id.trim() === "") {
    return NextResponse.json(
      {
        success: false,
        error: "Project ID is required.",
      },
      { status: 400 },
    );
  }

  try {
    const result = await analyzeProject(id);
    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to analyze project.";
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
