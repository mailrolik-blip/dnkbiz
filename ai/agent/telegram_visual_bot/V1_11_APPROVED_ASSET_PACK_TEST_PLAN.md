# DNK MVP 1.51 Approved Asset Pack Test Plan

## Goal

Verify that Monopoly and Monopoly Pay prefer approved production layer assets before AI or composer fallback.

## 1. Upload Pay Title PNG

Send a PNG title image with caption:

```text
asset pay title text: НОВЫЕ ТРИГГЕРЫ БАНКОВ tags: bank,trigger,3d approved: true
```

Then run:

```text
/asset_index
/asset_status pay
```

Expected:

- `title_images` count increases;
- asset meta has `type=title_image`, `text=НОВЫЕ ТРИГГЕРЫ БАНКОВ`, `approved=true`.

## 2. Upload Pay Pose PNG

Send a ded pose PNG with caption:

```text
asset pay pose pose: phone tags: ded,phone,pay approved: true
```

Then run:

```text
/asset_index
/asset_status pay
```

Expected:

- `character_poses` count increases;
- asset meta has `type=character_pose`, `pose=phone`, `approved=true`.

## 3. Generate Pay Visual

Send:

```text
сделай новую картинку для пэй новые триггеры банков
```

Expected:

- approved title PNG is used;
- `/debug_job` shows `title_asset_match exact=true` or `title_image_layer source=asset`.

## 4. Character Revision Uses Approved Pose

Press `Дед/персонаж`, then send:

```text
дед с телефоном
```

Expected:

- approved pose PNG is used;
- no AI image generation is needed;
- `/debug_job` or debug full shows `pose_asset_match ... source=approved_pose`.

## 5. Upload Monopoly Title And Pose

Examples:

```text
asset monopoly title text: ИСТОРИЯ ЗНАКОМСТВА tags: story,orange,3d approved: true
asset monopoly pose pose: phone_receipt tags: ded,phone,receipt approved: true
```

Expected:

- Monopoly generation uses approved title asset on exact title match;
- character revision can use approved pose by tags.

## 6. Local Smoke

Run:

```bash
npm run visual:asset-first-smoke
```

Expected:

- `title_source=asset`;
- `character_path` points to approved pose fixture;
- output is `1920x1080`.
