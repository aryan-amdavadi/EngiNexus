import { PrismaClient, RequirementType, ResourceEntityType, ResourceStatus } from "@prisma/client";

const prisma = new PrismaClient();

const departmentData = [
  { name: "Computer Engineering", code: "CE", description: "AI systems, computing, and embedded intelligence" },
  { name: "Mechatronics", code: "MT", description: "Robotics, machine design, and automation" },
  { name: "Civil Engineering", code: "CV", description: "Infrastructure, transport, and structural systems" },
  { name: "Electronics", code: "EE", description: "Signal processing and networked devices" },
  { name: "Mechanical Engineering", code: "ME", description: "Design, fabrication, and manufacturing systems" },
  { name: "Agricultural Engineering", code: "AE", description: "Sustainable agri-tech and field systems" },
];

const skillSeed = [
  "Computer Vision",
  "Machine Learning",
  "Python",
  "Robotics",
  "Embedded Systems",
  "GIS",
  "Data Analysis",
  "C++",
  "Deep Learning",
  "IoT",
  "Sensor Fusion",
  "Image Processing",
  "Computer Architecture",
  "Control Systems",
  "Autonomous Navigation",
  "Data Science",
  "Signal Processing",
  "Electronics",
  "Mechanical Design",
  "Agricultural Systems",
  "Crop Health Monitoring",
  "Road Condition Assessment",
  "Medical Imaging",
  "Edge AI",
  "Optimization",
  "Simulation",
  "Reinforcement Learning",
  "Model Deployment",
  "Statistics",
  "CAD",
  "3D Modeling",
  "Circuit Design",
  "Digital Signal Processing",
  "Power Systems",
  "Renewable Energy",
  "Forecasting",
  "Satellite Imagery",
  "Prototyping",
  "Embedded Vision",
  "Computer Networks",
];

const labSeeds = [
  { name: "AI / ML Lab", departmentCode: "CE", capacity: 28, utilizationRate: 92, status: ResourceStatus.NEAR_CAPACITY, capabilities: JSON.stringify(["GPU workstations", "ML tooling", "Vision datasets"]) },
  { name: "Robotics Lab", departmentCode: "MT", capacity: 24, utilizationRate: 88, status: ResourceStatus.LIMITED, capabilities: JSON.stringify(["Robot platforms", "Motion capture", "Fabrication bay"]) },
  { name: "IoT / Embedded Systems Lab", departmentCode: "EE", capacity: 22, utilizationRate: 76, status: ResourceStatus.AVAILABLE, capabilities: JSON.stringify(["Sensors", "Microcontrollers", "Test benches"]) },
  { name: "Embedded Systems Lab", departmentCode: "EE", capacity: 18, utilizationRate: 71, status: ResourceStatus.AVAILABLE, capabilities: JSON.stringify(["Oscilloscopes", "PCB prototyping", "Edge devices"]) },
  { name: "Mechanical Automation Lab", departmentCode: "ME", capacity: 20, utilizationRate: 61, status: ResourceStatus.AVAILABLE, capabilities: JSON.stringify(["CAD", "Automation", "3D printing"]) },
  { name: "Civil / Structural Lab", departmentCode: "CV", capacity: 16, utilizationRate: 47, status: ResourceStatus.AVAILABLE, capabilities: JSON.stringify(["Materials testing", "Structural analysis", "Survey equipment"]) },
  { name: "Computer Vision Lab", departmentCode: "CE", capacity: 14, utilizationRate: 79, status: ResourceStatus.LIMITED, capabilities: JSON.stringify(["Image analytics", "Dataset pipeline", "GPU inference"]) },
  { name: "Renewable Energy Lab", departmentCode: "AE", capacity: 12, utilizationRate: 68, status: ResourceStatus.AVAILABLE, capabilities: JSON.stringify(["Energy sensors", "Power models", "Monitoring grids"]) },
];

