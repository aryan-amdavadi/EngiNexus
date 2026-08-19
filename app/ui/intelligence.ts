import { examples } from "./data";

export type ProjectAnalysis = { title: string; domains: string[]; skills: { name: string; level: "High" | "Medium" }[]; equipment: string[]; labs: string[] };

export type TeamRecommendation = {
  teamScore: number;
  coverage: { covered: number; total: number; percent: number };
  members: Array<{ name: string; skillsCovered: string[]; confidence: number; reason: string; department?: string }>;
};

export type ResourceUtilizationEntry = {
  id: string;
  resourceType: "LABORATORY" | "EQUIPMENT";
  resourceId: string;
  resourceName: string;
  period: string;
  date: string;
  utilization: number;
  capacity: number;
  demand: number;
  status: "AVAILABLE" | "LIMITED" | "UNAVAILABLE" | "BOOKED" | "NEAR_CAPACITY";
};

export type ResourceBottleneck = {
  resource: string;
  risk: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  currentUtilization: number;
  capacity: number;
  demand: number;
  projectedDemand: number;
  recommendation: string;
};

export type ResourceForecastEntry = {
  resourceType: "LABORATORY" | "EQUIPMENT";
  resourceId: string;
  resourceName: string;
  capacity: number;
  currentDemand: number;
  projectedDemand: number;
  demandGap: number;
  utilization: number;
  status: "AVAILABLE" | "LIMITED" | "UNAVAILABLE" | "BOOKED" | "NEAR_CAPACITY";
  history: Array<{ period: string; demand: number }>;
  projection: {
    nextMonth: number;
    nextSemester: number;
  };
  recommendation: string;
};

type ResourceUtilizationResponse = {
  data: ResourceUtilizationEntry[];
  latest: ResourceUtilizationEntry[];
  summary: {
    laboratoriesMonitored: number;
    equipmentMonitored: number;
    highDemandCount: number;
    attentionCount: number;
  };
};

type ResourceBottlenecksResponse = {
  data: ResourceBottleneck[];
};

type ResourceForecastResponse = {
  data: {
    focus: ResourceForecastEntry | null;
    forecasts: ResourceForecastEntry[];
    summary: {
      laboratoriesMonitored: number;
      equipmentMonitored: number;
      highDemandCount: number;
      attentionCount: number;
    };
    generatedAt: string;
  };
};

export async function fetchProjectTeam(projectId: string): Promise<TeamRecommendation> {
  const response = await fetch(`/api/projects/${projectId}/team`, { cache: "no-store" });
  if (!response.ok) {
    throw new Error("Failed to fetch project team recommendations.");
  }

  const json = await response.json();
  return json.data as TeamRecommendation;
}

export async function fetchResourceUtilization(): Promise<ResourceUtilizationResponse> {
  const response = await fetch("/api/resources/utilization", { cache: "no-store" });
  if (!response.ok) {
    throw new Error("Failed to fetch resource utilization.");
  }

  return (await response.json()) as ResourceUtilizationResponse;
}

export async function fetchResourceBottlenecks(): Promise<ResourceBottlenecksResponse> {
  const response = await fetch("/api/resources/bottlenecks", { cache: "no-store" });
  if (!response.ok) {
    throw new Error("Failed to fetch resource bottlenecks.");
  }

  return (await response.json()) as ResourceBottlenecksResponse;
}

