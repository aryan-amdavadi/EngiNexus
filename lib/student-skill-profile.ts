import { prisma } from "./prisma";
import { getMappedSkillsForCourse } from "./course-skill-mapping";

const gradeWeights: Record<string, number> = {
  "A+": 18,
  A: 16,
  "A-": 15,
  "B+": 13,
  B: 11,
  "B-": 10,
  "C+": 8,
  C: 6,
  "C-": 5,
  D: 3,
  F: 0,
};

export type SkillEvidence = {
  skill: string;
  confidence: number;
  evidence: Array<{
    source: string;
    detail: string;
    contribution: number;
  }>;
};

function clamp(value: number): number {
  return Math.max(0, Math.min(100, value));
}

function normalizeConfidence(raw: number): number {
  return clamp(Math.round(raw));
}

export async function calculateStudentSkillProfile(studentId: string) {
  if (!studentId || studentId.trim() === "") {
    throw new Error("Student ID is required.");
  }

  const student = await prisma.student.findUnique({
    where: { id: studentId },
    include: {
      department: true,
      skills: {
        include: { skill: true },
      },
      academicRecords: {
        include: {
          course: {
            include: { skills: { include: { skill: true } } },
          },
        },
      },
      projects: {
        include: {
          project: {
            include: {
              requirements: {
                include: { skill: true },
              },
            },
          },
        },
      },
    },
  });

  if (!student) {
    throw new Error(`Student with ID "${studentId}" was not found.`);
  }

  const skillNames = new Set<string>();

  for (const skillEntry of student.skills) {
    skillNames.add(skillEntry.skill.name);
  }

  for (const record of student.academicRecords) {
    const mapped = getMappedSkillsForCourse(record.course.title);
    for (const name of mapped) skillNames.add(name);
    for (const skillEntry of record.course.skills) {
      skillNames.add(skillEntry.skill.name);
    }
  }

  for (const projectEntry of student.projects) {
    for (const requirement of projectEntry.project.requirements) {
      if (requirement.skill) skillNames.add(requirement.skill.name);
    }
  }

  const skills: SkillEvidence[] = [];

  for (const skillName of Array.from(skillNames).sort()) {
    const declared = student.skills.find((entry) => entry.skill.name === skillName);
    const evidence: Array<{ source: string; detail: string; contribution: number }> = [];

    let academicScore = 0;
    for (const record of student.academicRecords) {
      const mappedSkillSet = new Set([
        ...getMappedSkillsForCourse(record.course.title),
        ...record.course.skills.map((entry) => entry.skill.name),
      ]);

      if (!mappedSkillSet.has(skillName)) continue;

      const gradeWeight = gradeWeights[record.grade.toUpperCase()] ?? 6;
      const creditBonus = Math.min(8, (record.credits || 0) * 2);
      const courseSignal = Math.min(38, gradeWeight + creditBonus + 10);
      academicScore += courseSignal;
      evidence.push({
        source: "Academic coursework",
        detail: `${record.course.title} (${record.semester})`,
        contribution: courseSignal,
      });
    }

    let projectScore = 0;
    for (const projectEntry of student.projects) {
      const hasSkill = projectEntry.project.requirements.some(
        (requirement) => requirement.skill?.name === skillName,
      );
      if (!hasSkill) continue;

      const projectSignal = 18 + Math.min(18, projectEntry.project.requirements.length * 3);
      projectScore += projectSignal;
      evidence.push({
        source: "Project experience",
        detail: `${projectEntry.project.title}`,
        contribution: projectSignal,
      });
    }

    let declaredScore = 0;
    if (declared) {
      declaredScore = 18 + declared.proficiency * 12 + Math.min(15, declared.yearsExperience * 5);
      evidence.push({
        source: "Declared skill",
        detail: `${declared.proficiency}/5 proficiency across ${declared.yearsExperience} years`,
        contribution: declaredScore,
      });
    }

    const confidence = normalizeConfidence(
      academicScore * 0.5 + projectScore * 0.3 + declaredScore * 0.2,
    );

    if (confidence > 0 || declared || academicScore > 0 || projectScore > 0) {
      skills.push({
        skill: skillName,
        confidence,
        evidence: evidence
          .sort((left, right) => right.contribution - left.contribution)
          .slice(0, 4),
      });
    }
  }

  return {
    student: {
      id: student.id,
      name: `${student.firstName} ${student.lastName}`,
      department: student.department.name,
    },
    skills: skills.sort((left, right) => right.confidence - left.confidence),
  };
}

export async function getStudentSkillConfidence(studentId: string, skillName: string) {
  const profile = await calculateStudentSkillProfile(studentId);
  const match = profile.skills.find((entry) => entry.skill === skillName);
  return match ? match.confidence : 0;
}
