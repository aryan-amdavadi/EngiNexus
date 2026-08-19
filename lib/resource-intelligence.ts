import { ResourceEntityType, type ResourceStatus } from "@prisma/client";

import { prisma } from "./prisma";

type UtilizationRecord = {
  id: string;
  resourceType: ResourceEntityType;
  resourceId: string;
  resourceName: string;
  period: string;
  date: string;
  utilization: number;
  capacity: number;
  demand: number;
  status: ResourceStatus;
};

type ForecastPoint = {
  period: string;
  demand: number;
};

type ResourceForecastEntry = {
  resourceType: ResourceEntityType;
  resourceId: string;
  resourceName: string;
  capacity: number;
  currentDemand: number;
  projectedDemand: number;
  demandGap: number;
  utilization: number;
  status: ResourceStatus;
  history: ForecastPoint[];
  projection: {
    nextMonth: number;
    nextSemester: number;
  };
  recommendation: string;
};

function clamp(value: number, min = 0, max = 100) {
  return Math.min(max, Math.max(min, value));
}

function round1(value: number) {
  return Number(value.toFixed(1));
}

function movingAverage(values: number[], windowSize = 3): number {
  if (values.length === 0) return 0;
  const slice = values.slice(-windowSize);
  return slice.reduce((sum, item) => sum + item, 0) / slice.length;
}

function linearRegressionProjection(values: number[]): number {
  if (values.length === 0) return 0;
  if (values.length === 1) return values[0];

  const xValues = values.map((_, index) => index + 1);
  const xMean = xValues.reduce((sum, value) => sum + value, 0) / xValues.length;
  const yMean = values.reduce((sum, value) => sum + value, 0) / values.length;

  let numerator = 0;
  let denominator = 0;

  for (let index = 0; index < values.length; index += 1) {
    numerator += (xValues[index] - xMean) * (values[index] - yMean);
    denominator += (xValues[index] - xMean) ** 2;
  }

  const slope = denominator === 0 ? 0 : numerator / denominator;
  const intercept = yMean - slope * xMean;
  const nextX = xValues.length + 1;
  return intercept + slope * nextX;
}

function deriveRecommendation(resourceName: string, risk: string, demandGap: number) {
  if (resourceName.toLowerCase().includes("gpu")) {
    return demandGap > 0 ? "Add GPU capacity." : "Reserve specialized equipment.";
  }

  if (resourceName.toLowerCase().includes("lab")) {
    return risk === "CRITICAL" || risk === "HIGH"
      ? "Open additional lab slots."
      : "Redistribute compatible projects.";
  }

  return demandGap > 0 ? "Reserve specialized equipment." : "Redistribute compatible projects.";
}

function evaluateRisk(utilization: number, demand: number, capacity: number, projectedDemand: number) {
  if (capacity <= 0) return "HIGH";
  if (utilization >= 95 || demand > capacity || projectedDemand - capacity >= 2.5) return "CRITICAL";
  if (utilization >= 85 || projectedDemand > capacity) return "HIGH";
  if (utilization >= 70 || projectedDemand >= capacity * 0.9) return "MEDIUM";
  return "LOW";
}

async function getLatestAvailabilityMap() {
  const availability = await prisma.resourceAvailability.findMany();
  return new Map(availability.map((item) => [`${item.resourceType}:${item.resourceId}`, item]));
}

function toUtilizationRecord(record: {
  id: string;
  resourceType: ResourceEntityType;
  resourceId: string;
  resourceName: string;
  period: string;
  utilizationRate: number;
  capacity: number;
  demand: number;
  status: ResourceStatus;
  loggedAt: Date;
}): UtilizationRecord {
  return {
    id: record.id,
    resourceType: record.resourceType,
    resourceId: record.resourceId,
    resourceName: record.resourceName,
    period: record.period,
    date: record.loggedAt.toISOString(),
    utilization: record.utilizationRate,
    capacity: record.capacity,
    demand: round1(record.demand),
    status: record.status,
  };
}

function buildForecastFromHistory(
  history: UtilizationRecord[],
  resourceName: string,
  fallbackCapacity: number,
): ResourceForecastEntry | null {
  if (history.length === 0) return null;

  const latest = history[history.length - 1];
  const capacity = latest.capacity > 0 ? latest.capacity : fallbackCapacity;
  const demandSeries = history.map((item) => item.demand);
  const moving = movingAverage(demandSeries);
  const trend = linearRegressionProjection(demandSeries);
  const projectedDemand = round1(Math.max(latest.demand, moving * 0.6 + trend * 0.4));
  const nextMonth = round1((latest.demand + projectedDemand) / 2);
  const nextSemester = projectedDemand;
  const demandGap = round1(projectedDemand - capacity);
  const risk = evaluateRisk(latest.utilization, latest.demand, capacity, projectedDemand);

  return {
    resourceType: latest.resourceType,
    resourceId: latest.resourceId,
    resourceName: latest.resourceName,
    capacity,
    currentDemand: round1(latest.demand),
    projectedDemand,
    demandGap,
    utilization: latest.utilization,
    status: latest.status,
    history: history.map((entry) => ({
      period: entry.period,
      demand: round1(entry.demand),
    })),
    projection: {
      nextMonth,
      nextSemester,
    },
    recommendation: deriveRecommendation(resourceName, risk, demandGap),
  };
}