const equipmentSeeds = [
  { name: "GPU Workstations", category: "Computing", location: "AI / ML Lab", utilizationRate: 94, status: ResourceStatus.LIMITED, availability: 6 },
  { name: "3D Printers", category: "Fabrication", location: "Mechanical Automation Lab", utilizationRate: 89, status: ResourceStatus.LIMITED, availability: 4 },
  { name: "Robotic Platform", category: "Robotics", location: "Robotics Lab", utilizationRate: 83, status: ResourceStatus.AVAILABLE, availability: 8 },
  { name: "Oscilloscopes", category: "Electronics", location: "Embedded Systems Lab", utilizationRate: 62, status: ResourceStatus.AVAILABLE, availability: 9 },
  { name: "High-Resolution Camera", category: "Imaging", location: "AI / ML Lab", utilizationRate: 57, status: ResourceStatus.AVAILABLE, availability: 5 },
  { name: "Environmental Sensor Kit", category: "IoT", location: "IoT / Embedded Systems Lab", utilizationRate: 68, status: ResourceStatus.LIMITED, availability: 7 },
  { name: "GPS Module", category: "Positioning", location: "IoT / Embedded Systems Lab", utilizationRate: 51, status: ResourceStatus.AVAILABLE, availability: 12 },
  { name: "Drone", category: "Aerial Systems", location: "Robotics Lab", utilizationRate: 91, status: ResourceStatus.BOOKED, availability: 2 },
  { name: "LiDAR Scanner", category: "Sensing", location: "Robot Vision Bay", utilizationRate: 72, status: ResourceStatus.AVAILABLE, availability: 3 },
  { name: "Depth Camera", category: "Vision", location: "Computer Vision Lab", utilizationRate: 80, status: ResourceStatus.LIMITED, availability: 4 },
  { name: "Smart Meters", category: "Energy", location: "Renewable Energy Lab", utilizationRate: 66, status: ResourceStatus.AVAILABLE, availability: 10 },
  { name: "Data Loggers", category: "Monitoring", location: "Renewable Energy Lab", utilizationRate: 58, status: ResourceStatus.AVAILABLE, availability: 12 },
  { name: "Medical Imaging Dataset", category: "Healthcare AI", location: "AI / ML Lab", utilizationRate: 40, status: ResourceStatus.AVAILABLE, availability: 5 },
  { name: "High-Resolution Display", category: "Visualization", location: "Computer Vision Lab", utilizationRate: 56, status: ResourceStatus.AVAILABLE, availability: 6 },
  { name: "Ultra HD Camera", category: "Imaging", location: "AI / ML Lab", utilizationRate: 74, status: ResourceStatus.LIMITED, availability: 3 },
  { name: "Power Analyzer", category: "Energy", location: "Renewable Energy Lab", utilizationRate: 64, status: ResourceStatus.AVAILABLE, availability: 5 },
  { name: "Thermal Camera", category: "Imaging", location: "Computer Vision Lab", utilizationRate: 67, status: ResourceStatus.AVAILABLE, availability: 4 },
  { name: "PCB Prototyping Kit", category: "Electronics", location: "Embedded Systems Lab", utilizationRate: 59, status: ResourceStatus.AVAILABLE, availability: 7 },
  { name: "Field Sensor Array", category: "Agriculture", location: "Renewable Energy Lab", utilizationRate: 70, status: ResourceStatus.LIMITED, availability: 6 },
  { name: "Morphological Scan Unit", category: "Agriculture", location: "AI / ML Lab", utilizationRate: 62, status: ResourceStatus.AVAILABLE, availability: 3 },
  { name: "Weather Station", category: "IoT", location: "Renewable Energy Lab", utilizationRate: 63, status: ResourceStatus.AVAILABLE, availability: 5 },
  { name: "Road Survey Kit", category: "Civil Engineering", location: "Civil / Structural Lab", utilizationRate: 44, status: ResourceStatus.AVAILABLE, availability: 4 },
  { name: "Geospatial Camera", category: "GIS", location: "Civil / Structural Lab", utilizationRate: 49, status: ResourceStatus.AVAILABLE, availability: 5 },
  { name: "Laser Scanner", category: "Surveying", location: "Civil / Structural Lab", utilizationRate: 55, status: ResourceStatus.AVAILABLE, availability: 3 },
  { name: "Vision Testbench", category: "Computing", location: "Computer Vision Lab", utilizationRate: 81, status: ResourceStatus.LIMITED, availability: 3 },
  { name: "Edge GPU Module", category: "Embedded AI", location: "Embedded Systems Lab", utilizationRate: 75, status: ResourceStatus.LIMITED, availability: 4 },
  { name: "Telemetry Hub", category: "IoT", location: "IoT / Embedded Systems Lab", utilizationRate: 71, status: ResourceStatus.LIMITED, availability: 4 },
  { name: "Soil Sensor Pack", category: "Agriculture", location: "Renewable Energy Lab", utilizationRate: 68, status: ResourceStatus.AVAILABLE, availability: 9 },
  { name: "AGV Unit", category: "Logistics", location: "Robotics Lab", utilizationRate: 78, status: ResourceStatus.LIMITED, availability: 3 },
  { name: "Autonomous Wheel Set", category: "Robotics", location: "Mechanical Automation Lab", utilizationRate: 66, status: ResourceStatus.AVAILABLE, availability: 4 },
  { name: "Thermal Imaging Camera", category: "Imaging", location: "Computer Vision Lab", utilizationRate: 69, status: ResourceStatus.AVAILABLE, availability: 3 },
  { name: "Edge Sensor Node", category: "IoT", location: "IoT / Embedded Systems Lab", utilizationRate: 74, status: ResourceStatus.LIMITED, availability: 5 },
];

