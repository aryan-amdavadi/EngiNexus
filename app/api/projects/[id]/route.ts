import { NextResponse } from "next/server";

import { prisma } from "../../../../lib/prisma";

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
    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        department: true,
        requirements: {
          include: {
            skill: true,
            equipment: true,
            laboratory: true,
          },
        },
      },
    });

    if (!project) {
      return NextResponse.json(
        {
          success: false,
          error: `Project with ID "${id}" was not found.`,
        },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        ...project,
        domains: project.domains ? JSON.parse(project.domains) : [],
      },
    });
  } catch (error) {
    console.error(`Failed to fetch project ${id}:`, error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch project details.",
      },
      { status: 500 },
    );
  }
}
