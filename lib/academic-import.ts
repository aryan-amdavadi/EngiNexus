/**
 * lib/academic-import.ts
 *
 * Authorized offline academic data import pipeline.
 *
 * Pipeline:
 *   CSV / JSON  →  Validation  →  Normalization  →  StudentAcademicRecord
 *                  →  CourseSkill mapping  →  StudentSkill evidence upsert
 *                  →  Student Skill Profile (consumed by skill engine)
 *
 * Privacy contract:
 *   - Raw grades are stored in StudentAcademicRecord (internal only).
 *   - No raw academic records are exposed via public GET endpoints.
 *   - Skill confidence is derived and surfaced only through skill profile queries.
 *   - Anonymized / synthetic records are fully supported for SIH demos.
 *
 * No external APIs, no portal scraping, no enrollment-number enumeration.
 */

import { prisma } from "./prisma";
import { getMappedSkillsForCourse } from "./course-skill-mapping";

// ── Grade configuration ────────────────────────────────────────────────────

/** All accepted grade values (upper-case). */
const VALID_GRADES = new Set([
  "A+", "A", "A-",
  "B+", "B", "B-",
  "C+", "C", "C-",
  "D", "F",
  // Aliases that will be normalised before lookup
  "O", "S", "E", // common Indian university grades normalised below
]);

/**
 * Normalise non-standard grade strings into the canonical set.
 * For example, some CHARUSAT-style exports use "O" (outstanding) for A+.
 */
function normaliseGrade(raw: string): string {
  const g = raw.trim().toUpperCase();
  const aliases: Record<string, string> = {
    O: "A+",   // Outstanding
    S: "A",    // Satisfactory / distinction
    E: "A-",   // Excellent (some schemes)
    WA: "F",   // Withdrawn / absent treated as F for skill scoring
  };
  return aliases[g] ?? g;
}

/**
 * Grade → confidence contribution weight.
 * Used when upserting StudentSkill entries from academic evidence.
 */
const GRADE_TO_PROFICIENCY: Record<string, number> = {
  "A+": 5, A: 5, "A-": 4,
  "B+": 4, B: 3, "B-": 3,
  "C+": 2, C: 2, "C-": 2,
  D: 1, F: 0,
};

// ── Type definitions ───────────────────────────────────────────────────────

type ImportFormat = "csv" | "json";
type RawRow = Record<string, unknown>;

type NormalizedRow = {
  rowNumber: number;
  studentIdRaw: string;
  studentNameRaw: string;
  enrollmentNo: string;
  program: string;
  semester: string;
  courseCode: string;
  courseName: string;
  grade: string;
  credits: number;
  sgpa: number | null;
};

// ── Column alias map ───────────────────────────────────────────────────────

/**
 * Maps our internal field names to every column header variant we might
 * encounter from a CHARUSAT-style or generic university CSV export.
 */
const COLUMN_ALIASES: Record<
  keyof Omit<NormalizedRow, "rowNumber" | "credits" | "sgpa"> | "credits" | "sgpa",
  string[]
> = {
  studentIdRaw: ["student_id", "studentid", "student id", "student", "id"],
  studentNameRaw: ["student_name", "studentname", "student name", "name", "full_name"],
  enrollmentNo: [
    "enrollment_no", "enrollment no", "enroll_no", "enrollmentno",
    "roll_no", "rollno", "roll no",
  ],
  program: ["program", "department", "branch", "programme", "dept"],
  semester: ["semester", "sem", "term", "academic_term"],
  courseCode: ["course_code", "coursecode", "course code", "subject_code", "subjectcode", "code"],
  courseName: [
    "course_name", "coursename", "course name",
    "subject_name", "subject", "subjectname",
  ],
  grade: ["grade", "result", "letter_grade", "lettergrade", "marks_grade"],
  credits: ["credits", "credit", "course_credits", "credit_hours"],
  sgpa: ["sgpa", "gpa", "cgpa"],
};

// ── Utilities ──────────────────────────────────────────────────────────────

function normalizeKey(value: string): string {
  return value.trim().toLowerCase().replace(/[\s-]+/g, "_");
}

