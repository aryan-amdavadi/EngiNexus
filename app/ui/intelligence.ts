import { examples } from "./data";

export type ProjectAnalysis = { title: string; domains: string[]; skills: { name: string; level: "High" | "Medium" }[]; equipment: string[]; labs: string[] };

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
