import { prisma } from "./prisma";
import { getMappedSkillsForCourse } from "./course-skill-mapping";

const validGrades = new Set(["A+", "A", "A-", "B+", "B", "B-", "C+", "C", "C-", "D", "F"]);

type ImportFormat = "csv" | "json";

type RawRow = Record<string, unknown>;

type NormalizedRow = {
  rowNumber: number;
  studentIdRaw: string;
  studentNameRaw: string;
  program: string;
  semester: string;
  courseCode: string;
  courseName: string;
  grade: string;
  credits: number;
  sgpa: number | null;
};

const columnAliases: Record<keyof Omit<NormalizedRow, "rowNumber" | "credits" | "sgpa"> | "credits" | "sgpa", string[]> = {
  studentIdRaw: ["student_id", "studentid", "student id", "student"],
  studentNameRaw: ["student_name", "studentname", "student name", "name"],
  program: ["program", "department", "branch"],
  semester: ["semester", "sem", "term"],
  courseCode: ["course_code", "coursecode", "course code", "subject_code"],
  courseName: ["course_name", "coursename", "course name", "subject_name", "subject"],
  grade: ["grade", "result", "letter_grade", "lettergrade"],
  credits: ["credits", "credit", "course_credits"],
  sgpa: ["sgpa", "gpa"],
};

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

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];

    if (char === "\"") {
      if (inQuotes && next === "\"") {
        current += "\"";
        index += 1;
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
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (lines.length === 0) {
    return [];
  }

  const headers = parseCsvLine(lines[0]).map(normalizeKey);
  const rows: RawRow[] = [];

  for (let index = 1; index < lines.length; index += 1) {
    const values = parseCsvLine(lines[index]);
    const row: RawRow = {};
    for (let columnIndex = 0; columnIndex < headers.length; columnIndex += 1) {
      row[headers[columnIndex]] = values[columnIndex] ?? "";
    }
    rows.push(row);
  }

  return rows;
}

function findValue(row: RawRow, aliases: string[]): unknown {
  for (const alias of aliases) {
    const key = normalizeKey(alias);
    if (key in row) return row[key];
  }
  return undefined;
}

function normalizeRow(row: RawRow, rowNumber: number): NormalizedRow {
  const grade = normalizeText(findValue(row, columnAliases.grade)).toUpperCase();
  const credits = parseNumeric(findValue(row, columnAliases.credits));
  const sgpa = parseNumeric(findValue(row, columnAliases.sgpa));

  return {
    rowNumber,
    studentIdRaw: normalizeText(findValue(row, columnAliases.studentIdRaw)),
    studentNameRaw: normalizeText(findValue(row, columnAliases.studentNameRaw)),
    program: normalizeText(findValue(row, columnAliases.program)),
    semester: normalizeText(findValue(row, columnAliases.semester)),
    courseCode: normalizeText(findValue(row, columnAliases.courseCode)).toUpperCase(),
    courseName: normalizeText(findValue(row, columnAliases.courseName)),
    grade,
    credits: credits === null ? 0 : Math.max(0, Math.round(credits)),
    sgpa: sgpa === null ? null : Number(sgpa.toFixed(2)),
  };
}

function collectColumnCoverage(rows: RawRow[]) {
  const keys = new Set<string>();
  for (const row of rows) {
    for (const key of Object.keys(row)) {
      keys.add(normalizeKey(key));
    }
  }
  return keys;
}

function formatSkip(rowNumber: number, reason: string) {
  return { rowNumber, reason };
}

export async function importAcademicData(payload: {
  format: ImportFormat;
  data: string | RawRow[];
}) {
  if (!payload || !payload.format) {
    throw new Error("Import format is required.");
  }

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

  const availableColumns = collectColumnCoverage(rawRows);
  const requiredColumnSets: Array<{ name: string; aliases: string[] }> = [
    { name: "student_id or student_name", aliases: [...columnAliases.studentIdRaw, ...columnAliases.studentNameRaw] },
    { name: "semester", aliases: columnAliases.semester },
    { name: "course_code or course_name", aliases: [...columnAliases.courseCode, ...columnAliases.courseName] },
    { name: "grade", aliases: columnAliases.grade },
  ];

  const missingColumns = requiredColumnSets
    .filter((group) => !group.aliases.some((alias) => availableColumns.has(normalizeKey(alias))))
    .map((group) => group.name);

  if (missingColumns.length > 0) {
    return {
      recordsDetected,
      students: 0,
      courses: 0,
      imported: 0,
      skipped: recordsDetected,
      skippedRecords: [formatSkip(0, `Missing required columns: ${missingColumns.join(", ")}`)],
      message: "Import validation failed.",
    };
  }

  const normalizedRows = rawRows.map((row, index) => normalizeRow(row, index + 2));

  const students = await prisma.student.findMany({
    include: { department: true },
  });
  const courses = await prisma.course.findMany({
    include: { skills: { include: { skill: true } } },
  });

  const studentById = new Map(students.map((student) => [student.id, student]));
  const studentByName = new Map(
    students.map((student) => [
      normalizeKey(`${student.firstName} ${student.lastName}`),
      student,
    ]),
  );
  const courseByCode = new Map(courses.map((course) => [course.code.toUpperCase(), course]));
  const courseByName = new Map(courses.map((course) => [normalizeKey(course.title), course]));

  const skippedRecords: Array<{ rowNumber: number; reason: string }> = [];
  const seenInImport = new Set<string>();
  const importedStudents = new Set<string>();
  const importedCourses = new Set<string>();
  let imported = 0;

  for (const row of normalizedRows) {
    if (!row.semester) {
      skippedRecords.push(formatSkip(row.rowNumber, "Missing semester."));
      continue;
    }

    if (!row.grade || !validGrades.has(row.grade)) {
      skippedRecords.push(formatSkip(row.rowNumber, `Invalid grade "${row.grade || "empty"}".`));
      continue;
    }

    const student =
      (row.studentIdRaw ? studentById.get(row.studentIdRaw) : undefined) ??
      (row.studentNameRaw ? studentByName.get(normalizeKey(row.studentNameRaw)) : undefined);

    if (!student) {
      skippedRecords.push(formatSkip(row.rowNumber, "Student not found for provided student_id/student_name."));
      continue;
    }

    const course =
      (row.courseCode ? courseByCode.get(row.courseCode) : undefined) ??
      (row.courseName ? courseByName.get(normalizeKey(row.courseName)) : undefined);

    if (!course) {
      skippedRecords.push(formatSkip(row.rowNumber, `Unknown course (${row.courseCode || row.courseName || "empty"}).`));
      continue;
    }

    const duplicateKey = `${student.id}:${course.id}:${row.semester}`;
    if (seenInImport.has(duplicateKey)) {
      skippedRecords.push(formatSkip(row.rowNumber, "Duplicate record in import payload."));
      continue;
    }
    seenInImport.add(duplicateKey);

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

    const mappedSkills = getMappedSkillsForCourse(course.title);
    for (const skillName of mappedSkills) {
      const skill = await prisma.skill.upsert({
        where: { name: skillName },
        update: {},
        create: {
          name: skillName,
          category: "Academic Mapping",
        },
      });

      await prisma.courseSkill.upsert({
        where: {
          courseId_skillId: {
            courseId: course.id,
            skillId: skill.id,
          },
        },
        update: {},
        create: {
          courseId: course.id,
          skillId: skill.id,
          weight: 1,
        },
      });
    }

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
    message: skippedRecords.length > 0 ? "Import completed with skipped records." : "Import completed successfully.",
  };
}
