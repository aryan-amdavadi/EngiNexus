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
