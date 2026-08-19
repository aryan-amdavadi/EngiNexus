export const COURSE_SKILL_MAPPING: Record<string, string[]> = {
  "Data Structures": ["Algorithms", "Data Structures", "Problem Solving"],
  "Database Management Systems": ["SQL", "Database Design", "Data Modeling"],
  "Object Oriented Programming": ["Java", "OOP", "Software Engineering"],
  "Machine Learning": ["Machine Learning", "Python", "Statistics"],
  "Computer Vision Fundamentals": ["Computer Vision", "Image Processing", "Deep Learning"],
  "Computer Networks": ["Networking", "TCP/IP"],
  "Deep Learning Systems": ["Deep Learning", "Python", "Computer Vision"],
  "Embedded Systems": ["Embedded Systems", "C++", "Electronics"],
  "Robotics Design": ["Robotics", "Embedded Systems", "Control Systems"],
  "Autonomous Systems": ["Autonomous Navigation", "Robotics", "Control Systems"],
  "Spatial Analytics": ["GIS", "Data Analysis", "Statistics"],
  "Precision Agriculture": ["Agricultural Systems", "Sensor Fusion", "Data Analysis"],
  "Field Monitoring": ["Crop Health Monitoring", "IoT", "Sensor Fusion"],
  "Smart Sensing": ["IoT", "Sensor Fusion", "Signal Processing"],
  "Renewable Systems": ["Renewable Energy", "Optimization", "Forecasting"],
};

export function getMappedSkillsForCourse(courseTitle: string): string[] {
  const normalized = courseTitle.trim();
  if (!normalized) return [];

  const exact = COURSE_SKILL_MAPPING[normalized];
  if (exact) return [...exact];

  const lower = normalized.toLowerCase();
  const matches = Object.entries(COURSE_SKILL_MAPPING)
    .filter(([courseName]) => courseName.toLowerCase().includes(lower) || lower.includes(courseName.toLowerCase()))
    .flatMap(([, skills]) => skills);

  return Array.from(new Set(matches));
}
