import { prisma } from "./prisma";
import { calculateStudentSkillProfile } from "./student-skill-profile";

const weights = {
  coverage: 0.45,
  averageConfidence: 0.25,
  diversity: 0.2,
  projectRelevance: 0.1,
} as const;

function clamp(value: number, min = 0, max = 100) {
  return Math.min(max, Math.max(min, value));
}

function average(values: number[]) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export async function formProjectTeam(projectId: string, teamSize = 4) {
  if (!projectId || projectId.trim() === "") {
    throw new Error("Project ID is required.");
  }

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      department: true,
      requirements: {
        include: { skill: true },
      },
    },
  });

  if (!project) {
    throw new Error(`Project with ID "${projectId}" was not found.`);
  }

  const requiredSkills = Array.from(
    new Set(
      project.requirements
        .filter((requirement) => requirement.requirementType === "SKILL" && requirement.skill)
        .map((requirement) => requirement.skill!.name),
    ),
  );

  if (requiredSkills.length === 0) {
    return {
      teamScore: 0,
      coverage: { covered: 0, total: requiredSkills.length, percent: 0 },
      members: [],
    };
  }

  const students = await prisma.student.findMany({
    include: {
      department: true,
      skills: { include: { skill: true } },
    },
  });

  const profiles = await Promise.all(
    students.map(async (student) => ({
      student,
      profile: await calculateStudentSkillProfile(student.id),
    })),
  );

  const teamMembers: Array<{
    studentId: string;
    name: string;
    department: string;
    skillsCovered: string[];
    confidence: number;
    reason: string;
    projectRelevance: number;
    domainRelevance: number;
  }> = [];

  const remainingSkills = new Set(requiredSkills);

  for (let index = 0; index < Math.max(1, Math.min(teamSize || 4, students.length)); index += 1) {
    let bestCandidate: (typeof profiles)[number] | null = null;
    let bestScore = -Infinity;

    for (const candidate of profiles) {
      if (teamMembers.some((member) => member.studentId === candidate.student.id)) continue;

      const skillMap = new Map(candidate.profile.skills.map((item) => [item.skill, item.confidence]));
      const coveredSkills = [...remainingSkills].filter((skill) => (skillMap.get(skill) ?? 0) >= 55);

      if (coveredSkills.length === 0) continue;

      const coverageScore = coveredSkills.reduce((sum, skill) => sum + (skillMap.get(skill) ?? 0), 0);
      const averageConfidence = average(coveredSkills.map((skill) => skillMap.get(skill) ?? 0));
      const projectCoverage = (coveredSkills.length / requiredSkills.length) * 100;
      const departmentName = project.department?.name ?? "";
      const domainRelevance = candidate.student.department.name === departmentName ? 100 : 70;
      const marginalScore =
        coverageScore * weights.coverage +
        averageConfidence * weights.averageConfidence +
        projectCoverage * 0.12 +
        domainRelevance * weights.projectRelevance;

      if (marginalScore > bestScore) {
        bestScore = marginalScore;
        bestCandidate = candidate;
      }
    }

    if (!bestCandidate) break;

    const skillMap = new Map(bestCandidate.profile.skills.map((item) => [item.skill, item.confidence]));
    const coveredSkills = [...remainingSkills].filter((skill) => (skillMap.get(skill) ?? 0) >= 55);
    const averageConfidence = average(coveredSkills.map((skill) => skillMap.get(skill) ?? 0));
    const strongestSkill = [...coveredSkills].sort(
      (left, right) => (skillMap.get(right) ?? 0) - (skillMap.get(left) ?? 0),
    )[0];

    const reason = strongestSkill
      ? `Provides strongest ${strongestSkill} coverage for the project.`
      : "Adds complementary capability not covered by the current team.";

    teamMembers.push({
      studentId: bestCandidate.student.id,
      name: `${bestCandidate.student.firstName} ${bestCandidate.student.lastName}`,
      department: bestCandidate.student.department.name,
      skillsCovered: coveredSkills,
      confidence: Math.round(averageConfidence),
      reason,
      projectRelevance: Math.round(calculateProjectRelevance(coveredSkills.length, requiredSkills.length)),
      domainRelevance: 75,
    });

    for (const skill of coveredSkills) {
      remainingSkills.delete(skill);
    }

    if (remainingSkills.size === 0) break;
  }

  const finalCoverage = new Set(teamMembers.flatMap((member) => member.skillsCovered));
  const coveragePercent = clamp((finalCoverage.size / requiredSkills.length) * 100, 0, 100);
  const averageConfidence = average(teamMembers.map((member) => member.confidence));
  const diversity = clamp((new Set(teamMembers.map((member) => member.department)).size / Math.max(teamMembers.length, 1)) * 100, 0, 100);
  const projectRelevance = average(teamMembers.map((member) => member.projectRelevance));

  const teamScore = Math.round(
    weights.coverage * coveragePercent +
      weights.averageConfidence * averageConfidence +
      weights.diversity * diversity +
      weights.projectRelevance * projectRelevance,
  );

  return {
    teamScore,
    coverage: {
      covered: finalCoverage.size,
      total: requiredSkills.length,
      percent: Math.round(coveragePercent),
    },
    members: teamMembers.map((member) => ({
      name: member.name,
      skillsCovered: member.skillsCovered,
      confidence: member.confidence,
      reason: member.reason,
      department: member.department,
    })),
  };
}

function calculateProjectRelevance(coveredCount: number, totalCount: number) {
  if (totalCount === 0) return 0;
  return (coveredCount / totalCount) * 100;
}

export { weights };
