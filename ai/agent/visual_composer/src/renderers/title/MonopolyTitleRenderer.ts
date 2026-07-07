import { readTitleStyleConfig, renderConfiguredTitle, type LocalTitleRenderResult } from "./titleRendererUtils";

export class MonopolyTitleRenderer {
  readonly key = "monopoly_psd_style_v1";

  async render(input: { text: string; width: number; height: number; output_path: string }): Promise<LocalTitleRenderResult> {
    const config = await readTitleStyleConfig("monopoly-title-style-v1.json");
    return renderConfiguredTitle({ renderer_key: this.key, text: input.text, width: input.width, height: input.height, output_path: input.output_path, config, max_lines: 3 });
  }
}
