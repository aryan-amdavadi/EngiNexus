import { NextResponse } from "next/server";

import { importAcademicData } from "../../../../lib/academic-import";

type RequestBody = {
  format?: "csv" | "json";
  data?: string | Array<Record<string, unknown>>;
};

/**
 * POST /api/academic/import
 *
 * Authorization (optional but recommended in production):
 *   Set IMPORT_API_KEY in your .env file.
 *   Pass the same value as the X-API-Key header in every import request.
 *   If IMPORT_API_KEY is not set, the endpoint operates without auth (development mode).
 *
 * Request body (JSON):
 *   {
 *     "format": "csv" | "json",
 *     "data": "<csv string>" | [{ ...row }, ...]
 *   }
 *
 * Privacy contract:
 *   - Raw academic records are NOT exposed via any GET route.
 *   - This endpoint returns only an import summary.
 *   - Skill evidence is derived and stored; grades themselves remain private.
 */
export async function POST(request: Request) {
  // ── Authorization ──────────────────────────────────────────────────────────
  const expectedKey = process.env.IMPORT_API_KEY;
  if (expectedKey) {
    const providedKey = request.headers.get("x-api-key");
    if (!providedKey || providedKey !== expectedKey) {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized. A valid X-API-Key header is required for academic data import.",
        },
        { status: 401 },
      );
    }
  }

  // ── Parse body ─────────────────────────────────────────────────────────────
  let body: RequestBody;

  try {
    body = (await request.json()) as RequestBody;
  } catch (_error) {
    return NextResponse.json(
      {
        success: false,
        error: "Malformed request body. Expected JSON payload with { format, data }.",
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

  // ── Run pipeline ───────────────────────────────────────────────────────────
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
    const message =
      error instanceof Error ? error.message : "Failed to import academic records.";
    const status =
      message.toLowerCase().includes("expects") ||
      message.toLowerCase().includes("required") ||
      message.toLowerCase().includes("format")
        ? 400
        : 500;

    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status },
    );
  }
}
