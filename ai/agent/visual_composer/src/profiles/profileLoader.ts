import fs from "node:fs";
import path from "node:path";
import type { ProjectProfileSnapshot, VisualProjectKey } from "../types";

const defaultProfile: ProjectProfileSnapshot = {
  project_key: "dnk",
  project_name: "DNK",
  default_mode: "post_generation",
  allowed_modes: ["post_generation"],
  text_style_rules: "Short Russian visual post copy.",
  image_style_rules: "Clean DNK visual fallback.",
  composition_rules: "Keep readable text and safe margins.",
  negative_rules: "Avoid unreadable text and random logos.",
  asset_rules: "Use safe placeholder assets when project assets are missing.",
  layout_presets: ["simple_overlay"],
  output_formats: ["1080x1080"],
  revision_commands: ["revise_text_layer", "change_composition"],
  telegram_examples: [],
  quality_check_rules: ["output file exists", "text layer not empty"],
};

export function loadProjectProfile(projectKey: VisualProjectKey): ProjectProfileSnapshot {
  if (projectKey === "dnk") return defaultProfile;
  const profilePath = path.join(
    process.cwd(),
    "ai",
    "agent",
    "ai_bot_designer",
    "profiles",
    `${projectKey}.profile.json`,
  );
  try {
    const parsed = JSON.parse(fs.readFileSync(profilePath, "utf8")) as Partial<ProjectProfileSnapshot>;
    return {
      ...defaultProfile,
      ...parsed,
      project_key: projectKey,
      layout_presets: parsed.layout_presets || defaultProfile.layout_presets,
      output_formats: parsed.output_formats || defaultProfile.output_formats,
      revision_commands: parsed.revision_commands || defaultProfile.revision_commands,
      telegram_examples: parsed.telegram_examples || [],
      quality_check_rules: parsed.quality_check_rules || defaultProfile.quality_check_rules,
    };
  } catch {
    return { ...defaultProfile, project_key: projectKey, project_name: projectKey };
  }
}