export async function getResourceUtilizationData() {
  const [records, availabilityMap] = await Promise.all([
    prisma.resourceUtilization.findMany({
      orderBy: [{ resourceName: "asc" }, { loggedAt: "asc" }],
    }),
    getLatestAvailabilityMap(),
  ]);

  const normalized = records.map((entry) => {
    const key = `${entry.resourceType}:${entry.resourceId}`;
    const availability = availabilityMap.get(key);
    const resolvedCapacity = entry.capacity > 0 ? entry.capacity : (availability?.availableUnits ?? 0);
    const resolvedDemand = entry.demand > 0 ? entry.demand : round1((entry.utilizationRate / 100) * resolvedCapacity);

    return toUtilizationRecord({
      ...entry,
      capacity: resolvedCapacity,
      demand: resolvedDemand,
    });
  });

  const latestByResource = new Map<string, UtilizationRecord>();
  for (const record of normalized) {
    latestByResource.set(`${record.resourceType}:${record.resourceId}`, record);
  }

  const latest = Array.from(latestByResource.values());
  const laboratory = latest.filter((item) => item.resourceType === ResourceEntityType.LABORATORY);
  const equipment = latest.filter((item) => item.resourceType === ResourceEntityType.EQUIPMENT);
  const highDemandCount = latest.filter((item) => item.utilization >= 80).length;
  const attentionCount = latest.filter((item) => item.demand > item.capacity || item.status !== "AVAILABLE").length;

  return {
    records: normalized,
    latest,
    laboratory,
    equipment,
    summary: {
      laboratoriesMonitored: laboratory.length,
      equipmentMonitored: equipment.length,
      highDemandCount,
      attentionCount,
    },
  };
}

export async function detectResourceBottlenecks(threshold = 80) {
  const utilization = await getResourceUtilizationData();
  const grouped = new Map<string, UtilizationRecord[]>();

  for (const entry of utilization.records) {
    const key = `${entry.resourceType}:${entry.resourceId}`;
    const list = grouped.get(key) ?? [];
    list.push(entry);
    grouped.set(key, list);
  }

  const bottlenecks = [] as Array<{
    resource: string;
    risk: string;
    currentUtilization: number;
    capacity: number;
    demand: number;
    projectedDemand: number;
    recommendation: string;
  }>;

  for (const [key, history] of grouped) {
    history.sort((left, right) => left.date.localeCompare(right.date));
    const latest = history[history.length - 1];
    const forecast = buildForecastFromHistory(history, latest.resourceName, latest.capacity);
    if (!forecast) continue;

    const risk = evaluateRisk(
      latest.utilization,
      latest.demand,
      forecast.capacity,
      forecast.projectedDemand,
    );

    const isBottleneck =
      latest.utilization > threshold ||
      latest.demand > forecast.capacity ||
      forecast.projectedDemand > forecast.capacity ||
      latest.status === "LIMITED" ||
      latest.status === "UNAVAILABLE" ||
      latest.status === "NEAR_CAPACITY";

    if (!isBottleneck) continue;

    bottlenecks.push({
      resource: latest.resourceName,
      risk,
      currentUtilization: latest.utilization,
      capacity: forecast.capacity,
      demand: round1(latest.demand),
      projectedDemand: forecast.projectedDemand,
      recommendation: deriveRecommendation(latest.resourceName, risk, forecast.demandGap),
    });
  }

  return bottlenecks.sort((left, right) => {
    const order = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
    return order[right.risk as keyof typeof order] - order[left.risk as keyof typeof order];
  });
}

export async function getResourceForecast(focusResourceName = "GPU Workstations") {
  const utilization = await getResourceUtilizationData();
  const grouped = new Map<string, UtilizationRecord[]>();

  for (const entry of utilization.records) {
    const key = `${entry.resourceType}:${entry.resourceId}`;
    const list = grouped.get(key) ?? [];
    list.push(entry);
    grouped.set(key, list);
  }

  const forecasts: ResourceForecastEntry[] = [];
  for (const history of grouped.values()) {
    history.sort((left, right) => left.date.localeCompare(right.date));
    const built = buildForecastFromHistory(history, history[history.length - 1].resourceName, history[history.length - 1].capacity);
    if (built) forecasts.push(built);
  }

  forecasts.sort((left, right) => right.demandGap - left.demandGap);

  const focus =
    forecasts.find((entry) => entry.resourceName.toLowerCase() === focusResourceName.toLowerCase()) ??
    forecasts[0] ??
    null;

  return {
    focus,
    forecasts,
    summary: utilization.summary,
    generatedAt: new Date().toISOString(),
  };
}

export function mapRiskToTone(risk: string): "critical" | "warning" | "neutral" {
  if (risk === "CRITICAL") return "critical";
  if (risk === "HIGH" || risk === "MEDIUM") return "warning";
  return "neutral";
}

export function mapStatusToAvailability(status: ResourceStatus): "Available" | "Limited" | "Near capacity" {
  if (status === "AVAILABLE") return "Available";
  if (status === "NEAR_CAPACITY") return "Near capacity";
  return "Limited";
}

export function utilizationToPercent(value: number) {
  return clamp(Math.round(value), 0, 100);
}
