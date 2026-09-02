import type { AnalysisResult, SeverityLevel } from "@/types";

const VALID_SEVERITY: SeverityLevel[] = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];

function isSeverity(v: unknown): v is SeverityLevel {
  return typeof v === "string" && (VALID_SEVERITY as string[]).includes(v);
}

export function validateAnalysisResult(data: unknown): AnalysisResult {
  if (typeof data !== "object" || data === null) {
    throw new Error("Invalid response: expected an object");
  }

  const d = data as Record<string, unknown>;

  const peopleDetected =
    typeof d.peopleDetected === "number" ? Math.max(0, d.peopleDetected) : 0;

  const urgentPeople =
    typeof d.urgentPeople === "number"
      ? Math.min(Math.max(0, d.urgentPeople), peopleDetected)
      : 0;

  const floodSeverity: SeverityLevel = isSeverity(d.floodSeverity)
    ? d.floodSeverity
    : "MEDIUM";

  const waterCondition =
    typeof d.waterCondition === "string" && d.waterCondition.trim()
      ? d.waterCondition.trim()
      : "Conditions unclear from image";

  const rescuePriority: SeverityLevel = isSeverity(d.rescuePriority)
    ? d.rescuePriority
    : "MEDIUM";

  const hazards = Array.isArray(d.hazards)
    ? d.hazards
        .filter((h): h is Record<string, unknown> => typeof h === "object" && h !== null)
        .map((h) => ({
          name: typeof h.name === "string" ? h.name : "Unknown Hazard",
          description:
            typeof h.description === "string"
              ? h.description
              : "No description available",
          severity: isSeverity(h.severity) ? h.severity : ("MEDIUM" as SeverityLevel),
        }))
    : [];

  const recommendations = Array.isArray(d.recommendations)
    ? d.recommendations
        .filter((r): r is string => typeof r === "string")
        .map((r) => r.trim())
        .filter(Boolean)
    : [];

  const summary =
    typeof d.summary === "string" && d.summary.trim()
      ? d.summary.trim()
      : "Analysis complete.";

  const disasterType =
    typeof d.disasterType === "string" && d.disasterType.trim()
      ? d.disasterType.trim()
      : "Unknown";

  return {
    peopleDetected,
    urgentPeople,
    floodSeverity,
    waterCondition,
    rescuePriority,
    hazards,
    recommendations,
    summary,
    disasterType,
  };
}