const facultySeeds = [
  { firstName: "Ananya", lastName: "Sharma", departmentCode: "CE", title: "Professor", expertise: ["Computer Vision", "Robotics", "Machine Learning"] },
  { firstName: "Rohan", lastName: "Patel", departmentCode: "AE", title: "Associate Professor", expertise: ["Machine Learning", "Agricultural Systems", "Forecasting"] },
  { firstName: "Nisha", lastName: "Iyer", departmentCode: "EE", title: "Assistant Professor", expertise: ["Embedded Systems", "IoT", "Edge AI"] },
  { firstName: "Vikram", lastName: "Nair", departmentCode: "MT", title: "Professor", expertise: ["Robotics", "Control Systems", "Autonomous Navigation"] },
  { firstName: "Pooja", lastName: "Menon", departmentCode: "CV", title: "Associate Professor", expertise: ["GIS", "Road Condition Assessment", "Data Analysis"] },
  { firstName: "Arjun", lastName: "Singh", departmentCode: "ME", title: "Professor", expertise: ["Mechanical Design", "CAD", "Prototyping"] },
  { firstName: "Meera", lastName: "Joshi", departmentCode: "CE", title: "Assistant Professor", expertise: ["Deep Learning", "Medical Imaging", "Image Processing"] },
  { firstName: "Karan", lastName: "Desai", departmentCode: "EE", title: "Professor", expertise: ["Electronics", "Signal Processing", "Embedded Vision"] },
  { firstName: "Sonia", lastName: "Khanna", departmentCode: "ME", title: "Associate Professor", expertise: ["Simulation", "Optimization", "Power Systems"] },
  { firstName: "Ritika", lastName: "Bose", departmentCode: "AE", title: "Assistant Professor", expertise: ["Renewable Energy", "Sensor Fusion", "Data Science"] },
];

