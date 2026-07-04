import sharp from "sharp";

export interface BrandTitleRenderInput {
  text: string;
  project_key: "monopoly" | "monopoly_pay" | string;
  width: number;
  height: number;
  tags?: string[];
}

export interface TitlePreprocessResult {
  buffer: Buffer;
  warnings: string[];
  metadata: {
    was_trimmed: boolean;
    was_scaled_up: boolean;
    transparent: boolean;
  };
}

export async function renderBrandTitleImage(input: BrandTitleRenderInput): Promise<Buffer> {
  const text = escapeXml(input.text.toUpperCase());
  const isPay = input.project_key === "monopoly_pay";
  const fill1 = isPay ? "#FFFFFF" : "#FFE66D";
  const fill2 = isPay ? "#9BE7FF" : "#FF9B21";
  const stroke = isPay ? "#071827" : "#23130A";
  const shadow = isPay ? "#0071FF" : "#D93913";
  const fontSize = Math.round(Math.min(input.height * 0.42, input.width / Math.max(7, input.text.length * 0.52)));
  const svg = `<svg width="${input.width}" height="${input.height}" viewBox="0 0 ${input.width} ${input.height}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="titleFill" x1="0" y1="0" x2="0" y2="1"><stop stop-color="${fill1}"/><stop offset="1" stop-color="${fill2}"/></linearGradient>
      <filter id="soft" x="-20%" y="-20%" width="140%" height="150%"><feDropShadow dx="10" dy="14" stdDeviation="2" flood-color="${shadow}" flood-opacity="0.95"/><feDropShadow dx="0" dy="7" stdDeviation="8" flood-color="#000000" flood-opacity="0.35"/></filter>
    </defs>
    <rect width="100%" height="100%" fill="none"/>
    <text x="50%" y="52%" text-anchor="middle" dominant-baseline="middle" font-family="Arial, Helvetica, sans-serif" font-size="${fontSize}" font-weight="900" letter-spacing="0" fill="url(#titleFill)" stroke="#ffffff" stroke-width="7" paint-order="stroke" filter="url(#soft)">${text}</text>
    <text x="50%" y="52%" text-anchor="middle" dominant-baseline="middle" font-family="Arial, Helvetica, sans-serif" font-size="${fontSize}" font-weight="900" letter-spacing="0" fill="url(#titleFill)" stroke="${stroke}" stroke-width="3" paint-order="stroke">${text}</text>
  </svg>`;
  return sharp(Buffer.from(svg)).png().toBuffer();
}

export async function preprocessTitleImage(input: Buffer, target: { width: number; height: number }, transparent: boolean | undefined): Promise<TitlePreprocessResult> {
  const warnings: string[] = [];
  let image = sharp(input, { failOn: "none" }).ensureAlpha();
  const before = await image.metadata();
  let wasTrimmed = false;
  try {
    image = image.trim({ threshold: 12 });
  } catch {
    warnings.push("title_image_trim_failed");
  }
  const trimmed = await image.png().toBuffer();
  const meta = await sharp(trimmed).metadata();
  wasTrimmed = Boolean(before.width && before.height && meta.width && meta.height && (meta.width < before.width || meta.height < before.height));
  if (wasTrimmed) warnings.push("title_image_trimmed");
  const wasScaledUp = Boolean(meta.width && meta.height && (meta.width < target.width * 0.65 || meta.height < target.height * 0.45));
  if (wasScaledUp) warnings.push("title_image_scaled_up");
  if (!transparent) {
    warnings.push("title_image_not_transparent");
    warnings.push("title_image_may_need_manual_review");
  }
  const buffer = await sharp(trimmed)
    .resize(target.width, target.height, { fit: "contain", withoutEnlargement: false, background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();
  return { buffer, warnings, metadata: { was_trimmed: wasTrimmed, was_scaled_up: wasScaledUp, transparent: Boolean(transparent) } };
}

function escapeXml(value: string): string {
  return value.replace(/[<>&'"]/g, (char) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" })[char] || char);
}
