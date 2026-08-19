import { prisma } from "./prisma";

const weights = {
  skillCoverage: 0.3,
  facultyCoverage: 0.2,
  equipmentAvailability: 0.2,
  laboratoryAvailability: 0.15,
  scheduleFeasibility: 0.15,
} as const;

function parseStringArray(value: string | null | undefined): string[] {
  if (!value) return [];

  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) {
      return parsed.map((item) => String(item).trim()).filter(Boolean);
    }
  } catch (_error) {
    // Fallback to comma/pipe delimited strings
  }

  return value
    .split(/[|,]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function statusScore(status: string): number {
  switch (status) {
    case "AVAILABLE":
      return 100;
    case "LIMITED":
      return 65;
    case "BOOKED":
      return 35;
    case "NEAR_CAPACITY":
      return 52;
    case "UNAVAILABLE":
    default:
      return 20;
  }
}

function buildStatusLabel(overall: number): string {
  if (overall >= 80) return "FEASIBLE";
  if (overall >= 65) return "FEASIBLE_WITH_MINOR_CONSTRAINTS";
  if (overall >= 45) return "CONSTRAINED";
  return "HIGH_RISK";
}

export async function analyzeProject(projectId: string) {
  if (!projectId || projectId.trim() === "") {
    throw new Error("Project ID is required.");
  }

  const project = await prisma.project.findUnique({
    where: { id: projectId },
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
    throw new Error(`Project with ID "${projectId}" was not found.`);
  }

  const domains = parseStringArray(project.domains);
  const requiredSkills = project.requirements
    .filter((requirement) => requirement.requirementType === "SKILL" && requirement.skill)
    .map((requirement) => requirement.skill!);

  const requiredEquipment = project.requirements
    .filter((requirement) => requirement.requirementType === "EQUIPMENT" && requirement.equipment)
    .map((requirement) => requirement.equipment!);

  const requiredLabs = project.requirements
    .filter((requirement) => requirement.requirementType === "LABORATORY" && requirement.laboratory)
    .map((requirement) => requirement.laboratory!);

  const skillIds = requiredSkills.map((skill) => skill.id);

  const skillMatches = await Promise.all(
    requiredSkills.map(async (skill) => {
      const students = await prisma.studentSkill.findMany({
        where: { skillId: skill.id },
        include: {
          skill: true,
          student: {
            include: { department: true },
          },
        },
      });

      const ranked = await Promise.all(
        students.map(async (entry) => {
          const studentSkills = await prisma.studentSkill.findMany({
            where: { studentId: entry.studentId },
            include: { skill: true },
          });

          const matchedSkills = studentSkills
            .filter((studentSkill) => skillIds.includes(studentSkill.skillId))
            .map((studentSkill) => studentSkill.skill.name);

          const missingSkills = requiredSkills
            .filter((requiredSkill) => !studentSkills.some((studentSkill) => studentSkill.skillId === requiredSkill.id))
            .map((requiredSkill) => requiredSkill.name);

          const score = Math.min(
            100,
            Math.max(
              36,
              Math.round(entry.proficiency * 18 + entry.yearsExperience * 3 + matchedSkills.length * 10),
            ),
          );

          const reasons = [
            matchedSkills.includes(skill.name) ? `Direct alignment with ${skill.name}.` : `Related exposure to ${skill.name}.`,
          ];

          if (missingSkills.length === 0) {
            reasons.push("Covers the full project skill set for this requirement.");
          } else if (missingSkills.length <= 2) {
            reasons.push(`Missing only ${missingSkills.slice(0, 2).join(", ")}.`);
          }

          return {
            student: {
              id: entry.student.id,
              name: `${entry.student.firstName} ${entry.student.lastName}`,
              department: entry.student.department.name,
              email: entry.student.email,
            },
            score,
            matchedSkills,
            missingSkills,
            reasons,
          };
        }),
      );

      return {
        skill: skill.name,
        students: ranked.sort((left, right) => right.score - left.score).slice(0, 5),
      };
    }),
  );

  const facultyMatches = await Promise.all(
    requiredSkills.map(async (skill) => {
      const expertiseRecords = await prisma.facultyExpertise.findMany({
        where: { skillId: skill.id },
        include: {
          skill: true,
          faculty: {
            include: { department: true },
          },
        },
      });

      return Promise.all(
        expertiseRecords.map(async (entry) => {
          const facultySkillRecords = await prisma.facultyExpertise.findMany({
            where: { facultyId: entry.faculty.id },
            include: { skill: true },
          });

          const facultySkills = facultySkillRecords.map((expertise) => expertise.skill.name);
          const matchedExpertise = facultySkills.filter((name) =>
            requiredSkills.some((required) => required.name === name),
          );

          const score = Math.min(
            100,
            Math.max(45, Math.round(entry.proficiency * 18 + entry.yearsExperience * 3 + matchedExpertise.length * 11)),
          );

          return {
            faculty: {
              id: entry.faculty.id,
              name: `${entry.faculty.firstName} ${entry.faculty.lastName}`,
              title: entry.faculty.title,
              department: entry.faculty.department.name,
            },
            score,
            matchedExpertise: Array.from(new Set(matchedExpertise)),
            reasons: [
              `Expertise in ${skill.name} with ${entry.proficiency}/5 proficiency.`,
              entry.yearsExperience > 0 ? `${entry.yearsExperience} years of relevant mentorship experience.` : "Relevant applied research background.",
            ],
          };
        }),
      );
    }),
  );

  const flattenedFacultyMatches = facultyMatches.flat();

  const labMatches = await Promise.all(
    requiredLabs.map(async (lab) => {
      const labEquipment = await prisma.labEquipment.findMany({
        where: { labId: lab.id },
        include: { equipment: true },
      });

      const capabilities = parseStringArray(lab.capabilities);
      const score = Math.min(100, Math.max(35, 100 - Math.max(0, lab.utilizationRate - 35)));
      const constraints = [] as string[];

      if (lab.utilizationRate >= 85) {
        constraints.push("Laboratory utilization is near or above preferred operating levels.");
      }

      if (labEquipment.length === 0) {
        constraints.push("No dedicated equipment inventory mapped to this laboratory.");
      }

      return {
        lab: {
          id: lab.id,
          name: lab.name,
          department: lab.departmentId,
        },
        score,
        availableCapabilities: capabilities.length > 0 ? capabilities : ["Laboratory capability not explicitly mapped."],
        constraints,
        reasons: [
          capabilities.length > 0 ? `Includes ${capabilities.slice(0, 3).join(", ")}.` : "Capability mapping is sparse.",
          lab.status === "AVAILABLE" ? "Current lab availability is acceptable for project work." : `Status is ${lab.status.toLowerCase().replace(/_/g, " ")}.`,
        ],
      };
    }),
  );

  const equipmentMatches = await Promise.all(
    requiredEquipment.map(async (equipment) => {
      const availabilityRecord = await prisma.resourceAvailability.findFirst({
        where: {
          resourceType: "EQUIPMENT",
          resourceId: equipment.id,
        },
      });

      const status = availabilityRecord?.status ?? equipment.status;
      const score = statusScore(status);

      return {
        equipment: {
          id: equipment.id,
          name: equipment.name,
          category: equipment.category,
          location: equipment.location,
        },
        status,
        score,
        available: status === "AVAILABLE",
        limited: status === "LIMITED" || status === "BOOKED" || status === "NEAR_CAPACITY",
        unavailable: status === "UNAVAILABLE",
        reasons: [
          availabilityRecord ? `Availability status is ${status.toLowerCase().replace(/_/g, " ")}.` : "No availability record was found in the database.",
          `Location: ${equipment.location}.`,
        ],
      };
    }),
  );

  const skillCoverage = requiredSkills.length
    ? Math.round(
        (skillMatches.filter((match) => match.students.length > 0).length / requiredSkills.length) * 100,
      )
    : 100;

  const facultyCoverage = flattenedFacultyMatches.length
    ? average(flattenedFacultyMatches.map((match) => match.score))
    : 55;

  const equipmentAvailability = equipmentMatches.length
    ? average(equipmentMatches.map((match) => match.score))
    : 100;

  const laboratoryAvailability = labMatches.length
    ? average(labMatches.map((match) => match.score))
    : 100;

  const scheduleFeasibility = Math.max(
    35,
    Math.min(
      100,
      100 - average([
        ...requiredLabs.map((lab) => lab.utilizationRate || 0),
        ...requiredEquipment.map((equipment) => equipment.utilizationRate || 0),
      ]),
    ),
  );

  const overall =
    weights.skillCoverage * skillCoverage +
    weights.facultyCoverage * facultyCoverage +
    weights.equipmentAvailability * equipmentAvailability +
    weights.laboratoryAvailability * laboratoryAvailability +
    weights.scheduleFeasibility * scheduleFeasibility;

  const positiveFactors = [
    requiredSkills.length > 0 ? "Required technical skills are represented in the student and faculty ecosystem." : "No explicit skill requirements were declared.",
    flattenedFacultyMatches.length > 0 ? "Suitable faculty expertise was identified for the project scope." : "Faculty expertise coverage is limited and should be validated.",
    requiredLabs.length > 0 ? "Core lab infrastructure has been mapped to the project requirements." : "No dedicated lab requirements were declared.",
  ];

  const constraints = [] as string[];

  if (equipmentMatches.some((match) => match.status === "LIMITED" || match.status === "BOOKED" || match.status === "NEAR_CAPACITY")) {
    constraints.push("At least one required equipment item is constrained by capacity or queue pressure.");
  }

  if (requiredLabs.some((lab) => lab.utilizationRate >= 80)) {
    constraints.push("One or more project laboratories are operating at high utilization.");
  }

  if (facultyCoverage < 75) {
    constraints.push("Faculty expertise coverage is below the preferred threshold for the project.");
  }

  const recommendations = [
    "Prioritize the highest-coverage student and faculty matches early in project planning.",
    "Schedule GPU-intensive or lab-heavy work during lower-demand periods.",
  ];

  if (equipmentMatches.some((match) => match.status === "LIMITED")) {
    recommendations.push("Reserve constrained equipment slots in advance to reduce scheduling risk.");
  }

  if (requiredLabs.length > 0 && labMatches.some((match) => match.score < 75)) {
    recommendations.push("Reassign or expand lab access to prevent bottlenecks during prototype and testing phases.");
  }

  const finalOverall = Math.round(overall);

  return {
    project: {
      id: project.id,
      title: project.title,
      summary: project.summary,
      department: project.department.name,
      domains,
    },
    domains,
    requiredSkills: requiredSkills.map((skill) => ({
      id: skill.id,
      name: skill.name,
      category: skill.category,
    })),
    requiredLaboratories: requiredLabs.map((lab) => ({
      id: lab.id,
      name: lab.name,
      status: lab.status,
      utilizationRate: lab.utilizationRate,
    })),
    requiredEquipment: requiredEquipment.map((equipment) => ({
      id: equipment.id,
      name: equipment.name,
      category: equipment.category,
      location: equipment.location,
      status: equipment.status,
    })),
    skillMatches,
    facultyMatches: flattenedFacultyMatches,
    labMatches,
    equipmentMatches,
    feasibility: {
      weights,
      skillCoverage,
      facultyCoverage,
      equipmentAvailability,
      laboratoryAvailability,
      scheduleFeasibility,
      overall: finalOverall,
    },
    positiveFactors,
    constraints,
    recommendations,
    status: buildStatusLabel(finalOverall),
    score: finalOverall,
  };
}

export { weights };
