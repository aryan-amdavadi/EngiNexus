import { NextResponse } from "next/server";

import { formProjectTeam } from "../../../../../lib/team-formation";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  return handleRequest(id, undefined);
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const teamSize = Number(body.teamSize ?? 4);

  return handleRequest(id, Number.isFinite(teamSize) ? teamSize : 4);
}

async function handleRequest(projectId: string, teamSize?: number) {
  if (!projectId || projectId.trim() === "") {
    return NextResponse.json(
      {
        success: false,
        error: "Project ID is required.",
      },
      { status: 400 },
    );
  }

  try {
    const result = await formProjectTeam(projectId, teamSize ?? 4);
    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to form project team.";
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
