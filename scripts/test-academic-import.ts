import { prisma } from "../lib/prisma";
import { importAcademicData } from "../lib/academic-import";
import { calculateStudentSkillProfile } from "../lib/student-skill-profile";

async function main() {
  const student = await prisma.student.findFirst({
    orderBy: { createdAt: "asc" },
    select: { id: true, firstName: true, lastName: true },
  });

  const [courseA, courseB] = await prisma.course.findMany({
    orderBy: { code: "asc" },
    take: 2,
    select: { code: true, title: true },
  });

  if (!student || !courseA || !courseB) {
    throw new Error("Seed data is required before running academic import test.");
  }

  const jsonSummary = await importAcademicData({
    format: "json",
    data: [
      {
        student_id: student.id,
        student_name: `${student.firstName} ${student.lastName}`,
        semester: "2026-Summer",
        course_code: courseA.code,
        course_name: courseA.title,
        grade: "A",
        credits: 4,
        sgpa: 8.9,
      },
      {
        student_id: student.id,
        semester: "2026-Summer",
        course_code: "UNKNOWN-101",
        grade: "B+",
        credits: 3,
      },
      {
        student_id: student.id,
        semester: "2026-Summer",
        course_code: courseA.code,
        grade: "A",
        credits: 4,
      },
    ],
  });

  const csvSummary = await importAcademicData({
    format: "csv",
    data: [
      "student_id,student_name,semester,course_code,course_name,grade,credits,sgpa",
      `${student.id},${student.firstName} ${student.lastName},2026-Monsoon,${courseB.code},${courseB.title},A-,3,8.4`,
      `${student.id},${student.firstName} ${student.lastName},2026-Monsoon,${courseB.code},${courseB.title},Z,3,8.4`,
    ].join("\n"),
  });

  const profile = await calculateStudentSkillProfile(student.id);

  console.log("JSON summary:", jsonSummary);
  console.log("CSV summary:", csvSummary);
  console.log("Skill profile top skill:", profile.skills[0]);
}

main()
  .catch((error) => {
    console.error("Academic import validation failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