const studentSeeds = [
  { name: "Aarav Patel", departmentCode: "CE", skills: ["Computer Vision", "Python", "Deep Learning", "Image Processing"] },
  { name: "Riya Shah", departmentCode: "MT", skills: ["Robotics", "Embedded Systems", "Control Systems", "Autonomous Navigation"] },
  { name: "Dev Mehta", departmentCode: "CE", skills: ["Data Science", "Machine Learning", "Python", "Statistics"] },
  { name: "Meera Desai", departmentCode: "AE", skills: ["GIS", "Agricultural Systems", "Data Analysis", "Sensor Fusion"] },
  { name: "Ishaan Verma", departmentCode: "EE", skills: ["Embedded Systems", "IoT", "C++", "Signal Processing"] },
  { name: "Anika Nair", departmentCode: "CV", skills: ["GIS", "Road Condition Assessment", "Data Analysis", "Statistics"] },
  { name: "Yash Kulkarni", departmentCode: "ME", skills: ["Mechanical Design", "CAD", "Prototyping", "C++"] },
  { name: "Neha Rao", departmentCode: "CE", skills: ["Computer Vision", "Machine Learning", "Python", "Data Analysis"] },
  { name: "Karthik S", departmentCode: "MT", skills: ["Robotics", "Embedded Vision", "Sensor Fusion", "Autonomous Navigation"] },
  { name: "Priya Das", departmentCode: "EE", skills: ["Embedded Systems", "Signal Processing", "Electronics", "IoT"] },
  { name: "Harsh Joshi", departmentCode: "AE", skills: ["Crop Health Monitoring", "Agricultural Systems", "Sensor Fusion", "Python"] },
  { name: "Sakshi Iyer", departmentCode: "CE", skills: ["Deep Learning", "Computer Vision", "Image Processing", "Model Deployment"] },
  { name: "Aditya Sen", departmentCode: "CV", skills: ["GIS", "Road Condition Assessment", "Statistics", "Data Analysis"] },
  { name: "Mira Kapoor", departmentCode: "ME", skills: ["Mechanical Design", "CAD", "Simulation", "Optimization"] },
  { name: "Tanya Roy", departmentCode: "CE", skills: ["Python", "Machine Learning", "Data Science", "Model Deployment"] },
  { name: "Raghav Malhotra", departmentCode: "EE", skills: ["Edge AI", "Embedded Systems", "Computer Networks", "C++"] },
  { name: "Vinita Shah", departmentCode: "AE", skills: ["Forecasting", "Data Science", "Renewable Energy", "Statistics"] },
  { name: "Kabir Mehta", departmentCode: "MT", skills: ["Robotics", "Control Systems", "C++", "Embedded Systems"] },
  { name: "Leah Thomas", departmentCode: "CV", skills: ["GIS", "Satellite Imagery", "Data Analysis", "Image Processing"] },
  { name: "Omkar Rao", departmentCode: "ME", skills: ["3D Modeling", "Prototyping", "CAD", "Mechanical Design"] },
  { name: "Disha Nair", departmentCode: "CE", skills: ["Computer Vision", "Embedded Vision", "Python", "Statistics"] },
  { name: "Nikhil Varma", departmentCode: "EE", skills: ["Embedded Systems", "Circuit Design", "Electronics", "Power Systems"] },
  { name: "Shreya Ghosh", departmentCode: "AE", skills: ["Sensor Fusion", "Agricultural Systems", "Crop Health Monitoring", "Python"] },
  { name: "Farhan Ali", departmentCode: "MT", skills: ["Autonomous Navigation", "Robotics", "Control Systems", "Signal Processing"] },
  { name: "Esha Gupta", departmentCode: "CV", skills: ["GIS", "Road Condition Assessment", "Image Processing", "Statistics"] },
  { name: "Aditi Soni", departmentCode: "CE", skills: ["Machine Learning", "Deep Learning", "Python", "Data Science"] },
  { name: "Rahul Bansal", departmentCode: "EE", skills: ["IoT", "Embedded Systems", "Computer Networks", "Electronics"] },
  { name: "Hina Verma", departmentCode: "AE", skills: ["Crop Health Monitoring", "GIS", "Data Analysis", "Renewable Energy"] },
  { name: "Siddharth N", departmentCode: "ME", skills: ["Mechanical Design", "Simulation", "CAD", "3D Modeling"] },
  { name: "Aisha Khan", departmentCode: "CE", skills: ["Computer Vision", "Machine Learning", "Python", "Autonomous Navigation"] },
  { name: "Arnav Singh", departmentCode: "MT", skills: ["Robotics", "Embedded Vision", "Autonomous Navigation", "Control Systems"] },
];

