# Arknights Endfield Rotation Tool

Interactive web tool for building, visualizing, exporting, and sharing Arknights: Endfield team rotations.

![Endfield Rotation Tool Banner](assets/banner.png)

## Live Demo

[Open the builder](https://slowmoslothy.github.io/Arknights-Endfield-Rotation-Tool/)

## Features

- Build a team with up to 4 operators.
- Empty team slots show a `+` button so new users can start immediately.
- Drag and drop skills into a snake-style rotation layout.
- Tap-friendly mobile controls for adding, moving, and removing skills.
- Skill tooltips with cooldown, energy, type, effects, buffs, and debuffs.
- Operator buff and enemy debuff indicators on the rotation.
- Compact share codes for team + rotation setups.
- Share links with the setup embedded in the URL hash.
- Export rotation images with a builder-address watermark.
- LocalStorage auto-save for team, rotation, UI settings, and operator states.
- Optional Enemy panel controlled from `js/state/appState.js`.

## Sharing Builds

Use the sidebar buttons:

- `Copy Setup` copies a short setup code.
- `Copy Link` copies a URL that loads the team and rotation automatically.
- `Load Setup` accepts either a setup code or a full share link.

Share links use this format:

```text
https://slowmoslothy.github.io/Arknights-Endfield-Rotation-Tool/#setup=AERT2:...
```

Current share codes use the compact `AERT2:` format. Older `AERT1:` codes can still be imported.

## Exporting Images

Use `Export Rotation` to download the current rotation as a PNG.

Important: browsers block image export from direct `file://` pages when local images are drawn into a canvas. For local testing, start a small web server instead:

```bash
python -m http.server 4173
```

Then open:

```text
http://localhost:4173/index.html
```

## Configuration

Feature flags and app-level values live in:

```text
js/state/appState.js
```

Useful options:

```js
let showEnemyPanel = false;
let builderWatermarkUrl = "https://slowmoslothy.github.io/Arknights-Endfield-Rotation-Tool/";
```

Set `showEnemyPanel` to `true` to show the Enemy section again.

## Project Structure

```text
index.html
css/
  base.css
  layout.css
  team.css
  skills.css
  rotation.css
  dragdrop.css
  mobile.css
  tooltip.css
  skill-elements.css
js/
  data/
  logic/
    comboEngine.js
    dragDrop.js
    export.js
    shareCode.js
    storage.js
  state/
    appState.js
  ui/
assets/
```

## Tech Stack

- HTML
- CSS
- Vanilla JavaScript
- SortableJS
- html2canvas

## Development

Clone the repository:

```bash
git clone https://github.com/SlowMoSlothy/Arknights-Endfield-Rotation-Tool.git
cd Arknights-Endfield-Rotation-Tool
```

Run locally:

```bash
python -m http.server 4173
```

Open:

```text
http://localhost:4173/index.html
```

## Roadmap

- More operators and enemy presets.
- Better rotation analysis and validation.
- More share/import options.
- Additional UI settings.

## Credits

Fan-made tool. Not affiliated with Gryphline or Hypergryph.

## License

This project is licensed under the MIT License.
