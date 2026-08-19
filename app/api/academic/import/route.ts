import { NextResponse } from "next/server";

import { importAcademicData } from "../../../../lib/academic-import";

type RequestBody = {
  format?: "csv" | "json";
  data?: string | Array<Record<string, unknown>>;
};

export async function POST(request: Request) {
  let body: RequestBody;

  try {
    body = (await request.json()) as RequestBody;
  } catch (_error) {
    return NextResponse.json(
      {
        success: false,
        error: "Malformed request body. Expected JSON payload.",
      },
      { status: 400 },
    );
  }

  if (!body.format || (body.format !== "csv" && body.format !== "json")) {
    return NextResponse.json(
      {
        success: false,
        error: "Import format must be either 'csv' or 'json'.",
      },
      { status: 400 },
    );
  }

  if (body.data === undefined || body.data === null) {
    return NextResponse.json(
      {
        success: false,
        error: "Import data is required.",
      },
      { status: 400 },
    );
  }

  try {
    const summary = await importAcademicData({
      format: body.format,
      data: body.data,
    });

    return NextResponse.json({
      success: true,
      summary,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to import academic records.";
    const status = message.toLowerCase().includes("expects") || message.toLowerCase().includes("required") ? 400 : 500;

    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status },
    );
  }
}
