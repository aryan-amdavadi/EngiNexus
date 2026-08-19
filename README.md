# EngiNexus

EngiNexus is a university engineering ecosystem prototype that connects projects, faculty, students, labs, equipment, and resource availability. The system is built as a local Next.js application with a SQLite-backed Prisma datastore so future intelligence services can operate against a structured relational model without a separate backend process.

## Backend architecture

- Next.js App Router powers the web application.
- Route handlers under `app/api` expose database-backed APIs.
- Prisma is the ORM layer for all data access.
- SQLite is used for local development and validation.
- Domain analysis logic lives in `lib/project-analysis.ts` and is designed to be extended by future intelligence services.

## Database architecture

The relational schema includes the core entities required for EngiNexus:

- Department
- Student
- Faculty
- Skill
- StudentSkill
- FacultyExpertise
- Project
- ProjectRequirement
- Laboratory
- Equipment
- LabEquipment
- ResourceAvailability
- Course
- CourseSkill
- StudentAcademicRecord
- StudentProject
- Mentorship
- ResourceUtilization

These entities are modeled in `prisma/schema.prisma` and are seeded through `prisma/seed.ts` with demo data that is internally consistent for the project analysis workflow.

## Local setup

1. Install dependencies:
   npm install
2. Generate the Prisma client:
   npm run db:generate
3. Create the local SQLite database and schema:
   npm run db:push
4. Seed the demo dataset:
   npm run db:seed
5. Start the app:
   npm run dev

## Migration instructions

Use Prisma migrate when you want to version the schema:

npm run db:migrate

This creates a new migration in `prisma/migrations` and applies it to the local SQLite database.

## Seed instructions

To reseed the database after resetting the local SQLite database:

rm -f prisma/dev.db
npm run db:push
npm run db:seed

The seed script creates representative demo records for:

- 6 departments
- 30 students
- 10 faculty members
- 40+ skills
- 5 projects with different requirements
- 8 labs
- 30+ equipment records
- 20+ courses

## API list

Core data endpoints:

- GET /api/projects
- GET /api/projects/:id
- GET /api/projects/:id/analyze
- GET /api/students
- GET /api/students/:id
- GET /api/faculty
- GET /api/labs
- GET /api/equipment
- GET /api/resources/utilization

The analysis endpoint returns structured, explainable project feasibility data including domains, required skills, matching students, faculty alignment, lab and equipment availability, feasibility factors, constraints, and recommendations.

## Validation

To validate the project analysis engine across multiple seeded projects:

npm run test:analysis

The build is validated with:

npm run build
