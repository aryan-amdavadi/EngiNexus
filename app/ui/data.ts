export type Lab = { id: string; name: string; department: string; utilization: number; availability: "Available" | "Limited" | "Near capacity"; capabilities: string[] };
export type Equipment = { id: string; name: string; category: string; location: string; utilization: number; status: "Ready" | "Limited" | "Booked" };

export const labs: Lab[] = [
  { id: "ai", name: "AI / ML Lab", department: "Computer Engineering", utilization: 92, availability: "Near capacity", capabilities: ["GPU workstations", "ML tooling", "Vision datasets"] },
  { id: "robotics", name: "Robotics Lab", department: "Mechatronics", utilization: 88, availability: "Limited", capabilities: ["Robot platforms", "Motion capture", "Fabrication bay"] },
  { id: "iot", name: "IoT / Embedded Systems Lab", department: "Electronics", utilization: 76, availability: "Available", capabilities: ["Sensors", "Microcontrollers", "Test benches"] },
  { id: "embedded", name: "Embedded Systems Lab", department: "Electronics", utilization: 71, availability: "Available", capabilities: ["Oscilloscopes", "PCB prototyping", "Edge devices"] },
  { id: "mechanical", name: "Mechanical Automation Lab", department: "Mechanical", utilization: 61, availability: "Available", capabilities: ["CAD", "Automation", "3D printing"] },
  { id: "civil", name: "Civil / Structural Lab", department: "Civil", utilization: 47, availability: "Available", capabilities: ["Materials testing", "Structural analysis", "Survey equipment"] },
];

export const equipment: Equipment[] = [
  { id: "gpu", name: "GPU Workstations", category: "Computing", location: "AI / ML Lab", utilization: 94, status: "Limited" },
  { id: "printer", name: "3D Printers", category: "Fabrication", location: "Mechanical Automation Lab", utilization: 89, status: "Limited" },
  { id: "platform", name: "Robotic Platform", category: "Robotics", location: "Robotics Lab", utilization: 83, status: "Ready" },
  { id: "scope", name: "Oscilloscopes", category: "Electronics", location: "Embedded Systems Lab", utilization: 62, status: "Ready" },
  { id: "camera", name: "High-Resolution Camera", category: "Imaging", location: "AI / ML Lab", utilization: 57, status: "Ready" },
  { id: "sensors", name: "Environmental Sensor Kit", category: "IoT", location: "IoT / Embedded Systems Lab", utilization: 68, status: "Limited" },
  { id: "gps", name: "GPS Module", category: "Positioning", location: "IoT / Embedded Systems Lab", utilization: 51, status: "Ready" },
  { id: "drone", name: "Drone", category: "Aerial Systems", location: "Robotics Lab", utilization: 91, status: "Booked" },
];

export const examples = [
  { label: "Autonomous Crop Monitoring", value: "I want to build an autonomous crop monitoring robot that uses computer vision to detect crop diseases and generate field-level recommendations." },
  { label: "AI Road Damage Detection", value: "I want to create an AI-based road damage detection system using camera footage and GIS mapping." },
  { label: "Medical Image Analysis", value: "I want to build a medical image analysis tool to identify anomalies in diagnostic scans." },
  { label: "Warehouse Robot", value: "I want to develop an autonomous warehouse robot for inventory movement and obstacle avoidance." },
];

export const students = [
  { name: "Aarav Patel", initials: "AP", department: "Computer Engineering", skills: ["Computer Vision", "Python", "Deep Learning"], match: 94, why: "Fills the computer vision requirement with image-classification project experience." },
  { name: "Riya Shah", initials: "RS", department: "Mechatronics", skills: ["Robotics", "Embedded Systems", "ROS"], match: 91, why: "Brings robotic navigation and embedded systems implementation experience." },
  { name: "Dev Mehta", initials: "DM", department: "Data Science", skills: ["Data Science", "Machine Learning", "Python"], match: 88, why: "Supports model evaluation and field-level recommendation design." },
  { name: "Meera Desai", initials: "MD", department: "Agricultural Engineering", skills: ["GIS", "Domain Research", "Data Analysis"], match: 84, why: "Connects the solution to agricultural workflows and field validation." },
];

export const faculty = [
  { name: "Dr. Ananya Sharma", area: "Computer Vision · Robotics · AI", match: 96, note: "Research area and prior mentorship align with autonomous vision systems.", available: "Available for one new project" },
  { name: "Dr. Rohan Patel", area: "Machine Learning · Agricultural AI", match: 89, note: "Relevant agricultural AI expertise and experience with predictive models.", available: "Available from October" },
  { name: "Dr. Nisha Iyer", area: "Embedded Systems · IoT", match: 84, note: "Strong fit for sensor integration and low-power field deployment.", available: "Available for co-mentoring" },
];

export const bottlenecks = [
  { severity: "High", title: "GPU Capacity", detail: "Demand is projected to exceed current capacity during the next academic cycle.", action: "Add 3 GPU workstations or shift compatible workloads.", tone: "critical" },
  { severity: "High", title: "Robotics Lab", detail: "88% utilization with project demand rising across three departments.", action: "Prioritize shared slots and route fabrication tasks to Mechanical Automation.", tone: "warning" },
  { severity: "Moderate", title: "3D Printing", detail: "Booking demand exceeds current capacity during peak periods.", action: "Introduce project batching and a rapid-prototype queue.", tone: "warning" },
  { severity: "Moderate", title: "Specialized Cameras", detail: "Limited availability for computer vision projects this month.", action: "Reserve shared imaging kits two weeks in advance.", tone: "neutral" },
];
