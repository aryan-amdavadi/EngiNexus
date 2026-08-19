/**
 * scripts/test-academic-import.ts
 *
 * End-to-end validation of the academic import pipeline.
 *
 * Tests:
 *   1. JSON import  — valid rows, unknown course skip, duplicate skip
 *   2. CSV import   — valid row, invalid grade skip, alternate column names
 *   3. Fixture CSV  — loads scripts/fixtures/academic_sample.csv from disk
 *   4. Skill engine — verifies calculateStudentSkillProfile reflects imported data
 *   5. Column coverage check — missing required columns returns a useful error
 *
 * Run with:
 *   npm run test:academic-import
 */

import fs from "fs";
import path from "path";
import { prisma } from "../lib/prisma";
import { importAcademicData, validateAndNormalize } from "../lib/academic-import";
import { calculateStudentSkillProfile } from "../lib/student-skill-profile";

type Color = "green" | "yellow" | "red" | "cyan" | "bold";
const colors: Record<Color, string> = {
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  cyan: "\x1b[36m",
  bold: "\x1b[1m",
};
const reset = "\x1b[0m";
const c = (text: string, color: Color) => `${colors[color]}${text}${reset}`;

let passed = 0;
let failed = 0;

function assert(condition: boolean, label: string, detail?: string) {
  if (condition) {
    console.log(`  ${c("✓", "green")} ${label}`);
    passed += 1;
  } else {
    console.log(`  ${c("✗", "red")} ${label}${detail ? `  (${detail})` : ""}`);
    failed += 1;
  }
}

