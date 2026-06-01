import type { DailyReportTaxonomy } from "./dailyReportTypes.ts";
import { slugFromLabel, uniqueSlug } from "./dailyReportTypes.ts";

/** Canonical BairesDev-style categories and task types (source of truth for defaults and merge). */
export const CANONICAL_TAXONOMY_BY_CATEGORY: Record<string, readonly string[]> = {
  Absence: ["National Holiday"],
  Administrative: [
    "Daily Progress Report",
    "Email revision/answering",
    "Management Cross-Company Process",
    "Other - Administrative",
    "Registering hours in time Tracker tools",
    "weekly progress report",
  ],
  "Code Challenge Guideline": [
    "Applicant asked for a reschedule CC",
    "Applicant didn't show up CC",
    "BairesDev asked for a reschedule CC",
    "CC completed",
    "other CC",
  ],
  Development: [
    "Architeture definition",
    "Bug Fixing",
    "Code review",
    "Configuration",
    "DB automation",
    "DB Maintenance",
    "Debug",
    "Demo preparation",
    "Design",
    "environment setup",
    "features development",
    "graphiv design",
    "integration",
    "Library upgrade",
    "Mockups design",
    "Other - Development",
    "Peer review",
    "refactor",
    "requirements analysis",
    "Reseasrch / Analysis",
    "Research and Learning",
    "Rollback",
    "Spike",
    "Support",
    "Test Cases development",
    "UI Definition",
    "Wireframes Design",
    "Writing User Stories",
  ],
  Documentation: [
    "Diagrams drawing",
    "Documentation reading",
    "documentation review",
    "documentation writing",
    "other - documentation",
    "Research",
    "technical writing",
  ],
  "Hacker Rank": [
    "Applicant asked for a reschedule HR",
    "Applicant didn't show up HR",
    "BairesDev asked for a reschedule HR",
    "HR completed",
    "other HR",
  ],
  "Idle time": [
    "Internet issues",
    "no assigned tasks",
    "other - Idle time",
    "Partial assignment",
    "project hasn't started",
    "travel",
  ],
  "Internal process": [
    "Coding Challenges review",
    "Ohter - internal process",
    "reviewing exams",
    "staffing technical interview",
    "technical screenings",
  ],
  "meetings (client)": [
    "1:1 with client focal point",
    "all-hands meeting",
    "backlog refinement meeting",
    "blocker removal meeting",
    "client meeting",
    "client side training",
    "daily meeting",
    "kickoff meeting",
    "sprint planning",
    "sprint retrospective",
    "sprint review / demo",
  ],
  "meetings (internal)": [
    "1:1 with HRBP",
    "1:1 meeting with Manager",
    "other - Meetings (internal)",
    "team meeting",
  ],
  Other: ["Other", "Other task category"],
  "Technical interview": [
    "Applicant asked for a reschedule TI",
    "Applicant didn't show up TI",
    "BairesDev asked for a reschedule TI",
    "TI completed",
    "other TI",
  ],
  Testing: [
    "Coding",
    "Environment Configuration",
    "Exploratory",
    "Functional testing",
    "manual testing",
    "other - testing",
    "production verification",
    "regression testing",
    "smoke testing",
    "test case execution",
    "test creation/design",
    "testathon / UAT",
  ],
  "Training (trainee)": [
    "internal course",
    "online course",
    "other - training (trainee)",
    "Project onboarding (trainee)",
    "Reading documentation",
    "receiving ambassador support",
    "receiving mentoring suport",
    "self training",
  ],
  "Training (trainer)": [
    "Other - training (trainer)",
    "Providing ambassador support",
    "Providing mentoring support",
    "Project onboarding (trainer)",
  ],
};

function buildDefaultTaxonomy(): DailyReportTaxonomy {
  const categories = Object.keys(CANONICAL_TAXONOMY_BY_CATEGORY).map((label) => ({
    id: slugFromLabel(label),
    label,
  }));

  const usedTypeIds = new Set<string>();
  const taskTypes: DailyReportTaxonomy["taskTypes"] = [];

  for (const [categoryLabel, typeLabels] of Object.entries(CANONICAL_TAXONOMY_BY_CATEGORY)) {
    const categoryId = slugFromLabel(categoryLabel);
    for (const label of typeLabels) {
      const baseId = slugFromLabel(label);
      const id = uniqueSlug(baseId, usedTypeIds);
      usedTypeIds.add(id);
      taskTypes.push({ id, categoryId, label });
    }
  }

  return { version: 1, categories, taskTypes };
}

export const DEFAULT_DAILY_REPORT_TAXONOMY: DailyReportTaxonomy = buildDefaultTaxonomy();

/** Adds any canonical categories and task types missing from a saved taxonomy. */
export function mergeTaxonomyWithDefaults(saved: DailyReportTaxonomy): DailyReportTaxonomy {
  const defaults = DEFAULT_DAILY_REPORT_TAXONOMY;
  const categoryIds = new Set(saved.categories.map((c) => c.id));
  const categories = [...saved.categories];
  for (const category of defaults.categories) {
    if (!categoryIds.has(category.id)) {
      categories.push({ ...category });
      categoryIds.add(category.id);
    }
  }

  const taskTypeIds = new Set(saved.taskTypes.map((t) => t.id));
  const taskTypes = [...saved.taskTypes];
  for (const taskType of defaults.taskTypes) {
    if (!taskTypeIds.has(taskType.id)) {
      taskTypes.push({ ...taskType });
      taskTypeIds.add(taskType.id);
    }
  }

  return { version: 1, categories, taskTypes };
}