function normalizeText(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number") return String(value);
  return "";
}

function parseNumeric(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string") return null;
  const parsed = Number(value.trim());
  return Number.isFinite(parsed) ? parsed : null;
}

function formatSkip(rowNumber: number, reason: string) {
  return { rowNumber, reason };
}

// ── CSV parser ─────────────────────────────────────────────────────────────

/**
 * RFC 4180-compliant CSV line parser supporting quoted fields and
 * escaped double-quotes ("").
 */
function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    const next = line[i + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
      continue;
    }

    current += char;
  }

  result.push(current.trim());
  return result;
}

function parseCsvRows(csv: string): RawRow[] {
  const lines = csv
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length === 0) return [];

  const headers = parseCsvLine(lines[0]).map(normalizeKey);
  const rows: RawRow[] = [];

  for (let i = 1; i < lines.length; i += 1) {
    const values = parseCsvLine(lines[i]);
    const row: RawRow = {};
    for (let c = 0; c < headers.length; c += 1) {
      row[headers[c]] = values[c] ?? "";
    }
    rows.push(row);
  }

  return rows;
}

// ── Row resolution ─────────────────────────────────────────────────────────

function findValue(row: RawRow, aliases: string[]): unknown {
  for (const alias of aliases) {
    const key = normalizeKey(alias);
    if (key in row) return row[key];
  }
  return undefined;
}

function normalizeRow(row: RawRow, rowNumber: number): NormalizedRow {
  const rawGrade = normalizeText(findValue(row, COLUMN_ALIASES.grade));
  const grade = normaliseGrade(rawGrade);
  const credits = parseNumeric(findValue(row, COLUMN_ALIASES.credits));
  const sgpa = parseNumeric(findValue(row, COLUMN_ALIASES.sgpa));

  return {
    rowNumber,
    studentIdRaw: normalizeText(findValue(row, COLUMN_ALIASES.studentIdRaw)),
    studentNameRaw: normalizeText(findValue(row, COLUMN_ALIASES.studentNameRaw)),
    enrollmentNo: normalizeText(findValue(row, COLUMN_ALIASES.enrollmentNo)),
    program: normalizeText(findValue(row, COLUMN_ALIASES.program)),
    semester: normalizeText(findValue(row, COLUMN_ALIASES.semester)),
    courseCode: normalizeText(findValue(row, COLUMN_ALIASES.courseCode)).toUpperCase(),
    courseName: normalizeText(findValue(row, COLUMN_ALIASES.courseName)),
    grade,
    credits: credits === null ? 0 : Math.max(0, Math.round(credits)),
    sgpa: sgpa === null ? null : Number(sgpa.toFixed(2)),
  };
}

function collectColumnCoverage(rows: RawRow[]): Set<string> {
  const keys = new Set<string>();
  for (const row of rows) {
    for (const key of Object.keys(row)) keys.add(normalizeKey(key));
  }
  return keys;
}

// ── Skill evidence upsert ──────────────────────────────────────────────────

/**
 * After a StudentAcademicRecord is stored, derive skill evidence from the
 * course-skill mapping and upsert StudentSkill entries.
 * This is what feeds the Student Skill Profile engine.
 */
async function upsertSkillEvidenceForRecord(
  studentId: string,
  courseTitle: string,
  grade: string,
): Promise<void> {
  const proficiency = GRADE_TO_PROFICIENCY[grade] ?? 0;
  if (proficiency === 0) return; // F grade contributes no skill evidence

  const skillNames = getMappedSkillsForCourse(courseTitle);
  if (skillNames.length === 0) return;

  for (const skillName of skillNames) {
    // Ensure skill exists
    const skill = await prisma.skill.upsert({
      where: { name: skillName },
      update: {},
      create: { name: skillName, category: "Academic Mapping" },
    });

    // Upsert StudentSkill — take the maximum proficiency seen across records
    const existing = await prisma.studentSkill.findUnique({
      where: { studentId_skillId: { studentId, skillId: skill.id } },
    });

    if (!existing) {
      await prisma.studentSkill.create({
        data: {
          studentId,
          skillId: skill.id,
          proficiency,
          yearsExperience: 0,
        },
      });
    } else if (proficiency > existing.proficiency) {
      await prisma.studentSkill.update({
        where: { studentId_skillId: { studentId, skillId: skill.id } },
        data: { proficiency },
      });
    }
  }
}

