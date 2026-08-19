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
        error: "Student ID is required.",
      },
      { status: 400 },
    );
  }

  try {
    const student = await prisma.student.findUnique({
      where: { id },
      include: {
        department: true,
        skills: {
          include: { skill: true },
        },
        academicRecords: {
          include: { course: true },
        },
      },
    });

    if (!student) {
      return NextResponse.json(
        {
          success: false,
          error: `Student with ID "${id}" was not found.`,
        },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        id: student.id,
        name: `${student.firstName} ${student.lastName}`,
        email: student.email,
        department: student.department.name,
        skills: student.skills.map((entry) => ({
          name: entry.skill.name,
          proficiency: entry.proficiency,
          yearsExperience: entry.yearsExperience,
        })),
        academicRecords: student.academicRecords.map((record) => ({
          course: record.course.title,
          grade: record.grade,
          semester: record.semester,
          status: record.status,
        })),
      },
    });
  } catch (error) {
    console.error(`Failed to fetch student ${id}:`, error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch student details.",
      },
      { status: 500 },
    );
  }
}
