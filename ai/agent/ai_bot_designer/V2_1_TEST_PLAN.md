# Visual Production Bot v2.1 test plan

Run these manually after importing the workflow into n8n. Do not use production credentials for the first pass.

## A. Current flow stability

1. Text -> draft
   - Send a normal non-visual text request.
   - Expected: legacy path reaches `Message a model` and `Telegram API Draft Reply`.

2. Voice -> draft
   - Send a voice message with a non-visual task.
   - Expected: voice is transcribed, normalized, classified as non-visual, then sent to draft generation.

3. Approve -> image
   - Press `approve` on a draft.
   - Expected: `Build Final Post` -> `Final Action Type` -> `Build Image Payload` -> `OpenAI Image` -> `Send Photo`.

4. regenerate_image -> image
   - Press `regenerate_image`.
   - Expected: callback goes through `Build Image Payload`, not directly to image/send nodes.

5. revise_image -> next message -> image
   - Press `revise_image`.
   - Expected: `Save Awaiting Image Revision` writes `mode = awaiting_image_revision`.
   - Send a text revision.
   - Expected: `Text State Router` sends it to `Normalize Image Revision` -> `Build Image Payload`.

6. regenerate_text -> draft
   - Press `regenerate_text`.
   - Expected: `Build Text Revision Prompt` -> `Message a model` -> `Telegram API Draft Reply`.

7. revise_text -> next message -> draft
   - Press `revise_text`.
   - Expected: `Save Awaiting Text Revision` writes `mode = awaiting_text_revision`.
   - Send a text revision.
   - Expected: `Text State Router` sends it to `Build Text Revision Prompt`, not image revision.

## B. Visual classifier

1. Input: `сделай картинку для монополии история знакомства`
   - Expected:
     - `is_visual_request = true`
     - `project_key = monopoly`
     - `visual_mode = composer`

2. Input: `сделай картинку для pay новый способ оплаты яндекс-яндекс`
   - Expected:
     - `is_visual_request = true`
     - `project_key = monopoly_pay`
     - `visual_mode = composer`

3. Input: `сделай картинку для каспера будь на связи`
   - Expected:
     - `is_visual_request = true`
     - `project_key = casper`
     - `visual_mode = style_generation`

4. Input: `сделай хоккейную афишу набор детей на тренировку`
   - Expected:
     - `is_visual_request = true`
     - `project_key = gorilla_hockey`
     - `visual_mode = hockey_generated_poster` or `hockey_print_layout`, depending on final classifier rule preference for `афиша`.

5. Input: `используй это фото и сделай хоккейный постер` with uploaded photo
   - Expected:
     - `is_visual_request = true`
     - `project_key = gorilla_hockey`
     - `visual_mode = hockey_photo_template`

## C. State tests

1. New task should not use old `final_post`.
   - Expected: `Reset State Before New Task` clears `final_post`, `image_prompt`, `photo_file_id`.

2. `revise_text` should not go to image revision.
   - Expected: `mode = awaiting_text_revision`; next text reaches `Build Text Revision Prompt`.

3. `revise_image` should not break text flow.
   - Expected: image revision state is used only after `revise_image`.

4. `Send Photo` should not depend on `Build Final Post`.
   - Expected: caption and preview metadata read through `Build Image Payload` and `Send Photo`.

## D. Composer payload checks

1. For `monopoly` and `monopoly_pay`, inspect `Build Visual Job Payload`.
   - Expected: `visual_job.text_layer`, `visual_job.illustration_layer`, `visual_job.background_layer`, `visual_job.layout`.

2. For `casper`, inspect `image_prompt`.
   - Expected: style generation prompt based on Casper profile.

3. For hockey photo/template, inspect normalized fields.
   - Expected: `has_photo = true`, `photo_file_id` is present, `visual_mode = hockey_photo_template`.

## E. Import checks

- Workflow JSON imports into n8n.
- Existing credentials ids are still present.
- HTTP Request Telegram URLs use `{{$env.TELEGRAM_BOT_TOKEN}}`.
- Code nodes execute in the installed n8n version.
- `content_bot_state` table schema matches the workflow mappings.
