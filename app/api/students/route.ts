import { NextResponse } from "next/server";

import { prisma } from "../../../lib/prisma";

export async function GET() {
  try {
    const students = await prisma.student.findMany({
      include: {
        department: true,
        skills: {
          include: { skill: true },
        },
      },
      orderBy: { firstName: "asc" },
    });

    return NextResponse.json({
      success: true,
      data: students.map((student) => ({
        id: student.id,
        name: `${student.firstName} ${student.lastName}`,
        email: student.email,
        department: student.department.name,
        skills: student.skills.map((entry) => ({
          id: entry.skill.id,
          name: entry.skill.name,
          proficiency: entry.proficiency,
        })),
      })),
    });
  } catch (error) {
    console.error("Failed to fetch students:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch student records.",
      },
      { status: 500 },
    );
  }
}
