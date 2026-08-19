/**
 * lib/course-skill-mapping.ts
 *
 * Maps course titles to the skills they provide evidence for.
 * Used by both the academic import pipeline and the student skill profile engine.
 *
 * Guidelines for extending:
 * - Keys are canonical course title strings (case-sensitive, exact match first).
 * - The fuzzy fallback in getMappedSkillsForCourse handles partial matches.
 * - Add new entries as more courses appear in imported academic records.
 */

export const COURSE_SKILL_MAPPING: Record<string, string[]> = {
  // ── Computer Science & AI ──────────────────────────────────────────────
  "Data Structures": ["Algorithms", "Data Structures", "Problem Solving"],
  "Data Structures and Algorithms": ["Algorithms", "Data Structures", "Problem Solving"],
  "Design and Analysis of Algorithms": ["Algorithms", "Problem Solving"],
  "Database Management Systems": ["SQL", "Database Design", "Data Modeling"],
  "Database Systems": ["SQL", "Database Design", "Data Modeling"],
  "Object Oriented Programming": ["Java", "OOP", "Software Engineering"],
  "Object Oriented Programming with Java": ["Java", "OOP", "Software Engineering"],
  "Operating Systems": ["Systems Programming", "Linux", "Concurrency"],
  "Computer Networks": ["Networking", "TCP/IP"],
  "Computer Networks and Security": ["Networking", "TCP/IP", "Cybersecurity"],
  "Cybersecurity Fundamentals": ["Cybersecurity", "Network Security"],
  "Software Engineering": ["Software Engineering", "System Design", "Agile"],
  "Software Project Management": ["Software Engineering", "Agile", "Project Management"],
  "Web Technologies": ["HTML/CSS", "JavaScript", "Web Development"],
  "Cloud Computing": ["Cloud", "DevOps", "Distributed Systems"],
  "Distributed Systems": ["Distributed Systems", "Networking"],
  "Compiler Design": ["Compilers", "Algorithms", "Systems Programming"],

  // ── Machine Learning & AI ──────────────────────────────────────────────
  "Machine Learning": ["Machine Learning", "Python", "Statistics"],
  "Introduction to Machine Learning": ["Machine Learning", "Python", "Statistics"],
  "Advanced Machine Learning": ["Machine Learning", "Deep Learning", "Python"],
  "Computer Vision Fundamentals": ["Computer Vision", "Image Processing", "Deep Learning"],
  "Computer Vision": ["Computer Vision", "Image Processing", "Deep Learning"],
  "Deep Learning Systems": ["Deep Learning", "Python", "Computer Vision"],
  "Deep Learning": ["Deep Learning", "Python", "Machine Learning"],
  "Natural Language Processing": ["NLP", "Deep Learning", "Python"],
  "Artificial Intelligence": ["Machine Learning", "Algorithms", "Python"],
  "Neural Networks": ["Deep Learning", "Machine Learning", "Python"],
  "Data Science": ["Data Science", "Python", "Statistics"],
  "Data Science and Analytics": ["Data Science", "Python", "Statistics"],
  "Big Data Analytics": ["Big Data", "Data Science", "SQL"],
  "Statistics for Engineers": ["Statistics", "Data Analysis"],
  "Probability and Statistics": ["Statistics", "Data Analysis"],

  // ── Embedded & Electronics ─────────────────────────────────────────────
  "Embedded Systems": ["Embedded Systems", "C++", "Electronics"],
  "Embedded Systems Design": ["Embedded Systems", "C++", "Electronics"],
  "Digital Electronics": ["Electronics", "Digital Design"],
  "Analog Electronics": ["Electronics", "Circuit Design"],
  "VLSI Design": ["VLSI", "Electronics", "Digital Design"],
  "Microprocessors and Microcontrollers": ["Embedded Systems", "C", "Electronics"],
  "Signal Processing": ["Signal Processing", "Electronics", "Mathematics"],
  "Digital Signal Processing": ["Signal Processing", "DSP", "Mathematics"],
  "Internet of Things": ["IoT", "Embedded Systems", "Networking"],
  "IoT and Edge Computing": ["IoT", "Embedded Systems", "Edge AI"],

  // ── Robotics & Mechatronics ────────────────────────────────────────────
  "Robotics Design": ["Robotics", "Embedded Systems", "Control Systems"],
  "Robotics": ["Robotics", "Control Systems", "Embedded Systems"],
  "Autonomous Systems": ["Autonomous Navigation", "Robotics", "Control Systems"],
  "Robot Operating System": ["ROS", "Robotics", "Python"],
  "Mechatronics": ["Mechatronics", "Control Systems", "Embedded Systems"],
  "Control Systems": ["Control Systems", "Robotics", "Mathematics"],
  "Industrial Automation": ["Automation", "Control Systems", "Robotics"],

  // ── Mechanical ────────────────────────────────────────────────────────
  "Computer Aided Design": ["CAD", "3D Modeling", "Mechanical Design"],
  "CAD and Simulation": ["CAD", "Simulation", "Mechanical Design"],
  "Finite Element Analysis": ["FEA", "Simulation", "Mechanical Design"],
  "Fluid Mechanics": ["Fluid Mechanics", "Simulation"],
  "Thermodynamics": ["Thermodynamics"],
  "Manufacturing Processes": ["Manufacturing", "CNC"],
  "Additive Manufacturing": ["3D Printing", "Manufacturing", "CAD"],

  // ── Civil & GIS ───────────────────────────────────────────────────────
  "Spatial Analytics": ["GIS", "Data Analysis", "Statistics"],
  "Geographic Information Systems": ["GIS", "Spatial Analysis"],
  "Remote Sensing": ["GIS", "Remote Sensing", "Data Analysis"],
  "Structural Analysis": ["Structural Engineering", "Simulation"],
  "Geotechnical Engineering": ["Geotechnical", "Structural Engineering"],

  // ── Agriculture & Environment ─────────────────────────────────────────
  "Precision Agriculture": ["Agricultural Systems", "Sensor Fusion", "Data Analysis"],
  "Field Monitoring": ["Crop Health Monitoring", "IoT", "Sensor Fusion"],
  "Smart Sensing": ["IoT", "Sensor Fusion", "Signal Processing"],
  "Agricultural Technology": ["Agricultural Systems", "IoT", "Data Analysis"],
  "Environmental Engineering": ["Environmental Monitoring", "Data Analysis"],

  // ── Energy & Systems ──────────────────────────────────────────────────
  "Renewable Systems": ["Renewable Energy", "Optimization", "Forecasting"],
  "Renewable Energy": ["Renewable Energy", "Optimization"],
  "Power Systems": ["Power Systems", "Electrical Engineering"],
  "Energy Management": ["Renewable Energy", "Optimization", "Data Analysis"],
};

/**
 * Returns the list of skills associated with a given course title.
 *
 * Lookup strategy:
 *  1. Exact match (case-sensitive)
 *  2. Case-insensitive partial match (either direction)
 *  3. Empty array if no mapping found
 */
export function getMappedSkillsForCourse(courseTitle: string): string[] {
  const normalized = courseTitle.trim();
  if (!normalized) return [];

  // 1. Exact match
  const exact = COURSE_SKILL_MAPPING[normalized];
  if (exact) return [...exact];

  // 2. Fuzzy: title contains a key, or a key contains the title
  const lower = normalized.toLowerCase();
  const matches = Object.entries(COURSE_SKILL_MAPPING)
    .filter(
      ([key]) =>
        key.toLowerCase().includes(lower) || lower.includes(key.toLowerCase()),
    )
    .flatMap(([, skills]) => skills);

  return Array.from(new Set(matches));
}
