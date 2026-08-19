import { NextResponse } from "next/server";

import { prisma } from "../../../lib/prisma";

function normalizeProject(project: {
  id: string;
  title: string;
  summary: string;
  domains: string;
  status: string;
  department: { name: string };
  _count?: { requirements: number };
}) {
  return {
    id: project.id,
    title: project.title,
    summary: project.summary,
    domains: project.domains ? JSON.parse(project.domains) : [],
    status: project.status,
    department: project.department.name,
    requirementCount: project._count?.requirements ?? 0,
  };
}

export async function GET() {
  try {
    const projects = await prisma.project.findMany({
      include: {
        department: true,
        _count: {
          select: { requirements: true },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({
      success: true,
      data: projects.map(normalizeProject),
    });
  } catch (error) {
    console.error("Failed to fetch projects:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch project records.",
      },
      { status: 500 },
    );
  }
}