async function main() {
  console.log(c("\n═══════════════════════════════════════════════════", "cyan"));
  console.log(c(" EngiNexus — Academic Import Pipeline Test", "bold"));
  console.log(c("═══════════════════════════════════════════════════\n", "cyan"));

  // ── Load seed data references ────────────────────────────────────────────
  const student = await prisma.student.findFirst({
    orderBy: { createdAt: "asc" },
    select: { id: true, firstName: true, lastName: true },
  });

  const courses = await prisma.course.findMany({
    orderBy: { code: "asc" },
    take: 3,
    select: { id: true, code: true, title: true },
  });

  if (!student || courses.length < 2) {
    console.error(
      c("✗ Seed data is required before running this test.\n  Run: npm run db:seed\n", "red"),
    );
    process.exit(1);
  }

  const [courseA, courseB, courseC] = courses;

  // ════════════════════════════════════════════════════════════════════════
  // TEST 1 — JSON import
  // ════════════════════════════════════════════════════════════════════════
  console.log(c("Test 1: JSON import", "bold"));

  const jsonSummary = await importAcademicData({
    format: "json",
    data: [
      // Valid record
      {
        student_id: student.id,
        student_name: `${student.firstName} ${student.lastName}`,
        semester: "2026-Summer",
        course_code: courseA.code,
        course_name: courseA.title,
        grade: "A",
        credits: 4,
        sgpa: 8.9,
      },
      // Should skip — unknown course
      {
        student_id: student.id,
        semester: "2026-Summer",
        course_code: "UNKNOWN-9999",
        grade: "B+",
        credits: 3,
      },
      // Should skip — duplicate within this batch
      {
        student_id: student.id,
        semester: "2026-Summer",
        course_code: courseA.code,
        grade: "A",
        credits: 4,
      },
      // Should skip — invalid grade
      {
        student_id: student.id,
        semester: "2026-Summer",
        course_code: courseB.code,
        grade: "Z",
        credits: 3,
      },
    ],
  });

  assert(jsonSummary.recordsDetected === 4, "recordsDetected = 4");
  assert(jsonSummary.imported === 1, "imported = 1 (valid record)");
  assert(jsonSummary.skipped === 3, "skipped = 3 (unknown course + duplicate + bad grade)");
  assert(jsonSummary.students === 1, "students = 1");
  assert(jsonSummary.courses === 1, "courses = 1");
  assert(
    jsonSummary.skippedRecords.some((r) => r.reason.includes("Unknown course")),
    "skip reason: Unknown course",
  );
  assert(
    jsonSummary.skippedRecords.some((r) => r.reason.includes("Duplicate")),
    "skip reason: Duplicate",
  );
  assert(
    jsonSummary.skippedRecords.some((r) => r.reason.includes("Invalid grade")),
    "skip reason: Invalid grade",
  );

  // ════════════════════════════════════════════════════════════════════════
  // TEST 2 — CSV import (alternate column names)
  // ════════════════════════════════════════════════════════════════════════
  console.log(c("\nTest 2: CSV import with alternate column names", "bold"));

  const csvPayload = [
    // Alternate headers: sem instead of semester, subject_code instead of course_code
    "student_id,student_name,sem,subject_code,course_name,result,credits,sgpa",
    `${student.id},${student.firstName} ${student.lastName},2026-Monsoon,${courseB.code},${courseB.title},A-,3,8.4`,
    // Invalid grade
    `${student.id},${student.firstName} ${student.lastName},2026-Monsoon,${courseB.code},${courseB.title},X,3,8.4`,
  ].join("\n");

  const csvSummary = await importAcademicData({ format: "csv", data: csvPayload });

  assert(csvSummary.recordsDetected === 2, "recordsDetected = 2");
  assert(csvSummary.imported === 1, "imported = 1");
  assert(csvSummary.skipped === 1, "skipped = 1 (invalid grade X)");

  // ════════════════════════════════════════════════════════════════════════
  // TEST 3 — Non-standard grade normalisation (O → A+)
  // ════════════════════════════════════════════════════════════════════════
  console.log(c("\nTest 3: Non-standard grade normalisation", "bold"));

  const gradeSummary = await importAcademicData({
    format: "json",
    data: [
      {
        student_id: student.id,
        semester: "2026-Odd",
        course_code: courseC?.code ?? courseA.code,
        grade: "O", // Indian university "Outstanding" grade
        credits: 4,
      },
    ],
  });

  assert(gradeSummary.imported === 1, "O grade normalised and imported");
  assert(gradeSummary.skipped === 0, "no skips");

  // ════════════════════════════════════════════════════════════════════════
  // TEST 4 — Missing required columns
  // ════════════════════════════════════════════════════════════════════════
  console.log(c("\nTest 4: Missing required columns detection", "bold"));

  const badColSummary = await importAcademicData({
    format: "json",
    data: [{ foo: "bar", baz: "qux" }],
  });

  assert(badColSummary.imported === 0, "imported = 0");
  assert(
    badColSummary.skippedRecords.some((r) => r.reason.includes("Missing required columns")),
    "skip reason: Missing required columns",
  );

  // ════════════════════════════════════════════════════════════════════════
  // TEST 5 — Empty payload
  // ════════════════════════════════════════════════════════════════════════
  console.log(c("\nTest 5: Empty payload", "bold"));

  const emptySummary = await importAcademicData({ format: "json", data: [] });
  assert(emptySummary.recordsDetected === 0, "recordsDetected = 0");
  assert(emptySummary.imported === 0, "imported = 0");

  // ════════════════════════════════════════════════════════════════════════
  // TEST 6 — Fixture CSV file
  // ════════════════════════════════════════════════════════════════════════
  console.log(c("\nTest 6: Synthetic fixture CSV", "bold"));

  const fixturePath = path.join(__dirname, "fixtures", "academic_sample.csv");
  if (fs.existsSync(fixturePath)) {
    const csv = fs.readFileSync(fixturePath, "utf-8");
    const fixtureSummary = await importAcademicData({ format: "csv", data: csv });
    console.log(
      `    Records detected: ${fixtureSummary.recordsDetected}  Imported: ${fixtureSummary.imported}  Skipped: ${fixtureSummary.skipped}`,
    );
    assert(
      fixtureSummary.recordsDetected > 0,
      "fixture: at least one record detected",
    );
    assert(
      typeof fixtureSummary.imported === "number",
      "fixture: imported field is a number",
    );
  } else {
    console.log(`  ${c("—", "yellow")} fixture file not found — skipping`);
  }

  // ════════════════════════════════════════════════════════════════════════
  // TEST 7 — validateAndNormalize helper (no DB)
  // ════════════════════════════════════════════════════════════════════════
  console.log(c("\nTest 7: validateAndNormalize helper (no DB calls)", "bold"));

  const normalized = validateAndNormalize([
    { student_id: "abc", semester: "S1", course_code: "CS101", grade: "B+", credits: "3" },
  ]);

  assert(normalized.length === 1, "returns one row");
  assert(normalized[0].grade === "B+", "grade preserved");
  assert(normalized[0].courseCode === "CS101", "courseCode uppercased");
  assert(normalized[0].credits === 3, "credits parsed to number");

  // ════════════════════════════════════════════════════════════════════════
  // TEST 8 — Skill engine consumes imported data
  // ════════════════════════════════════════════════════════════════════════
  console.log(c("\nTest 8: Skill engine consumes imported academic records", "bold"));

  const profile = await calculateStudentSkillProfile(student.id);

  assert(profile.skills.length > 0, "skill profile has at least one skill");
  assert(
    profile.skills.some((s) => s.evidence.some((e) => e.source === "Academic coursework")),
    "at least one skill has academic coursework evidence",
  );

  console.log(
    `    Top skill: ${profile.skills[0]?.skill ?? "none"} (confidence ${profile.skills[0]?.confidence ?? 0}%)`,
  );

  // ════════════════════════════════════════════════════════════════════════
  // Summary
  // ════════════════════════════════════════════════════════════════════════
  console.log(c("\n═══════════════════════════════════════════════════", "cyan"));
  console.log(
    `  ${c("Passed:", "green")} ${passed}   ${c("Failed:", failed > 0 ? "red" : "green")} ${failed}`,
  );
  console.log(c("═══════════════════════════════════════════════════\n", "cyan"));

  if (failed > 0) process.exit(1);
}

main()
  .catch((err) => {
    console.error(c("✗ Test runner crashed:", "red"), err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