const courseSeeds = [
  { code: "CE101", title: "Introduction to Computing", departmentCode: "CE" },
  { code: "CE201", title: "Computer Vision Fundamentals", departmentCode: "CE" },
  { code: "CE301", title: "Deep Learning Systems", departmentCode: "CE" },
  { code: "CE401", title: "Advanced AI Systems", departmentCode: "CE" },
  { code: "MT101", title: "Robotics Design", departmentCode: "MT" },
  { code: "MT201", title: "Autonomous Systems", departmentCode: "MT" },
  { code: "MT301", title: "Embedded Control", departmentCode: "MT" },
  { code: "MT401", title: "Autonomous Navigation", departmentCode: "MT" },
  { code: "CV101", title: "Surveying and Mapping", departmentCode: "CV" },
  { code: "CV201", title: "Infrastructure Imaging", departmentCode: "CV" },
  { code: "CV301", title: "Spatial Analytics", departmentCode: "CV" },
  { code: "CV401", title: "Geospatial Intelligence", departmentCode: "CV" },
  { code: "EE101", title: "Digital Electronics", departmentCode: "EE" },
  { code: "EE201", title: "Embedded Systems", departmentCode: "EE" },
  { code: "EE301", title: "Signal Processing", departmentCode: "EE" },
  { code: "EE401", title: "Smart Sensing", departmentCode: "EE" },
  { code: "ME101", title: "Mechanical Design", departmentCode: "ME" },
  { code: "ME201", title: "Manufacturing Systems", departmentCode: "ME" },
  { code: "ME301", title: "Automation and CAD", departmentCode: "ME" },
  { code: "ME401", title: "Prototyping Lab", departmentCode: "ME" },
  { code: "AE101", title: "Agri-Tech Fundamentals", departmentCode: "AE" },
  { code: "AE201", title: "Precision Agriculture", departmentCode: "AE" },
  { code: "AE301", title: "Renewable Systems", departmentCode: "AE" },
  { code: "AE401", title: "Field Monitoring", departmentCode: "AE" },
];

const projectSeeds = [
  {
    title: "Autonomous Crop Monitoring Robot",
    departmentCode: "AE",
    summary: "Design an autonomous crop monitoring robot for field scouting, image-based crop health assessment and sensor-driven recommendations.",
    domains: ["Agriculture", "Robotics", "Computer Vision", "AI", "Embedded Systems"],
    skills: ["Computer Vision", "Robotics", "Embedded Systems", "Python", "GIS", "Data Analysis", "Sensor Fusion", "Crop Health Monitoring"],
    labs: ["AI / ML Lab", "Robotics Lab", "IoT / Embedded Systems Lab"],
    equipment: ["GPU Workstations", "High-Resolution Camera", "Robotic Platform", "Environmental Sensor Kit", "GPS Module"],
  },
  {
    title: "AI-Based Road Damage Detection",
    departmentCode: "CV",
    summary: "Create a vision and GIS-based system to detect road surface anomalies from roadside imagery and geotag them for inspection workflows.",
    domains: ["Civil Engineering", "Computer Vision", "GIS", "Machine Learning"],
    skills: ["Computer Vision", "Machine Learning", "GIS", "Python", "Image Processing", "Road Condition Assessment", "Statistics", "Data Analysis"],
    labs: ["AI / ML Lab", "Civil / Structural Lab"],
    equipment: ["GPU Workstations", "High-Resolution Camera", "GPS Module", "LiDAR Scanner", "Geospatial Camera"],
  },
  {
    title: "Medical Image Analysis",
    departmentCode: "CE",
    summary: "Develop a robust medical image analysis workflow for anomaly detection and evidence-backed diagnostic support.",
    domains: ["Healthcare", "Computer Vision", "Machine Learning"],
    skills: ["Medical Imaging", "Machine Learning", "Deep Learning", "Python", "Image Processing", "Statistics", "Model Deployment", "Data Analysis"],
    labs: ["AI / ML Lab", "Computer Vision Lab"],
    equipment: ["GPU Workstations", "Medical Imaging Dataset", "High-Resolution Display", "Thermal Imaging Camera", "Ultra HD Camera"],
  },
  {
    title: "Autonomous Warehouse Robot",
    departmentCode: "MT",
    summary: "Build an autonomous warehouse robot optimized for safe navigation, pallet tracking and obstacle avoidance under dynamic conditions.",
    domains: ["Robotics", "Computer Vision", "Embedded Systems"],
    skills: ["Robotics", "Computer Vision", "Embedded Systems", "Autonomous Navigation", "Control Systems", "Python", "C++"],
    labs: ["Robotics Lab", "AI / ML Lab", "Embedded Systems Lab"],
    equipment: ["Robotic Platform", "Depth Camera", "LiDAR Scanner", "AGV Unit", "GPU Workstations"],
  },
  {
    title: "Smart Energy Forecasting",
    departmentCode: "AE",
    summary: "Forecast power demand and renewable energy patterns using sensor data, forecasting models and optimization routines.",
    domains: ["Energy", "IoT", "Machine Learning", "Data Science"],
    skills: ["Machine Learning", "Data Science", "Forecasting", "Python", "Statistics", "IoT", "Sensor Fusion", "Optimization"],
    labs: ["Renewable Energy Lab", "IoT / Embedded Systems Lab", "AI / ML Lab"],
    equipment: ["Environmental Sensor Kit", "Smart Meters", "Data Loggers", "Weather Station", "GPU Workstations"],
  },
];