// ── Main import function ───────────────────────────────────────────────────

export type ImportSummary = {
  recordsDetected: number;
  students: number;
  courses: number;
  imported: number;
  skipped: number;
  skippedRecords: Array<{ rowNumber: number; reason: string }>;
  message: string;
};

export async function importAcademicData(payload: {
  format: ImportFormat;
  data: string | Array<Record<string, unknown>>;
}): Promise<ImportSummary> {
  if (!payload?.format) {
    throw new Error("Import format is required.");
  }

  // ── 1. Parse raw rows ────────────────────────────────────────────────────
  let rawRows: RawRow[];

  if (payload.format === "csv") {
    if (typeof payload.data !== "string") {
      throw new Error("CSV import expects data as a string.");
    }
    rawRows = parseCsvRows(payload.data);
  } else {
    if (!Array.isArray(payload.data)) {
      throw new Error("JSON import expects data as an array of records.");
    }
    rawRows = payload.data.map((row) => {
      const normalized: RawRow = {};
      for (const [key, value] of Object.entries(row)) {
        normalized[normalizeKey(key)] = value;
      }
      return normalized;
    });
  }

  const recordsDetected = rawRows.length;

  if (recordsDetected === 0) {
    return {
      recordsDetected: 0,
      students: 0,
      courses: 0,
      imported: 0,
      skipped: 0,
      skippedRecords: [],
      message: "No records found in import payload.",
    };
  }

  // ── 2. Column presence check ─────────────────────────────────────────────
  const availableColumns = collectColumnCoverage(rawRows);

  const requiredColumnGroups: Array<{ name: string; aliases: string[] }> = [
    {
      name: "student_id or student_name or enrollment_no",
      aliases: [
        ...COLUMN_ALIASES.studentIdRaw,
        ...COLUMN_ALIASES.studentNameRaw,
        ...COLUMN_ALIASES.enrollmentNo,
      ],
    },
    { name: "semester", aliases: COLUMN_ALIASES.semester },
    {
      name: "course_code or course_name",
      aliases: [...COLUMN_ALIASES.courseCode, ...COLUMN_ALIASES.courseName],
    },
    { name: "grade", aliases: COLUMN_ALIASES.grade },
  ];

  const missingColumns = requiredColumnGroups
    .filter(
      (group) => !group.aliases.some((alias) => availableColumns.has(normalizeKey(alias))),
    )
    .map((group) => group.name);

  if (missingColumns.length > 0) {
    return {
      recordsDetected,
      students: 0,
      courses: 0,
      imported: 0,
      skipped: recordsDetected,
      skippedRecords: [
        formatSkip(0, `Missing required columns: ${missingColumns.join(", ")}`),
      ],
      message: "Import validation failed — missing required columns.",
    };
  }

  // ── 3. Normalize all rows ────────────────────────────────────────────────
  const normalizedRows = rawRows.map((row, index) => normalizeRow(row, index + 2));

  // ── 4. Load DB lookups ───────────────────────────────────────────────────
  const [students, courses] = await Promise.all([
    prisma.student.findMany({ include: { department: true } }),
    prisma.course.findMany({
      include: { skills: { include: { skill: true } } },
    }),
  ]);

  const studentById = new Map(students.map((s) => [s.id, s]));
  const studentByName = new Map(
    students.map((s) => [
      normalizeKey(`${s.firstName} ${s.lastName}`),
      s,
    ]),
  );
  const courseByCode = new Map(
    courses.map((c) => [c.code.toUpperCase(), c]),
  );
  const courseByName = new Map(
    courses.map((c) => [normalizeKey(c.title), c]),
  );

  // ── 5. Process each row ──────────────────────────────────────────────────
  const skippedRecords: Array<{ rowNumber: number; reason: string }> = [];
  const seenInImport = new Set<string>();
  const importedStudents = new Set<string>();
  const importedCourses = new Set<string>();
  let imported = 0;

  for (const row of normalizedRows) {
    // — Missing semester —
    if (!row.semester) {
      skippedRecords.push(formatSkip(row.rowNumber, "Missing semester."));
      continue;
    }

    // — Invalid grade —
    if (!row.grade || !VALID_GRADES.has(row.grade)) {
      skippedRecords.push(
        formatSkip(
          row.rowNumber,
          `Invalid grade "${row.grade || "empty"}". Accepted values: A+, A, A-, B+, B, B-, C+, C, C-, D, F, O, S, E.`,
        ),
      );
      continue;
    }

    // — Resolve student (by ID → name → enrollment number) —
    const student =
      (row.studentIdRaw ? studentById.get(row.studentIdRaw) : undefined) ??
      (row.studentNameRaw
        ? studentByName.get(normalizeKey(row.studentNameRaw))
        : undefined);

    if (!student) {
      const tried = [row.studentIdRaw, row.studentNameRaw, row.enrollmentNo]
        .filter(Boolean)
        .join(" / ");
      skippedRecords.push(
        formatSkip(
          row.rowNumber,
          `Student not found for "${tried || "empty"}". Ensure the student exists in the database.`,
        ),
      );
      continue;
    }

    // — Resolve course (by code → name) —
    const course =
      (row.courseCode ? courseByCode.get(row.courseCode) : undefined) ??
      (row.courseName ? courseByName.get(normalizeKey(row.courseName)) : undefined);

    if (!course) {
      const tried = [row.courseCode, row.courseName].filter(Boolean).join(" / ");
      skippedRecords.push(
        formatSkip(
          row.rowNumber,
          `Unknown course "${tried || "empty"}". Ensure the course exists in the database.`,
        ),
      );
      continue;
    }

    // — Duplicate detection within this import batch —
    const batchKey = `${student.id}:${course.id}:${row.semester}`;
    if (seenInImport.has(batchKey)) {
      skippedRecords.push(
        formatSkip(
          row.rowNumber,
          `Duplicate record in import payload for student "${student.firstName} ${student.lastName}", course "${course.code}", semester "${row.semester}".`,
        ),
      );
      continue;
    }
    seenInImport.add(batchKey);

    // — Upsert StudentAcademicRecord —
    await prisma.studentAcademicRecord.upsert({
      where: {
        studentId_courseId_semester: {
          studentId: student.id,
          courseId: course.id,
          semester: row.semester,
        },
      },
      update: {
        grade: row.grade,
        credits: row.credits,
        sgpa: row.sgpa,
        status: "ACTIVE",
      },
      create: {
        studentId: student.id,
        courseId: course.id,
        grade: row.grade,
        semester: row.semester,
        credits: row.credits,
        sgpa: row.sgpa,
        status: "ACTIVE",
      },
    });

    // — Ensure CourseSkill links exist —
    const mappedSkills = getMappedSkillsForCourse(course.title);
    for (const skillName of mappedSkills) {
      const skill = await prisma.skill.upsert({
        where: { name: skillName },
        update: {},
        create: { name: skillName, category: "Academic Mapping" },
      });

      await prisma.courseSkill.upsert({
        where: { courseId_skillId: { courseId: course.id, skillId: skill.id } },
        update: {},
        create: { courseId: course.id, skillId: skill.id, weight: 1 },
      });
    }

    // — Upsert StudentSkill evidence (feeds the skill profile engine) —
    await upsertSkillEvidenceForRecord(student.id, course.title, row.grade);

    imported += 1;
    importedStudents.add(student.id);
    importedCourses.add(course.id);
  }

  return {
    recordsDetected,
    students: importedStudents.size,
    courses: importedCourses.size,
    imported,
    skipped: skippedRecords.length,
    skippedRecords,
    message:
      skippedRecords.length > 0
        ? "Import completed with skipped records."
        : "Import completed successfully.",
  };
}

/**
 * Exported for unit testing — validates and normalises a raw row array
 * without touching the database.
 */
export function validateAndNormalize(rawRows: RawRow[]): NormalizedRow[] {
  return rawRows.map((row, index) => normalizeRow(row, index + 2));
}
