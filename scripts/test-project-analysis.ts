import { prisma } from "../lib/prisma";
import { analyzeProject, analyzeCustomProject } from "../lib/project-analysis";

async function main() {
  const projects = await prisma.project.findMany({
    orderBy: { createdAt: "asc" },
    take: 5,
  });

  const analyses = await Promise.all(projects.map((project) => analyzeProject(project.id)));

  const uniqueResults = new Set(analyses.map((result) => `${result.project.title}:${result.score}`));

  if (analyses.length < 4) {
    throw new Error("At least four project analyses are required for validation.");
  }

  if (uniqueResults.size < 4) {
    throw new Error("Project analysis results should differ across projects.");
  }

  const customAnalysis = await analyzeCustomProject("I want to build a face recognition attendance system using smartphone cameras");
  analyses.push(customAnalysis);

  for (const result of analyses) {
    console.log(`PROJECT: ${result.project.title}`);
    console.log(`  status=${result.status} score=${result.score}`);
    console.log(`  skills=${result.requiredSkills.map((entry) => entry.name).join(", ")}`);
    console.log(`  faculty=${result.facultyMatches.length} matches`);
    console.log(`  labs=${result.labMatches.length} matches`);
    console.log(`  equipment=${result.equipmentMatches.length} items`);
  }

  console.log(`Validated ${analyses.length} project analyses; unique score signatures=${uniqueResults.size}.`);
}

main()
  .catch((error) => {
    console.error("Project analysis validation failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
