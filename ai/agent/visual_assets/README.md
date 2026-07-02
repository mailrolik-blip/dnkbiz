# DNK Visual Asset Library

This directory is the local asset library for Visual Production Bot.

It intentionally contains only folder structure and `.gitkeep` files. Do not commit real client assets, logos, fonts, private references, or generated production images.

Recommended asset types:

- `background`
- `illustration`
- `logo`
- `reference`
- `template`
- `photo`
- `qr`
- `icon`

Use `manifest.example.json` as the shape for a real asset manifest. A production manifest can live outside git or be generated during deployment.

The composer can work without assets: missing assets are replaced with neutral placeholders and warnings.
