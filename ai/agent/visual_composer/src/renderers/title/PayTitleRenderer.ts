import { readTitleStyleConfig, renderConfiguredTitle, type LocalTitleRenderResult } from "./titleRendererUtils";

export class PayTitleRenderer {
  readonly key = "pay_display_title_v1";

  async render(input: { text: string; width: number; height: number; output_path: string }): Promise<LocalTitleRenderResult> {
    const config = await readTitleStyleConfig("pay-title-style-v1.json");
    return renderConfiguredTitle({ renderer_key: this.key, text: input.text, width: input.width, height: input.height, output_path: input.output_path, config, max_lines: 3 });
  }
}
