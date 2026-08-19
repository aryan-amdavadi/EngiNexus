import { prisma } from "./prisma";
import { calculateStudentSkillProfile } from "./student-skill-profile";

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

async function computeProjectIntelligence(
  projectInfo: { id: string; title: string; summary: string; department: string; domains: string[] },
  requiredSkills: any[],
  requiredEquipment: any[],
  requiredLabs: any[]
) {
  const domains = projectInfo.domains;

  const skillMatches = await Promise.all(
    requiredSkills.map(async (skill) => {
      const students = await prisma.student.findMany({
        include: {
          department: true,
        },
      });

      const ranked = await Promise.all(
        students.map(async (student) => {
          const profile = await calculateStudentSkillProfile(student.id);
          const target = profile.skills.find((entry) => entry.skill === skill.name);
          const score = target?.confidence ?? 0;
          const matchedSkills = target ? [skill.name] : [];
          const missingSkills = requiredSkills
            .filter((requiredSkill) => !profile.skills.some((entry) => entry.skill === requiredSkill.name))
            .map((requiredSkill) => requiredSkill.name);

          const reasons = [] as string[];
          if (target) {
            reasons.push(`Evidence-based confidence in ${skill.name} is ${score}%.`);
            if (target.evidence.length > 0) {
              reasons.push(`Evidence sources: ${target.evidence.map((item) => item.source).join(", ")}.`);
            }
          } else {
            reasons.push(`No strong evidence for ${skill.name} in academic, project, or declared skills.`);
          }

          if (missingSkills.length === 0) {
            reasons.push("Student covers the full project skill set at the current confidence threshold.");
          } else if (missingSkills.length <= 2) {
            reasons.push(`Missing only ${missingSkills.slice(0, 2).join(", ")}.`);
          }

          return {
            student: {
              id: student.id,
              name: `${student.firstName} ${student.lastName}`,
              department: student.department.name,
              email: student.email,
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
        students: ranked.filter((entry) => entry.score > 0).sort((left, right) => right.score - left.score).slice(0, 5),
      };
    }),
  );

  // Faculty Deduplication & Weighted Scoring
  const allFaculty = await prisma.faculty.findMany({ include: { department: true } });
  
  const facultyMatches = [];
  
  for (const faculty of allFaculty) {
    const expertiseRecords = await prisma.facultyExpertise.findMany({
      where: { facultyId: faculty.id },
      include: { skill: true }
    });
    
    if (expertiseRecords.length === 0) continue;
    
    const matchedExpertise = expertiseRecords.filter(exp => 
      requiredSkills.some(req => req.id === exp.skill.id)
    );
    
    if (matchedExpertise.length === 0) continue;
    
    const skillCoverage = matchedExpertise.length / requiredSkills.length;
    const maxProficiency = Math.max(...matchedExpertise.map(e => e.proficiency));
    const avgProficiency = average(matchedExpertise.map(e => e.proficiency));
    const expertiseProficiency = (maxProficiency * 0.7 + avgProficiency * 0.3) / 5;
    
    const domainRelevance = domains.some(d => faculty.department.name.includes(d) || matchedExpertise.some(e => e.skill.category?.includes(d))) ? 1 : 0.5;
    const projectRelevance = matchedExpertise.some(e => e.yearsExperience > 0) ? 1 : 0.4;
    const departmentRelevance = (projectInfo.department && faculty.department.name === projectInfo.department) ? 1 : 0.6;
    
    // Using availability from database
    const mentoringAvailability = (faculty as any).available !== false ? 1 : 0;
    
    const rawScore = 
      (0.40 * skillCoverage) + 
      (0.20 * expertiseProficiency) + 
      (0.15 * domainRelevance) + 
      (0.10 * projectRelevance) + 
      (0.10 * departmentRelevance) + 
      (0.05 * mentoringAvailability);
      
    const score = Math.min(100, Math.round(rawScore * 100));
    
    const reasons = [
      `Matches ${matchedExpertise.length} of ${requiredSkills.length} required skills.`,
      `Expertise in: ${matchedExpertise.map(e => `${e.skill.name} (${e.proficiency}/5)`).join(", ")}.`
    ];
    if (domainRelevance === 1) reasons.push("Strong domain relevance based on department or skill category.");
    if (mentoringAvailability === 1) reasons.push("Available for mentoring.");
    
    facultyMatches.push({
      faculty: {
        id: faculty.id,
        name: `${faculty.firstName} ${faculty.lastName}`,
        title: faculty.title,
        department: faculty.department.name,
      },
      score,
      skillCoverage: Math.round(skillCoverage * 100),
      expertiseBreadth: matchedExpertise.length,
      matchedExpertise: matchedExpertise.map(e => e.skill.name),
      reasons,
    });
  }
  
  facultyMatches.sort((a, b) => b.score - a.score || b.skillCoverage - a.skillCoverage || b.expertiseBreadth - a.expertiseBreadth);
  const topFacultyMatches = facultyMatches.slice(0, 5);

  const labMatches = await Promise.all(
    requiredLabs.map(async (lab) => {
      const labEquipment = await prisma.labEquipment.findMany({
        where: { labId: lab.id },
        include: { equipment: true },
      });

      const capabilities = parseStringArray(lab.capabilities);
      const capabilityCoverage = capabilities.length > 0 ? 1 : 0.5;
      
      const matchedEquipment = labEquipment.filter(le => requiredEquipment.some(re => re.id === le.equipmentId));
      const equipmentCoverage = requiredEquipment.length > 0 ? matchedEquipment.length / requiredEquipment.length : 1;
      
      const availabilityScore = lab.status === "AVAILABLE" ? 1 : lab.status === "LIMITED" ? 0.7 : 0.3;
      const utilizationHealth = lab.utilizationRate ? Math.max(0, (100 - lab.utilizationRate) / 100) : 1;
      
      const rawScore = 0.40 * capabilityCoverage + 0.25 * equipmentCoverage + 0.20 * availabilityScore + 0.15 * utilizationHealth;
      const score = Math.min(100, Math.max(0, Math.round(rawScore * 100)));
      
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
          lab.status === "AVAILABLE" ? "Current lab availability is acceptable for project work." : `Status is ${lab.status?.toLowerCase().replace(/_/g, " ")}.`,
          `Equipment coverage in this lab: ${Math.round(equipmentCoverage * 100)}%.`
        ],
      };
    }),
  );
  
  labMatches.sort((a, b) => b.score - a.score);

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
  equipmentMatches.sort((a, b) => b.score - a.score);

  const skillCoverage = requiredSkills.length
    ? Math.round(
        (skillMatches.filter((match) => match.students.length > 0).length / requiredSkills.length) * 100,
      )
    : 100;

  const facultyCoverage = topFacultyMatches.length
    ? average(topFacultyMatches.map((match) => match.score))
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
    topFacultyMatches.length > 0 ? "Suitable faculty expertise was identified for the project scope." : "Faculty expertise coverage is limited and should be validated.",
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
    project: projectInfo,
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
    facultyMatches: topFacultyMatches,
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

  const requiredSkills = project.requirements
    .filter((requirement) => requirement.requirementType === "SKILL" && requirement.skill)
    .map((requirement) => requirement.skill!);

  const requiredEquipment = project.requirements
    .filter((requirement) => requirement.requirementType === "EQUIPMENT" && requirement.equipment)
    .map((requirement) => requirement.equipment!);

  const requiredLabs = project.requirements
    .filter((requirement) => requirement.requirementType === "LABORATORY" && requirement.laboratory)
    .map((requirement) => requirement.laboratory!);

  return computeProjectIntelligence(
    {
      id: project.id,
      title: project.title,
      summary: project.summary,
      department: project.department.name,
      domains: parseStringArray(project.domains),
    },
    requiredSkills,
    requiredEquipment,
    requiredLabs
  );
}

export async function analyzeCustomProject(input: string) {
  const value = input.toLowerCase();
  
  // Keyword Normalization and Phrase Matching
  let title = "Custom Engineering Project";
  if (value.includes("pothole") || value.includes("road")) title = "AI-Based Pothole Detection System";
  else if (value.includes("attendance") || value.includes("face")) title = "Face Recognition Attendance System";
  else if (value.includes("electricity") || value.includes("forecast")) title = "Machine Learning Energy Forecasting Platform";
  else {
    let clean = input.replace(/^(i want to build|create|develop|build)( a| an)? /i, "").trim();
    if (clean.length > 5 && clean.length < 50) {
      title = clean.split(" ").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
    } else {
      title = "Custom System Design";
    }
  }

  const allSkills = await prisma.skill.findMany();
  const allLabs = await prisma.laboratory.findMany({ include: { equipment: { include: { equipment: true } } } });
  const allEquipment = await prisma.equipment.findMany();

  const detectedSkills: any[] = [];
  const addSkillByKeyword = (keywords: string[], skillName: string) => {
    if (keywords.some(k => value.includes(k))) {
      const match = allSkills.find(s => s.name === skillName || s.name.includes(skillName));
      if (match && !detectedSkills.some(s => s.id === match.id)) {
        detectedSkills.push(match);
      }
    }
  };

  addSkillByKeyword(["ai ", "artificial intelligence", "machine learning", "electricity", "forecast", "face recognition", "pothole", "waste"], "Machine Learning");
  addSkillByKeyword(["computer vision", "image", "camera", "face recognition", "pothole", "waste"], "Computer Vision");
  addSkillByKeyword(["robot", "autonomous", "navigation"], "Robotics");
  addSkillByKeyword(["sensor", "iot", "microcontroller", "embedded"], "Embedded Systems");
  addSkillByKeyword(["gis", "map", "spatial", "pothole"], "GIS");
  addSkillByKeyword(["data analysis", "electricity"], "Data Analysis");
  addSkillByKeyword(["python", "ai ", "machine learning", "data"], "Python");

  const detectedDomains = new Set<string>(["Engineering"]);
  if (value.includes("crop") || value.includes("agricultur")) detectedDomains.add("Agriculture");
  if (value.includes("road") || value.includes("pothole")) detectedDomains.add("Civil");
  if (value.includes("medical") || value.includes("image") || value.includes("health")) detectedDomains.add("Healthcare");
  if (value.includes("robot") || value.includes("warehouse")) detectedDomains.add("Robotics");
  if (value.includes("electricity") || value.includes("energy")) detectedDomains.add("Energy");

  const requiredLabs: any[] = [];
  const requiredEquipment: any[] = [];

  for (const lab of allLabs) {
    let matchScore = 0;
    const caps = lab.capabilities.toLowerCase();
    const dept = lab.departmentId?.toLowerCase() || "";
    
    if (detectedSkills.some(s => caps.includes(s.name.toLowerCase()))) matchScore++;
    if (Array.from(detectedDomains).some(d => dept.includes(d.toLowerCase()))) matchScore++;
    
    if (matchScore > 0) {
      requiredLabs.push(lab);
      for (const le of lab.equipment) {
        if (!requiredEquipment.some(e => e.id === le.equipmentId)) {
          requiredEquipment.push(le.equipment);
        }
      }
    }
  }

  const limitedLabs = requiredLabs.slice(0, 2);
  const limitedEq = requiredEquipment.filter(eq => 
    detectedSkills.some(s => eq.category.toLowerCase().includes(s.name.toLowerCase()) || 
    (s.name === "Computer Vision" && eq.name.toLowerCase().includes("camera")) ||
    (s.name === "Machine Learning" && eq.name.toLowerCase().includes("gpu")) ||
    (s.name === "Robotics" && eq.name.toLowerCase().includes("robot"))
    )
  );

  return computeProjectIntelligence(
    {
      id: `custom-${Date.now()}`,
      title,
      summary: input,
      department: "Interdisciplinary",
      domains: Array.from(detectedDomains),
    },
    detectedSkills,
    limitedEq.length > 0 ? limitedEq : requiredEquipment.slice(0, 3),
    limitedLabs
  );
}

export { weights };