export async function fetchResourceForecast(resourceName = "GPU Workstations"): Promise<ResourceForecastResponse> {
  const response = await fetch(`/api/resources/forecast?resource=${encodeURIComponent(resourceName)}`, {
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error("Failed to fetch resource forecast.");
  }

  return (await response.json()) as ResourceForecastResponse;
}

const flagship: ProjectAnalysis = {
  title: "Autonomous Crop Monitoring Robot",
  domains: ["Agriculture", "Robotics", "Computer Vision", "AI / ML", "Embedded Systems"],
  skills: [
    { name: "Computer Vision", level: "High" }, { name: "Machine Learning", level: "High" }, { name: "Python", level: "High" }, { name: "Robotics", level: "High" },
    { name: "Embedded Systems", level: "Medium" }, { name: "GIS", level: "Medium" }, { name: "Data Analysis", level: "Medium" },
  ],
  equipment: ["GPU Workstation", "High-Resolution Camera", "Robotic Platform", "Environmental Sensors", "GPS Module"],
  labs: ["AI / ML Lab", "Robotics Lab", "IoT / Embedded Systems Lab"],
};

export function analyzeProject(input: string): ProjectAnalysis {
  const value = input.toLowerCase();
  if (value.includes("crop") || value.includes("agricultur")) return flagship;
  if (value.includes("road")) return { ...flagship, title: "AI-Based Road Damage Detection", domains: ["Civil", "Computer Vision", "GIS", "AI / ML"], equipment: ["GPU Workstation", "High-Resolution Camera", "GPS Module", "Field Camera"], labs: ["AI / ML Lab", "Civil / Structural Lab"] };
  if (value.includes("medical") || value.includes("image")) return { ...flagship, title: "Medical Image Analysis", domains: ["Healthcare", "Computer Vision", "Machine Learning"], equipment: ["GPU Workstation", "Medical Imaging Dataset", "High-Resolution Display"], labs: ["AI / ML Lab"] };
  if (value.includes("warehouse")) return { ...flagship, title: "Autonomous Warehouse Robot", domains: ["Robotics", "Computer Vision", "Embedded Systems"], equipment: ["GPU Workstation", "Robotic Platform", "Depth Camera", "Environmental Sensors"], labs: ["Robotics Lab", "AI / ML Lab", "IoT / Embedded Systems Lab"] };
  return { ...flagship, title: input.trim().slice(0, 58) || examples[0].label };
}

// ── B7 Backend types ───────────────────────────────────────────────────────

export type BackendProject = {
  id: string;
  title: string;
  summary: string;
  domains: string[];
  status: string;
  department: string;
  requirementCount: number;
};

export type BackendAnalysis = {
  project: { id: string; title: string; summary: string; department: string; domains: string[] };
  domains: string[];
  requiredSkills: Array<{ id: string; name: string; category: string | null }>;
  requiredLaboratories: Array<{ id: string; name: string; status: string; utilizationRate: number }>;
  requiredEquipment: Array<{ id: string; name: string; category: string; location: string; status: string }>;
  skillMatches: Array<{
    skill: string;
    students: Array<{ student: { id: string; name: string; department: string; email: string }; score: number; matchedSkills: string[]; missingSkills: string[]; reasons: string[] }>;
  }>;
  facultyMatches: Array<{
    faculty: { id: string; name: string; title: string; department: string };
    score: number;
    matchedExpertise: string[];
    reasons: string[];
  }>;
  labMatches: Array<{
    lab: { id: string; name: string; department: string };
    score: number;
    availableCapabilities: string[];
    constraints: string[];
    reasons: string[];
  }>;
  equipmentMatches: Array<{
    equipment: { id: string; name: string; category: string; location: string };
    status: string;
    score: number;
    available: boolean;
    limited: boolean;
    unavailable: boolean;
    reasons: string[];
  }>;
  feasibility: {
    skillCoverage: number;
    facultyCoverage: number;
    equipmentAvailability: number;
    laboratoryAvailability: number;
    scheduleFeasibility: number;
    overall: number;
  };
  positiveFactors: string[];
  constraints: string[];
  recommendations: string[];
  status: string;
  score: number;
};

export type StudentEntry = {
  id: string;
  name: string;
  email: string;
  department: string;
  skills: Array<{ id: string; name: string; proficiency: number }>;
};

export type FacultyEntry = {
  id: string;
  name: string;
  title: string;
  department: string;
  expertise: Array<{ id: string; name: string; proficiency: number }>;
};

export async function fetchProjects(): Promise<{ data: BackendProject[] }> {
  const res = await fetch("/api/projects", { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch projects.");
  return res.json() as Promise<{ data: BackendProject[] }>;
}

export async function fetchProjectAnalysis(projectId: string): Promise<{ data: BackendAnalysis }> {
  const res = await fetch(`/api/projects/${projectId}/analyze`, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to analyze project.");
  return res.json() as Promise<{ data: BackendAnalysis }>;
}

export async function fetchStudentList(): Promise<{ data: StudentEntry[] }> {
  const res = await fetch("/api/students", { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch students.");
  return res.json() as Promise<{ data: StudentEntry[] }>;
}

export async function fetchFacultyList(): Promise<{ data: FacultyEntry[] }> {
  const res = await fetch("/api/faculty", { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch faculty.");
  return res.json() as Promise<{ data: FacultyEntry[] }>;
}
