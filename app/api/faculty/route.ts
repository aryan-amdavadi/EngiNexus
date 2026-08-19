import { NextResponse } from "next/server";

import { prisma } from "../../../lib/prisma";

export async function GET() {
  try {
    const faculty = await prisma.faculty.findMany({
      include: {
        department: true,
        expertise: {
          include: { skill: true },
        },
      },
      orderBy: { firstName: "asc" },
    });

    return NextResponse.json({
      success: true,
      data: faculty.map((member) => ({
        id: member.id,
        name: `${member.firstName} ${member.lastName}`,
        title: member.title,
        department: member.department.name,
        expertise: member.expertise.map((entry) => ({
          id: entry.skill.id,
          name: entry.skill.name,
          proficiency: entry.proficiency,
        })),
      })),
    });
  } catch (error) {
    console.error("Failed to fetch faculty:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch faculty records.",
      },
      { status: 500 },
    );
  }
}
