import type { OutputFormat, VisualJob, VisualMode } from "../types";
import { resolveVisualAsset } from "../assets/assetResolver";
import type { BuildVisualJobInput, TextLayerParts, UploadedAsset } from "./types";

export function buildGorillaHockeyJob(
  input: BuildVisualJobInput,
  text: TextLayerParts,
  visualMode: VisualMode,
  warnings: string[],
): VisualJob {
  const uploadedPhoto = findUploaded(input.uploaded_assets || [], "photo");
  const format = input.output_format || (visualMode === "hockey_print_layout" ? "print_a4" : "vk_post");
  const bg = resolveVisualAsset({
    project_key: "gorilla_hockey",
    visual_mode: visualMode,
    asset_type: visualMode === "hockey_photo_template" ? "photo" : "background",
    tags: [visualMode, format],
    manifest: input.asset_manifest,
  });
  warnings.push(...bg.warnings);
  const isPrint = visualMode === "hockey_print_layout";
  const layout = chooseLayout(input, text, visualMode, format);
  const size = sizeFor(format, visualMode);

  return {
    job_type: "visual_production",
    project_key: "gorilla_hockey",
    visual_mode: visualMode,
    source_text: input.command_text,
    output_format: format,
    text_layer: {
      enabled: true,
      text: text.title,
      subtitle: text.subtitle,
      sticker: text.sticker,
      cta: text.cta,
      body: text.body,
      contacts: text.contacts,
      post_caption: text.post_caption,
      position: isPrint ? "top" : "bottom",
      locked: false,
    },
    illustration_layer: {
      enabled: !isPrint,
      asset_path: uploadedPhoto?.asset_path || bg.asset_path,
      position: "cover",
      locked: Boolean(uploadedPhoto),
    },
    background_layer: {
      enabled: true,
      asset_path: uploadedPhoto?.asset_path || bg.asset_path,
      locked: Boolean(uploadedPhoto),
    },
    layout: {
      variant: layout,
      width: size.width,
      height: size.height,
      safe_area: isPrint ? 180 : 64,
    },
    brand: {
      logo_path: "",
      qr_path: "",
      website: "gorillahockey.ru",
      contacts: text.contacts,
      colors: {
        primary: "#E3202A",
        accent: "#F6C500",
        dark: isPrint ? "#111820" : "#090D12",
        light: isPrint ? "#F7F7F2" : "#F5F7FA",
      },
    },
    profile: input.profile,
    post_caption: text.post_caption,
  };
}

function chooseLayout(input: BuildVisualJobInput, text: TextLayerParts, visualMode: VisualMode, format: OutputFormat): string {
  if (input.options?.layout_variant && input.options.layout_variant !== "auto") return input.options.layout_variant;
  if (visualMode === "hockey_photo_template") return "hockey_poster_photo_v1";
  if (visualMode === "hockey_print_layout") return format === "print_a5" ? "hockey_print_a5_v1" : "hockey_print_a4_v1";
  if (`${input.command_text} ${text.title}`.toLowerCase().includes("набор")) return "hockey_training_recruitment";
  return "hockey_poster_v1";
}

function sizeFor(format: OutputFormat, visualMode: VisualMode) {
  if (visualMode === "hockey_print_layout" && format === "print_a5") return { width: 1748, height: 2480 };
  if (visualMode === "hockey_print_layout") return { width: 2480, height: 3508 };
  if (format === "story") return { width: 1080, height: 1920 };
  if (format === "square") return { width: 1080, height: 1080 };
  return { width: 1080, height: 1350 };
}

function findUploaded(uploaded: UploadedAsset[], type: UploadedAsset["type"]) {
  return uploaded.find((asset) => asset.type === type && asset.asset_path);
}