async function main() {
  await prisma.projectRequirement.deleteMany({});
  await prisma.mentorship.deleteMany({});
  await prisma.studentProject.deleteMany({});
  await prisma.studentAcademicRecord.deleteMany({});
  await prisma.courseSkill.deleteMany({});
  await prisma.resourceUtilization.deleteMany({});
  await prisma.resourceAvailability.deleteMany({});
  await prisma.labEquipment.deleteMany({});
  await prisma.facultyExpertise.deleteMany({});
  await prisma.studentSkill.deleteMany({});
  await prisma.project.deleteMany({});
  await prisma.laboratory.deleteMany({});
  await prisma.equipment.deleteMany({});
  await prisma.course.deleteMany({});
  await prisma.faculty.deleteMany({});
  await prisma.student.deleteMany({});
  await prisma.skill.deleteMany({});
  await prisma.department.deleteMany({});

  const departments = await Promise.all(
    departmentData.map((department) =>
      prisma.department.create({
        data: department,
      }),
    ),
  );
  const departmentMap = new Map(departments.map((department) => [department.code, department]));

  const skills = await Promise.all(
    skillSeed.map((name) =>
      prisma.skill.create({
        data: {
          name,
          category: name.includes("Vision") || name.includes("Learning") || name.includes("AI") ? "AI / Analytics" : name.includes("Robotics") || name.includes("Embedded") || name.includes("IoT") ? "Systems" : name.includes("GIS") || name.includes("Data") || name.includes("Statistics") ? "Data" : "Engineering",
        },
      }),
    ),
  );
  const skillMap = new Map(skills.map((skill) => [skill.name, skill]));

  for (const labSeed of labSeeds) {
    const department = departmentMap.get(labSeed.departmentCode);
    if (!department) continue;

    await prisma.laboratory.create({
      data: {
        name: labSeed.name,
        departmentId: department.id,
        capacity: labSeed.capacity,
        utilizationRate: labSeed.utilizationRate,
        status: labSeed.status,
        capabilities: labSeed.capabilities,
      },
    });
  }

  const labs = await prisma.laboratory.findMany();
  const labMap = new Map(labs.map((lab) => [lab.name, lab]));

  for (const equipmentSeed of equipmentSeeds) {
    const equipment = await prisma.equipment.create({
      data: {
        name: equipmentSeed.name,
        category: equipmentSeed.category,
        location: equipmentSeed.location,
        utilizationRate: equipmentSeed.utilizationRate,
        status: equipmentSeed.status,
        availability: equipmentSeed.availability,
      },
    });

    const matchingLab = labMap.get(equipmentSeed.location);
    if (matchingLab) {
      await prisma.labEquipment.create({
        data: {
          labId: matchingLab.id,
          equipmentId: equipment.id,
          quantity: Math.max(1, Math.min(5, Math.round(equipmentSeed.availability / 2))),
        },
      });
    }
  }

  const equipmentList = await prisma.equipment.findMany();
  const equipmentMap = new Map(equipmentList.map((equipment) => [equipment.name, equipment]));

  for (const labSeed of labSeeds) {
    const lab = labMap.get(labSeed.name);
    if (!lab) continue;

    for (const equipmentName of [
      "GPU Workstations",
      "High-Resolution Camera",
      "Environmental Sensor Kit",
      "GPS Module",
      "Oscilloscopes",
      "Drone",
      "LiDAR Scanner",
      "Data Loggers",
    ]) {
      const equipment = equipmentMap.get(equipmentName);
      if (!equipment) continue;

      await prisma.labEquipment.upsert({
        where: {
          labId_equipmentId: {
            labId: lab.id,
            equipmentId: equipment.id,
          },
        },
        update: {},
        create: {
          labId: lab.id,
          equipmentId: equipment.id,
          quantity: 1,
        },
      });
    }

    const availabilityStatus = labSeed.status === ResourceStatus.NEAR_CAPACITY ? ResourceStatus.NEAR_CAPACITY : labSeed.status;
    await prisma.resourceAvailability.create({
      data: {
        resourceType: ResourceEntityType.LABORATORY,
        resourceId: lab.id,
        resourceName: lab.name,
        availableUnits: lab.capacity,
        utilizationRate: lab.utilizationRate,
        status: availabilityStatus,
      },
    });

    await prisma.resourceUtilization.createMany({
      data: [
        {
          resourceType: ResourceEntityType.LABORATORY,
          resourceId: lab.id,
          resourceName: lab.name,
          period: "2026-Autumn",
          utilizationRate: Math.max(35, lab.utilizationRate - 8),
          status: availabilityStatus,
        },
        {
          resourceType: ResourceEntityType.LABORATORY,
          resourceId: lab.id,
          resourceName: lab.name,
          period: "2026-Spring",
          utilizationRate: lab.utilizationRate,
          status: availabilityStatus,
        },
      ],
    });
  }

  for (const equipmentSeed of equipmentSeeds) {
    const equipment = equipmentMap.get(equipmentSeed.name);
    if (!equipment) continue;

    await prisma.resourceAvailability.create({
      data: {
        resourceType: ResourceEntityType.EQUIPMENT,
        resourceId: equipment.id,
        resourceName: equipment.name,
        availableUnits: equipmentSeed.availability,
        utilizationRate: equipmentSeed.utilizationRate,
        status: equipmentSeed.status,
      },
    });

    await prisma.resourceUtilization.createMany({
      data: [
        { resourceType: ResourceEntityType.EQUIPMENT, resourceId: equipment.id, resourceName: equipment.name, period: "2026-Autumn", utilizationRate: Math.max(30, equipmentSeed.utilizationRate - 5), status: equipmentSeed.status },
        { resourceType: ResourceEntityType.EQUIPMENT, resourceId: equipment.id, resourceName: equipment.name, period: "2026-Spring", utilizationRate: equipmentSeed.utilizationRate, status: equipmentSeed.status },
      ],
    });
  }

  for (const facultySeed of facultySeeds) {
    const department = departmentMap.get(facultySeed.departmentCode);
    if (!department) continue;

    const faculty = await prisma.faculty.create({
      data: {
        firstName: facultySeed.firstName,
        lastName: facultySeed.lastName,
        email: `${facultySeed.firstName.toLowerCase()}.${facultySeed.lastName.toLowerCase()}@enginexus.edu`,
        title: facultySeed.title,
        departmentId: department.id,
      },
    });

    for (const expertise of facultySeed.expertise) {
      const skill = skillMap.get(expertise);
      if (!skill) continue;

      await prisma.facultyExpertise.create({
        data: {
          facultyId: faculty.id,
          skillId: skill.id,
          proficiency: 4,
          yearsExperience: 7,
        },
      });
    }
  }

  const faculties = await prisma.faculty.findMany({
    include: {
      department: true,
      expertise: {
        include: { skill: true },
      },
    },
  });

  for (const courseSeed of courseSeeds) {
    const department = departmentMap.get(courseSeed.departmentCode);
    if (!department) continue;

    const course = await prisma.course.create({
      data: {
        code: courseSeed.code,
        title: courseSeed.title,
        departmentId: department.id,
      },
    });

    const relevantSkills = skillSeed.filter((name) => {
      if (courseSeed.departmentCode === "CE") return ["Computer Vision", "Machine Learning", "Python", "Data Analysis", "Deep Learning", "Image Processing"].includes(name);
      if (courseSeed.departmentCode === "MT") return ["Robotics", "Autonomous Navigation", "Embedded Systems", "Control Systems", "Python"].includes(name);
      if (courseSeed.departmentCode === "CV") return ["GIS", "Road Condition Assessment", "Data Analysis", "Statistics", "Image Processing"].includes(name);
      if (courseSeed.departmentCode === "EE") return ["Embedded Systems", "Signal Processing", "Electronics", "IoT", "Circuit Design"].includes(name);
      if (courseSeed.departmentCode === "ME") return ["Mechanical Design", "CAD", "Prototyping", "3D Modeling", "Simulation"].includes(name);
      return ["Agricultural Systems", "Sensor Fusion", "Forecasting", "Renewable Energy", "Crop Health Monitoring"].includes(name);
    });

    for (const skillName of relevantSkills.slice(0, 3)) {
      const skill = skillMap.get(skillName);
      if (!skill) continue;
      await prisma.courseSkill.create({
        data: {
          courseId: course.id,
          skillId: skill.id,
          weight: 1,
        },
      });
    }
  }

  for (const studentSeed of studentSeeds) {
    const department = departmentMap.get(studentSeed.departmentCode);
    if (!department) continue;

    const student = await prisma.student.create({
      data: {
        firstName: studentSeed.name.split(" ")[0],
        lastName: studentSeed.name.split(" ").slice(1).join(" ") || "Student",
        email: `${studentSeed.name.toLowerCase().replace(/\s+/g, ".")}@demo.edu`,
        departmentId: department.id,
      },
    });

    for (const skillName of studentSeed.skills) {
      const skill = skillMap.get(skillName);
      if (!skill) continue;

      await prisma.studentSkill.create({
        data: {
          studentId: student.id,
          skillId: skill.id,
          proficiency: 4,
          yearsExperience: 1 + Math.floor(Math.random() * 3),
        },
      });
    }

    const coursePool = await prisma.course.findMany({
      where: { departmentId: department.id },
      take: 3,
    });

    for (const course of coursePool) {
      await prisma.studentAcademicRecord.upsert({
        where: {
          studentId_courseId_semester: {
            studentId: student.id,
            courseId: course.id,
            semester: "2026-Autumn",
          },
        },
        update: {},
        create: {
          studentId: student.id,
          courseId: course.id,
          grade: ["A", "A+", "B+", "B"][Math.floor(Math.random() * 4)],
          semester: "2026-Autumn",
          credits: 3,
          status: "ACTIVE",
        },
      });
    }
  }

  for (const projectSeed of projectSeeds) {
    const project = await prisma.project.create({
      data: {
        title: projectSeed.title,
        summary: projectSeed.summary,
        domains: JSON.stringify(projectSeed.domains),
        departmentId: departmentMap.get(projectSeed.departmentCode)!.id,
        status: "ACTIVE",
      },
    });

    for (const skillName of projectSeed.skills) {
      const skill = skillMap.get(skillName);
      if (!skill) continue;

      await prisma.projectRequirement.create({
        data: {
          projectId: project.id,
          requirementType: RequirementType.SKILL,
          skillId: skill.id,
          priority: 1,
          note: `Skill requirement for ${projectSeed.title}`,
        },
      });
    }

    for (const equipmentName of projectSeed.equipment) {
      const equipment = equipmentMap.get(equipmentName);
      if (!equipment) continue;

      await prisma.projectRequirement.create({
        data: {
          projectId: project.id,
          requirementType: RequirementType.EQUIPMENT,
          equipmentId: equipment.id,
          priority: 1,
        },
      });
    }

    for (const labName of projectSeed.labs) {
      const lab = labMap.get(labName);
      if (!lab) continue;

      await prisma.projectRequirement.create({
        data: {
          projectId: project.id,
          requirementType: RequirementType.LABORATORY,
          laboratoryId: lab.id,
          priority: 1,
        },
      });
    }

    const relevantStudents = (await prisma.student.findMany({
      include: { skills: { include: { skill: true } } },
    })).filter((student) => {
      const matches = student.skills.map((entry) => entry.skill.name);
      return projectSeed.skills.some((skillName) => matches.includes(skillName));
    }).slice(0, 3);

    for (const student of relevantStudents) {
      await prisma.studentProject.create({
        data: {
          studentId: student.id,
          projectId: project.id,
          role: "Developer",
          status: "ACTIVE",
          score: 80 + Math.floor(Math.random() * 15),
        },
      });
    }

    const matchedFaculty = faculties.filter((faculty) => {
      return faculty.expertise.some((entry) => projectSeed.skills.includes(entry.skill.name));
    }).slice(0, 2);

    for (const faculty of matchedFaculty) {
      await prisma.mentorship.create({
        data: {
          facultyId: faculty.id,
          projectId: project.id,
          role: "Mentor",
          status: "ACTIVE",
        },
      });
    }
  }

  console.log("Database seeded successfully with departments, skills, faculty, students, courses, labs, equipment, and projects.");
}

main()
  .catch((error) => {
    console.error("Seeding failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
