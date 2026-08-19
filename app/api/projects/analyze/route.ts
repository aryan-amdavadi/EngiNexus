import { NextResponse } from "next/server";
import { analyzeProject, analyzeCustomProject } from "../../../../lib/project-analysis";
import { formProjectTeam, formTeamFromSkills } from "../../../../lib/team-formation";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (body.projectId) {
      const [analysis, team] = await Promise.all([
        analyzeProject(body.projectId),
        formProjectTeam(body.projectId),
      ]);
      return NextResponse.json({ data: { analysis, team } });
    }

    if (body.input) {
      const analysis = await analyzeCustomProject(body.input);
      const team = await formTeamFromSkills(
        analysis.requiredSkills.map((s) => s.name),
        "Interdisciplinary",
        4
      );
      return NextResponse.json({ data: { analysis, team } });
    }

    return NextResponse.json(
      { error: "Must provide either 'projectId' or 'input'." },
      { status: 400 }
    );
  } catch (error: any) {
    console.error("Project Analysis Error:", error);
    return NextResponse.json(
      { error: "An error occurred during project analysis." },
      { status: 500 }
    );
  }
}
