"use client";

import { useEffect, useMemo, useState } from "react";
import {
  analyzeProject,
  fetchProjectTeam,
  fetchResourceBottlenecks,
  fetchResourceForecast,
  fetchResourceUtilization,
  type ProjectAnalysis,
  type ResourceBottleneck,
  type ResourceForecastEntry,
  type ResourceUtilizationEntry,
  type TeamRecommendation,
} from "./intelligence";
import { bottlenecks, equipment, examples, faculty, labs, students } from "./data";
import "./polish.css";

type Page = "overview" | "project-intelligence" | "resource-intelligence" | "talent" | "labs";

const nav: { id: Page; label: string; icon: string }[] = [
  { id: "overview", label: "Overview", icon: "grid" },
  { id: "project-intelligence", label: "Project Intelligence", icon: "spark" },
  { id: "resource-intelligence", label: "Resource Intelligence", icon: "chart" },
  { id: "talent", label: "Talent & Mentors", icon: "people" },
  { id: "labs", label: "Labs & Equipment", icon: "lab" },
];

function Icon({ name, size = 18 }: { name: string; size?: number }) {
  const common = { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  const paths: Record<string, React.ReactNode> = {
    grid: <><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></>,
    spark: <path d="m12 3-1.8 5.2L5 10l5.2 1.8L12 17l1.8-5.2L19 10l-5.2-1.8L12 3Zm6 13-1 2.8-2.8 1 2.8 1 1 2.8 1-2.8 2.8-1-2.8-1L18 16Z"/>,
    chart: <><path d="M4 19V5M4 19h16"/><path d="M8 16v-4M13 16V7M18 16v-7"/></>,
    people: <><circle cx="9" cy="8" r="3"/><path d="M3.5 20c.4-3.5 2.4-5 5.5-5s5.1 1.5 5.5 5M16 5.2a3 3 0 0 1 0 5.6M17 15c2.2.2 3.4 1.7 3.7 4"/></>,
    lab: <><path d="M9 3h6M10 3v6l-5.4 8.4A2.3 2.3 0 0 0 6.5 21h11a2.3 2.3 0 0 0 1.9-3.6L14 9V3"/><path d="M7.7 16h8.6"/></>,
    menu: <><path d="M4 7h16M4 12h16M4 17h16"/></>, close: <><path d="m6 6 12 12M18 6 6 18"/></>, arrow: <><path d="M5 12h14M13 6l6 6-6 6"/></>, search: <><circle cx="11" cy="11" r="6"/><path d="m20 20-4.2-4.2"/></>, info: <><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/></>, check: <path d="m5 12 4 4L19 6"/>, warning: <><path d="M10.3 4.6 3.2 18a2 2 0 0 0 1.8 3h14a2 2 0 0 0 1.8-3L13.7 4.6a1.9 1.9 0 0 0-3.4 0Z"/><path d="M12 9v4M12 17h.01"/></>, calendar: <><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4M17 3v4M3 10h18"/></>, bolt: <path d="m13 2-8 12h7l-1 8 8-12h-7l1-8Z"/>,
  };
  return <svg {...common} aria-hidden="true">{paths[name] ?? paths.info}</svg>;
}

function Status({ children, tone = "good" }: { children: React.ReactNode; tone?: "good" | "warning" | "critical" | "neutral" }) {
  return <span className={`status ${tone}`}><i />{children}</span>;
}

function MiniBars({ items, compact = false }: { items: { label: string; value: number }[]; compact?: boolean }) {
  return <div className={`bars ${compact ? "compact" : ""}`}>{items.map((item) => <div className="bar-row" key={item.label}><div className="bar-label">{item.label}</div><div className="bar-track"><div className="bar-fill" style={{ width: `${item.value}%` }} /></div><b>{item.value}%</b></div>)}</div>;
}

function SectionHead({ eyebrow, title, action }: { eyebrow?: string; title: string; action?: React.ReactNode }) {
  return <div className="section-head"><div>{eyebrow && <div className="eyebrow">{eyebrow}</div>}<h2>{title}</h2></div>{action}</div>;
}

function ScoreRing({ value = 86 }: { value?: number }) {
  return <div className="score-ring" style={{ background: `conic-gradient(var(--blue) ${value * 3.6}deg, #e6ebef 0)` }}><div><strong>{value}%</strong><span>Overall score</span></div></div>;
}

export default function Dashboard({ initialPage }: { initialPage: string }) {
  const valid = nav.some((item) => item.id === initialPage) ? initialPage as Page : "overview";
  const [page, setPage] = useState<Page>(valid);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [resourceLatest, setResourceLatest] = useState<ResourceUtilizationEntry[]>([]);
  const [resourceBottlenecks, setResourceBottlenecks] = useState<ResourceBottleneck[]>([]);
  const [gpuForecast, setGpuForecast] = useState<ResourceForecastEntry | null>(null);
  const [resourceSummary, setResourceSummary] = useState({
    laboratoriesMonitored: 0,
    equipmentMonitored: 0,
    highDemandCount: 0,
    attentionCount: 0,
  });

  useEffect(() => {
    let mounted = true;

    void Promise.all([
      fetchResourceUtilization(),
      fetchResourceBottlenecks(),
      fetchResourceForecast("GPU Workstations"),
    ])
      .then(([utilizationResponse, bottleneckResponse, forecastResponse]) => {
        if (!mounted) return;
        setResourceLatest(utilizationResponse.latest);
        setResourceSummary(utilizationResponse.summary);
        setResourceBottlenecks(bottleneckResponse.data);
        setGpuForecast(forecastResponse.data.focus);
      })
      .catch(() => {
        if (!mounted) return;
        setResourceLatest([]);
        setResourceBottlenecks([]);
        setGpuForecast(null);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const go = (target: Page) => { setPage(target); setMobileOpen(false); window.history.pushState({}, "", target === "overview" ? "/" : `/${target}`); };
  return <div className="app-shell">
    <aside className={mobileOpen ? "sidebar open" : "sidebar"}>
      <div className="brand"><div className="mark">EN</div><div><strong>EngiNexus</strong><span>Resource Intelligence</span></div></div>
      <div className="side-label">Workspace</div>
      <nav>{nav.map((item) => <button key={item.id} className={page === item.id ? "active" : ""} onClick={() => go(item.id)}><Icon name={item.icon}/><span>{item.label}</span></button>)}</nav>
      <div className="sidebar-footer"><div className="demo-dot"/><div><b>Prototype / Demo Dataset</b><span>Representative university data</span></div></div>
    </aside>
    {mobileOpen && <button className="scrim" aria-label="Close navigation" onClick={() => setMobileOpen(false)} />}
    <main>
      <header className="topbar"><button className="menu-button" aria-label="Open navigation" onClick={() => setMobileOpen(true)}><Icon name="menu"/></button><div className="crumb">University Engineering Ecosystem <span>/</span> <b>{nav.find((n) => n.id === page)?.label}</b></div><div className="top-actions"><span className="prototype"><i/> Prototype Intelligence Engine</span><button className="period"><Icon name="calendar" size={15}/> Academic Year 2026 <span>⌄</span></button></div></header>
      <div className="content">{page === "overview" && <Overview go={go} latest={resourceLatest} summary={resourceSummary} bottlenecks={resourceBottlenecks}/>} {page === "project-intelligence" && <Project/>} {page === "resource-intelligence" && <Resources latest={resourceLatest} summary={resourceSummary} bottlenecks={resourceBottlenecks} gpuForecast={gpuForecast}/>} {page === "talent" && <Talent/>} {page === "labs" && <Labs/>}</div>
    </main>
  </div>;
}

function mapRiskTone(risk: string): "critical" | "warning" | "neutral" {
  if (risk === "CRITICAL") return "critical";
  if (risk === "HIGH" || risk === "MEDIUM") return "warning";
  return "neutral";
}

function resourceStatusText(status: string) {
  if (status === "AVAILABLE") return "Healthy";
  if (status === "NEAR_CAPACITY") return "Near capacity";
  if (status === "LIMITED") return "High demand";
  if (status === "BOOKED") return "Booked";
  return "Constrained";
}

function Overview({
  go,
  latest,
  summary,
  bottlenecks: detectedBottlenecks,
}: {
  go: (page: Page) => void;
  latest: ResourceUtilizationEntry[];
  summary: { laboratoriesMonitored: number; equipmentMonitored: number; highDemandCount: number; attentionCount: number };
  bottlenecks: ResourceBottleneck[];
}) {
  const laboratoryRecords = latest.filter((entry) => entry.resourceType === "LABORATORY");
  const equipmentRecords = latest.filter((entry) => entry.resourceType === "EQUIPMENT");
  const labBars = (laboratoryRecords.length > 0 ? laboratoryRecords : labs.map((lab) => ({ resourceName: lab.name, utilization: lab.utilization } as ResourceUtilizationEntry)))
    .map((lab) => ({ label: lab.resourceName, value: Math.round(lab.utilization) }));
  const healthRows = equipmentRecords.length > 0
    ? equipmentRecords.slice().sort((left, right) => right.utilization - left.utilization).slice(0, 4)
    : equipment.slice(0, 4).map((item) => ({ resourceName: item.name, status: item.utilization > 90 ? "LIMITED" : "AVAILABLE", utilization: item.utilization }));
  const bottleneckRows = detectedBottlenecks.length > 0
    ? detectedBottlenecks
    : bottlenecks.map((item) => ({
      resource: item.title,
      risk: item.severity.toUpperCase(),
      currentUtilization: 85,
      capacity: 8,
      demand: 7.5,
      projectedDemand: 11,
      recommendation: item.action,
    }));

  const resourceUtilizationAvg = healthRows.length > 0
    ? Math.round(healthRows.reduce((sum, item) => sum + item.utilization, 0) / healthRows.length)
    : 87;

  return <><div className="page-intro"><div><div className="eyebrow">Command center</div><h1>Engineering Resource Intelligence</h1><p>Connect engineering talent, projects and physical resources to make better decisions across the university ecosystem.</p></div><button className="primary" onClick={() => go("project-intelligence")}>Explore project feasibility <Icon name="arrow"/></button></div>
    <section className="intelligence-pillars" aria-label="EngiNexus intelligence model"><div><span>01</span><b>Discover</b><p>Find the right people, skills and expertise.</p></div><div><span>02</span><b>Match</b><p>Connect projects with mentors, labs and equipment.</p></div><div><span>03</span><b>Optimize</b><p>Identify bottlenecks and improve resource utilization.</p></div></section>
    <div className="kpis"><Kpi value={`${summary.laboratoriesMonitored || 42}`} label="Laboratories" note="Across 6 engineering domains"/><Kpi value={`${summary.equipmentMonitored || 1247}`} label="Equipment & Resources" note={`${summary.attentionCount || 12} resources need attention`}/><Kpi value="1,430" label="Active Projects" note="+8% from previous period"/><Kpi value={`${resourceUtilizationAvg}%`} label="Resource Utilization" note="Healthy operating range" accent/></div>
    <div className="grid two overview-grid"><section className="panel chart-panel"><SectionHead eyebrow="Infrastructure" title="Laboratory Utilization" action={<span className="muted">Current academic period</span>}/><MiniBars items={labBars}/><div className="chart-note"><span><i className="legend blue"/>Utilization rate</span><span>{summary.laboratoriesMonitored || 42} labs monitored</span></div></section><section className="panel health-panel"><SectionHead eyebrow="Live view" title="Resource Health"/>{healthRows.map((row) => <Health key={row.resourceName} name={row.resourceName} detail={resourceStatusText(row.status)} tone={row.utilization >= 90 ? "critical" : row.utilization >= 75 ? "warning" : "good"} value={`${Math.round(row.utilization)}%`}/>)}<div className="panel-link" onClick={() => go("resource-intelligence")}>View resource intelligence <Icon name="arrow" size={16}/></div></section></div>
    <section className="panel bottleneck-panel"><SectionHead eyebrow="Prototype Intelligence Engine" title="AI-Detected Resource Bottlenecks" action={<span className="muted">{bottleneckRows.length} signals requiring review</span>}/><div className="bottlenecks">{bottleneckRows.map((item) => <article key={item.resource}><Status tone={mapRiskTone(item.risk)}>{item.risk.toLowerCase()} priority</Status><h3>{item.resource}</h3><p>Current demand {item.demand}/{item.capacity} with projected demand {item.projectedDemand}.</p><div className="recommend"><b>Recommended action</b>{item.recommendation}</div></article>)}</div></section>
    <section className="opportunity"><div className="opportunity-copy"><div className="eyebrow">Connected intelligence</div><h2>AI-Detected Interdisciplinary Opportunity</h2><p>EngiNexus identifies complementary capabilities that may be difficult to discover through department-level search.</p><Status>Strong cross-disciplinary skill coverage detected</Status></div><div className="opportunity-flow"><div><span>Computer Science</span><b>Computer Vision</b></div><em>+</em><div><span>Electronics</span><b>Embedded Systems</b></div><em>+</em><div><span>Mechanical Engineering</span><b>Robotics</b></div><i className="flow-arrow">↓</i><strong>Autonomous Infrastructure Inspection</strong></div></section>
  </>;
}

function Kpi({ value, label, note, accent }: { value: string; label: string; note: string; accent?: boolean }) { return <div className="kpi"><span className={accent ? "kpi-accent" : ""}>{value}</span><b>{label}</b><small>{note}</small></div>; }
function Health({ name, detail, tone, value }: { name: string; detail: string; tone: "good" | "warning" | "critical"; value: string }) { return <div className="health"><div className={`health-icon ${tone}`}><Icon name={tone === "good" ? "check" : "warning"} size={17}/></div><div><b>{name}</b><span>{detail}</span></div><strong>{value}</strong></div>; }

function Project() {
  const [input, setInput] = useState(examples[0].value);
  const [state, setState] = useState<"idle" | "analyzing" | "results">("idle");
  const [analysis, setAnalysis] = useState<ProjectAnalysis | null>(null);
  const [team, setTeam] = useState<TeamRecommendation | null>(null);
  const [plan, setPlan] = useState(false);
  const [selectedExample, setSelectedExample] = useState(examples[0].label);

  const run = async () => {
    setState("analyzing");
    setPlan(false);
    setTeam(null);

    const resolvedAnalysis = analyzeProject(input);
    setAnalysis(resolvedAnalysis);

    try {
      const projectList = await fetch("/api/projects", { cache: "no-store" }).then((response) => response.json());
      const project = projectList?.data?.find((item: { title: string; summary: string }) => {
        const haystack = `${item.title} ${item.summary}`.toLowerCase();
        const query = input.toLowerCase();
        return haystack.includes("crop") && query.includes("crop") || haystack.includes("road") && query.includes("road") || haystack.includes("medical") && query.includes("medical") || haystack.includes("warehouse") && query.includes("warehouse") || haystack.includes("energy") && query.includes("energy");
      }) ?? projectList?.data?.[0];

      if (project?.id) {
        const teamResponse = await fetchProjectTeam(project.id);
        setTeam(teamResponse);
      }
    } catch (_error) {
      setTeam(null);
    }

    setState("results");
  };

  return <><div className="page-intro project-intro"><div><div className="eyebrow">Prototype Intelligence Engine</div><h1>Turn an Engineering Idea Into a Feasible Project</h1><p>EngiNexus maps project requirements to student skills, faculty expertise, laboratories and equipment.</p></div></div>
    <section className="idea-box"><div className="idea-box-head"><div><label htmlFor="idea">Project idea</label><span>Describe your project idea to begin.</span></div><Status tone="neutral">Prototype intelligence indicator</Status></div><textarea id="idea" value={input} onChange={(event) => { setInput(event.target.value); setSelectedExample(""); }} placeholder={examples[0].value}/><div className="example-row"><span>Try an example</span>{examples.map((example) => <button className={selectedExample === example.label ? "selected" : ""} key={example.label} onClick={() => { setInput(example.value); setState("idle"); setSelectedExample(example.label); }}>{example.label}</button>)}</div><div className="analysis-cta"><span><Icon name="spark" size={16}/> Deterministic local analysis for a reliable demo</span><button className="primary" onClick={() => void run()}>Analyze Project <Icon name="arrow"/></button></div></section>
    {state === "analyzing" && <AnalysisLoading/>}
    {state === "results" && analysis && <ProjectResults analysis={analysis} team={team} plan={plan} onPlan={() => setPlan(true)}/>}</>;
}

function AnalysisLoading() { const steps = ["Extracting requirements", "Mapping skills", "Finding relevant expertise", "Checking resources", "Evaluating feasibility"]; return <section className="analysis-loading panel"><div className="spinner"/><div><div className="eyebrow">Understanding project</div><h2>EngiNexus is mapping the project ecosystem</h2><p>Connecting the project brief to representative university resources.</p></div><div className="loading-steps">{steps.map((step) => <span key={step}><Icon name="check" size={14}/>{step}</span>)}</div></section>; }

function ProjectResults({ analysis, team, plan, onPlan }: { analysis: ProjectAnalysis; team: TeamRecommendation | null; plan: boolean; onPlan: () => void }) { return <div className="project-results"><section className="results-header"><div><div className="eyebrow">Analysis complete</div><h2>{analysis.title}</h2><div className="tags">{analysis.domains.map((d) => <span key={d}>{d}</span>)}</div></div><Status>Recommendation confidence: High</Status></section>
  <section className="decision-summary"><div className="decision-primary"><div className="eyebrow">Project status</div><h2>Feasible with Minor Constraints</h2><p>Strong capability coverage with two manageable availability risks.</p><div className="decision-action"><Icon name="check" size={15}/><span><b>Recommended action</b>Reserve specialized equipment early.</span></div></div><div className="decision-score"><span>Feasibility</span><b>86%</b><small>High confidence</small></div><div className="decision-constraints"><span>Key constraints</span><b><Icon name="warning" size={14}/>Limited drone availability</b><b><Icon name="warning" size={14}/>High GPU demand</b></div></section>
  <section className="project-snapshot"><div><span>Project snapshot</span><b>From idea to resource plan</b></div><Snapshot label="Domain" value="Agriculture + AI + Robotics"/><Snapshot label="Estimated team" value= {team ? `${team.members.length} students` : "3–4 students"}/><Snapshot label="Primary labs" value="2"/><Snapshot label="Required equipment" value="5 resources"/><Snapshot label="Mentor match" value="96%"/></section>
  <section className="feasibility panel"><div className="feasibility-score"><ScoreRing/><div><div className="eyebrow">Project Feasibility</div><h2>Feasible with minor constraints</h2><p>Strong talent, mentor and laboratory coverage with manageable availability risks.</p></div></div><div className="breakdown">{[["Skill Coverage", 93], ["Faculty Coverage", 91], ["Laboratory Availability", 84], ["Equipment Availability", 78], ["Schedule Feasibility", 82]].map(([label, value]) => <div key={String(label)}><span>{label}</span><div><i style={{ width: `${value}%` }}/></div><b>{value}%</b></div>)}</div><div className="score-reason"><div><b>Decision factors</b><span><Icon name="check" size={14}/>Core technical skills available</span><span><Icon name="check" size={14}/>Suitable faculty identified</span><span><Icon name="check" size={14}/>Primary laboratory and most equipment available</span></div><div className="warnings"><b>Constraints to plan for</b><span><Icon name="warning" size={14}/>Specialized drone access is limited</span><span><Icon name="warning" size={14}/>GPU resources are high demand</span></div><p><b>Recommended mitigation:</b> Reserve specialized equipment early and schedule GPU-intensive workloads during lower-demand periods.</p></div></section>
  <div className="grid two requirements"><section className="panel"><SectionHead eyebrow="Requirements" title="Required Skills"/><div className="skill-list">{analysis.skills.map((skill) => <div key={skill.name}><span>{skill.name}</span><b className={skill.level === "High" ? "high" : "medium"}>{skill.level}</b></div>)}</div></section><section className="panel"><SectionHead eyebrow="Requirements" title="Required Resources"/><div className="resource-requirements"><div><span>Equipment</span>{analysis.equipment.map((item) => <b key={item}><Icon name="check" size={14}/>{item}</b>)}</div><div><span>Laboratories</span>{analysis.labs.map((item) => <b key={item}><Icon name="lab" size={14}/>{item}</b>)}</div></div></section></div>
  <section><SectionHead eyebrow="Talent matching" title="Recommended Project Team"/><div className="people-grid">{team?.members?.length ? team.members.map((member) => <article className="person-card" key={member.name}><div className="avatar">{member.name.split(" ").map((part) => part[0]).slice(0,2).join("")}</div><div className="person-head"><h3>{member.name}</h3><span>{member.department ?? "Department match"}</span></div><b className="match">{member.confidence}% <small>confidence</small></b><div className="tags">{member.skillsCovered.map((skill) => <span key={`${member.name}-${skill}`}>{skill}</span>)}</div><p><b>Why this recommendation?</b>{member.reason}</p></article>) : <div className="empty-state">Team data is currently unavailable.</div>}</div></section>
  <section className="grid mentor-labs"><div><SectionHead eyebrow="Faculty matching" title="Potential Faculty Mentors"/>{faculty.map((person) => <article className="mentor" key={person.name}><div className="mentor-icon"><Icon name="people"/></div><div><h3>{person.name}</h3><span>{person.area}</span><p><b>Why this recommendation?</b>{person.note}</p><Status>{person.available}</Status></div><b>{person.match}%<small>match</small></b></article>)}</div><div><SectionHead eyebrow="Resource matching" title="Recommended Laboratories"/>{labs.slice(0,3).map((lab, i) => <article className="lab-match" key={lab.id}><div><h3>{lab.name}</h3><Status tone={lab.availability === "Near capacity" ? "warning" : "good"}>{lab.availability}</Status></div><b>{[94,89,81][i]}%<small>match</small></b><p><span className="why-note">Why this recommendation? Contains required capabilities and supports the project’s technical requirements.</span>{lab.capabilities.slice(0,2).map((cap) => <span key={cap}><Icon name="check" size={13}/>{cap}</span>)}</p></article>)}</div></section>
  <section className="panel"><SectionHead eyebrow="Availability check" title="Equipment Check" action={<Status tone="neutral">Availability for recommended window</Status>}/><div className="equipment-table"><div className="table-row table-head"><span>Resource</span><span>Required</span><span>Availability</span><span>Status</span></div>{[["GPU Workstation","Available","Ready","good"],["High-Resolution Camera","Available","Ready","good"],["Robotic Platform","Available","Ready","good"],["Environmental Sensor Kit","Limited","Constraint","warning"],["Drone","Booked","Constraint","critical"]].map(([item, availability, status, tone]) => <div className="table-row" key={item}><b>{item}</b><span>Required</span><span>{availability}</span><Status tone={tone as "good" | "warning" | "critical"}>{status}</Status></div>)}</div></section>
  {!plan ? <section className="plan-cta"><div><div className="eyebrow">Resource plan ready</div><h2>Generate a project resource plan</h2><p>Turn this intelligence into a concise team, resource and schedule proposal.</p></div><button className="primary" onClick={onPlan}>Generate Project Resource Plan <Icon name="arrow"/></button></section> : <ResourcePlan/>}
  </div>; }

function Snapshot({ label, value }: { label: string; value: string }) { return <div><span>{label}</span><b>{value}</b></div>; }

function ResourcePlan() { return <section className="resource-plan"><div className="plan-title"><div className="check-round"><Icon name="check"/></div><div><div className="eyebrow">Final decision summary</div><h2>Project Resource Plan</h2></div><Status>Ready to review</Status></div><div className="plan-grid"><div><span>Team</span><b>3–4 interdisciplinary students</b></div><div><span>Mentor</span><b>Dr. Ananya Sharma</b></div><div><span>Labs</span><b>AI / ML Lab · Robotics Lab</b></div><div><span>Project window</span><b>6 weeks</b></div><div><span>Core resources</span><b>GPU · Camera · Robot · Sensors</b></div><div><span>Primary constraint</span><b>Drone availability</b></div></div><div className="plan-mitigation"><Icon name="warning" size={16}/><p><b>Recommended mitigation</b>Reserve drone access early and use simulation plus alternative data collection while blocked.</p></div></section>; }

function Resources({ latest, summary, bottlenecks: detectedBottlenecks, gpuForecast }: { latest: ResourceUtilizationEntry[]; summary: { laboratoriesMonitored: number; equipmentMonitored: number; highDemandCount: number; attentionCount: number }; bottlenecks: ResourceBottleneck[]; gpuForecast: ResourceForecastEntry | null }) { const [drawer, setDrawer] = useState(false); const labsData = latest.filter((entry) => entry.resourceType === "LABORATORY"); const equipmentData = latest.filter((entry) => entry.resourceType === "EQUIPMENT").slice().sort((left, right) => right.utilization - left.utilization); const demandRows = equipmentData.length > 0 ? equipmentData.slice(0, 5) : equipment.slice(0, 5).map((item) => ({ id: item.id, resourceName: item.name, utilization: item.utilization, status: item.status === "Booked" ? "BOOKED" : item.status === "Limited" ? "LIMITED" : "AVAILABLE" } as ResourceUtilizationEntry)); const focus = gpuForecast; const currentDemand = focus?.currentDemand ?? 7.5; const nextMonth = focus?.projection.nextMonth ?? 8.2; const nextSemester = focus?.projection.nextSemester ?? 11; const capacity = focus?.capacity ?? 8; const gap = Number((nextSemester - capacity).toFixed(1)); const gapPercent = capacity > 0 ? Math.round((Math.max(0, gap) / capacity) * 100) : 0; const projectedHeight = Math.max(20, Math.min(95, Math.round((nextSemester / Math.max(capacity, nextSemester)) * 92))); return <><div className="page-intro"><div><div className="eyebrow">Administrator / infrastructure intelligence</div><h1>University Resource Intelligence</h1><p>Identify utilization patterns, resource bottlenecks and future infrastructure requirements.</p></div><button className="period"><Icon name="calendar" size={15}/> Sep 2026 – Feb 2027 <span>⌄</span></button></div><section className="resource-story" aria-label="Resource intelligence flow"><div><b>Observe</b><span>Current utilization</span></div><i>↓</i><div><b>Predict</b><span>Projected demand</span></div><i>↓</i><div><b>Recommend</b><span>Prioritized university action</span></div></section><div className="kpis"><Kpi value={`${summary.laboratoriesMonitored || 42}`} label="Laboratories monitored" note="Across 6 departments"/><Kpi value={`${summary.equipmentMonitored || 1247}`} label="Equipment resources" note="From utilization records"/><Kpi value={`${summary.highDemandCount || 18}`} label="High-demand resources" note="Above threshold utilization"/><Kpi value={`${summary.attentionCount || 9}`} label="Need attention" note="Capacity or booking action"/></div>
  <div className="grid resource-main"><section className="panel chart-panel"><SectionHead eyebrow="Utilization" title="Laboratory Utilization" action={<span className="muted">Current period</span>}/><MiniBars items={(labsData.length > 0 ? labsData : labs.map((l) => ({ resourceName: l.name, utilization: l.utilization } as ResourceUtilizationEntry))).map((l) => ({label: l.resourceName, value: Math.round(l.utilization)}))}/></section><section className="panel equipment-demand"><SectionHead eyebrow="Demand" title="Equipment Demand"/><p>Click GPU Workstations to inspect capacity intelligence.</p>{demandRows.map((item) => <button className="demand-row" onClick={() => item.resourceName.toLowerCase().includes("gpu") && setDrawer(true)} key={item.id ?? item.resourceName}><div><b>{item.resourceName}</b><Status tone={item.utilization > 90 ? "critical" : item.utilization > 75 ? "warning" : "good"}>{item.utilization > 90 ? "High demand" : item.utilization > 75 ? "Elevated" : "Stable"}</Status></div><strong>{Math.round(item.utilization)}%</strong><Icon name="arrow" size={16}/></button>)}</section></div>
  <section className="panel forecast"><SectionHead eyebrow="Backend forecast" title="Projected Resource Demand" action={<span className="muted">{focus?.resourceName ?? "GPU Workstations"}</span>}/><div className="forecast-body"><div className="forecast-chart"><div className="capacity-line"><span>Capacity: {capacity} units</span></div><div className="forecast-columns"><div><i style={{height:`${Math.max(20, Math.round((currentDemand / Math.max(capacity, nextSemester)) * 92))}%`}}/><span>Current</span><b>{currentDemand}</b></div><div><i style={{height:`${Math.max(20, Math.round((nextMonth / Math.max(capacity, nextSemester)) * 92))}%`}}/><span>Next month</span><b>{nextMonth}</b></div><div className="projected"><i style={{height:`${projectedHeight}%`}}/><span>Next semester</span><b>{nextSemester}</b></div></div></div><div className="forecast-copy"><Status tone={gap > 0 ? "critical" : "good"}>Projected capacity gap: {Math.max(0, gapPercent)}%</Status><h3>{gap > 0 ? "Demand will exceed available capacity next semester." : "Capacity remains within projected demand."}</h3><p>This deterministic forecast uses local utilization history with moving average and linear trend projection.</p><div className="recommend"><b>Recommendation</b>{focus?.recommendation ?? "Reserve specialized equipment."}</div></div></div></section>
  <section className="hidden-capacity"><div><div className="eyebrow">Optimization opportunity</div><h2>Hidden Capacity</h2><p>Mechanical Automation Lab is underutilized but compatible with robotics, CAD and automation work.</p><button className="quiet-button">View compatible project types <Icon name="arrow" size={15}/></button></div><div className="capacity-metric"><span>Current utilization</span><b>47%</b><i>→</i><span>After reallocation</span><b>63%</b></div><div className="capacity-note"><b>18 transferable projects</b><span>Shift compatible work from high-demand Robotics Lab slots.</span></div></section>
  <section className="panel bottleneck-panel"><SectionHead eyebrow="Backend bottlenecks" title="Resource Bottlenecks" action={<span className="muted">{detectedBottlenecks.length} identified</span>}/><div className="bottlenecks">{detectedBottlenecks.slice(0, 4).map((item) => <article key={item.resource}><Status tone={mapRiskTone(item.risk)}>{item.risk.toLowerCase()} priority</Status><h3>{item.resource}</h3><p>Utilization {item.currentUtilization}% · Demand {item.demand}/{item.capacity} · Projected {item.projectedDemand}</p><div className="recommend"><b>Recommended action</b>{item.recommendation}</div></article>)}</div></section>
  {drawer && <GpuDrawer close={() => setDrawer(false)} forecast={focus}/>}</> }

function GpuDrawer({ close, forecast }: { close: () => void; forecast: ResourceForecastEntry | null }) { const capacity = forecast?.capacity ?? 8; const currentDemand = forecast?.currentDemand ?? 7.5; const projectedDemand = forecast?.projectedDemand ?? 11; const gap = Number((projectedDemand - capacity).toFixed(1)); const trackedPeriods = forecast?.history.length ?? 2; return <><button className="drawer-scrim" aria-label="Close GPU analysis" onClick={close}/><aside className="drawer"><div className="drawer-head"><div><div className="eyebrow">Backend intelligence indicator</div><h2>GPU Resource Analysis</h2></div><button aria-label="Close" onClick={close}><Icon name="close"/></button></div><div className="gpu-summary"><div><span>Current capacity</span><b>{capacity} <small>units</small></b></div><div><span>Current demand</span><b>{currentDemand} <small>units</small></b></div><div><span>Utilization</span><b>{Math.round(forecast?.utilization ?? 94)}%</b></div><div><span>Tracked periods</span><b>{trackedPeriods}</b></div></div><div className="gap-box"><span>Projected demand</span><strong>{projectedDemand} units</strong><div><b>Projected gap</b><em>{gap > 0 ? gap : 0} units</em></div></div><div className="drawer-recommend"><Icon name="spark"/><div><b>Recommendation</b><p>{forecast?.recommendation ?? "Add GPU capacity."}</p><Status tone="neutral">Deterministic backend forecast</Status></div></div><div className="drawer-foot"><Status tone={gap > 0 ? "critical" : "good"}>{gap > 0 ? "Capacity decision needed" : "Capacity in healthy range"}</Status><span>Database-backed resource intelligence</span></div></aside></>; }

function Talent() { const [tab, setTab] = useState("Students"); const skills = [["Computer Vision",82],["AI / ML",78],["Robotics",61],["Embedded Systems",59],["Data Science",67],["Cybersecurity",46],["GIS",34]]; return <><div className="page-intro"><div><div className="eyebrow">University capability map</div><h1>Talent & Expertise</h1><p>Find interdisciplinary student talent, faculty expertise and emerging engineering skill gaps.</p></div></div><section className="panel talent-panel"><div className="tabs">{["Students","Faculty","Skills"].map((item) => <button className={tab===item?"selected":""} onClick={()=>setTab(item)} key={item}>{item}</button>)}</div>{tab === "Skills" ? <div className="skills-view"><SectionHead title="Skill Distribution"/><MiniBars items={skills.map(([label,value])=>({label:String(label),value:Number(value)}))}/></div> : <div className="talent-table"><div className="table-row table-head"><span>{tab === "Students" ? "Student" : "Faculty member"}</span><span>Primary focus</span><span>Availability</span><span>Strength</span></div>{(tab === "Students" ? students : faculty).map((person) => <div className="table-row" key={person.name}><b>{person.name}</b><span>{"skills" in person ? person.skills.slice(0,2).join(" · ") : person.area}</span><span>{"available" in person ? person.available : "Active project contributor"}</span><b>{"match" in person ? `${person.match}%` : "—"}</b></div>)}</div>}</section><section className="panel gaps"><SectionHead eyebrow="Future readiness" title="Skill Gaps"/><div className="gap-grid"><Gap title="Advanced Robotics" status="Shortage" text="Demand is outpacing specialized student capacity."/><Gap title="Medical AI" status="Shortage" text="Limited cross-domain mentoring availability."/><Gap title="Edge AI" status="Growing demand" text="New project demand increasing across IoT programs."/></div></section></>; }
function Gap({ title, status, text }: {title:string;status:string;text:string}) { return <div><Status tone={status === "Shortage" ? "warning" : "neutral"}>{status}</Status><h3>{title}</h3><p>{text}</p></div>; }

function Labs() { const [tab, setTab] = useState<"Laboratories" | "Equipment">("Laboratories"); const [query, setQuery] = useState(""); const list = useMemo(() => (tab === "Laboratories" ? labs : equipment).filter((item) => Object.values(item).join(" ").toLowerCase().includes(query.toLowerCase())), [tab,query]); return <><div className="page-intro"><div><div className="eyebrow">Resource directory</div><h1>Labs & Equipment</h1><p>Search representative laboratory capabilities, equipment locations and availability status.</p></div></div><section className="panel directory"><div className="directory-tools"><div className="tabs"><button className={tab === "Laboratories" ? "selected" : ""} onClick={() => setTab("Laboratories")}>Laboratories</button><button className={tab === "Equipment" ? "selected" : ""} onClick={() => setTab("Equipment")}>Equipment</button></div><label className="search"><Icon name="search" size={17}/><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={`Search ${tab.toLowerCase()}...`}/></label></div><div className="directory-table">{tab === "Laboratories" ? <><div className="table-row table-head"><span>Lab</span><span>Department</span><span>Utilization</span><span>Availability</span><span>Primary capabilities</span></div>{list.map((item) => { const lab=item as typeof labs[number]; return <div className="table-row" key={lab.id}><b>{lab.name}</b><span>{lab.department}</span><strong>{lab.utilization}%</strong><Status tone={lab.availability === "Available" ? "good" : "warning"}>{lab.availability}</Status><span>{lab.capabilities.slice(0,2).join(" · ")}</span></div>; })}</> : <><div className="table-row table-head"><span>Equipment</span><span>Category</span><span>Location</span><span>Utilization</span><span>Status</span></div>{list.map((item) => { const resource=item as typeof equipment[number]; return <div className="table-row" key={resource.id}><b>{resource.name}</b><span>{resource.category}</span><span>{resource.location}</span><strong>{resource.utilization}%</strong><Status tone={resource.status === "Ready" ? "good" : resource.status === "Booked" ? "critical" : "warning"}>{resource.status}</Status></div>; })}</>}</div>{list.length === 0 && <div className="empty"><Icon name="search"/><b>No matching resources</b><span>Try a broader resource or capability search.</span></div>}</section></>; }
