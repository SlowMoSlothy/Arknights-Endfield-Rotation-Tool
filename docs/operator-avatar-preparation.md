# Regular operator avatar preparation — 2026-11-25

The 35 remaining regular operator portraits were prepared with the built-in `image_gen` tool in edit mode. These are AI-assisted derivatives of the existing game portraits, retaining each source's illustration or 3D-render style and character identity. Original PNGs remain unchanged in `endfield/assets/operators/avatars/`; the final 1254 × 1254 RGBA files are saved in its `refined/` subdirectory. Mimino and the upcoming teaser portraits retain their already reviewed assets.

The current user requirement takes precedence over the older head-only prompts: every new portrait is a connected head/neck/collar/shoulder bust extending through the lower image edge. Transparent padding below a detached head is not allowed. Surrounding backgrounds are transparent, with no gray scene rectangles.

The user's subsequent framing request is a close-up of the face, using Kay as the reference. Catalog cards, related cards and profiles now enlarge most of these assets to 1.9×, with individual origins and scale adjustments for angled or wide faces. Kay keeps its reviewed 1.1× crop. The connected shoulder area remains behind the frame, preventing a floating head or a gap beneath the neck. This is a CSS framing change; no source artwork or prepared PNG is regenerated.

The Rotation Tool shares these same crop values in team selection, team slots, gallery, loadout, mobile summaries and timeline portraits. Direct images are scaled and clipped back to their original visible box, preserving card sizes and surrounding controls. Desktop skill headers have a 152px portrait area so the full face remains large within their wide shape; their backgrounds use the visible height for the crop. The PNG export uses overflow-hidden wrappers. Legacy large skill-image paths are upgraded only when they identify one of the known operator avatars, leaving small skill glyphs intact.

Team-selection portraits additionally use element-colored animated rims in `operatorAvatarFrames.css`: embers for Heat, icy glints for Cryo, an arc for Electric, a drifting leaf for Nature and a silver sweep for Physical. A dedicated image viewport preserves the established face crop while decorative layers sit outside it. Names, badges and selection handlers remain on the card. Selected cards pause their effects, and reduced-motion preferences disable the animations.

`endfield/js/data/operatorPortraits.js` supplies the shared display-only mapping to the classic-script planner and the static page generator. Database rows, canonical operator identities, profile addresses and engagement counters are unchanged. `tools/build-operator-pages.js` adds content hashes to the generated image URLs; `endfield/css/operatorPortraits.css` anchors the busts within their existing frames.

The original game avatar for each name is the only image-generation input. No character features are copied from Mimino or another operator. Per-asset prompts follow below. Generated-file paths identify the selected tool outputs; final project assets are all inside the repository.

## Perlica

Original: `endfield/assets/operators/avatars/Perlica.png`
Final: `endfield/assets/operators/avatars/refined/Perlica.png`

Exact prompt:

Use case: background-extraction and faithful portrait enhancement. Edit target: Perlica, the character in the supplied game portrait. Create ONE high-resolution square RGBA avatar for a game character database. Remove the flat gray game background and all background lines, keeping the exact character rendering, identity, face proportions, neutral expression, blue eyes, gray-beige hair, furry ears, silver ear ornament, clothing and lighting. Preserve the existing polished 3D anime game-render style; do not redraw into 2D art and do not redesign. Improve edge clarity and visible detail while remaining faithful. Composition: a close-up HEAD-AND-SHOULDERS BUST with a large readable face, centered horizontally. Keep both eyes, mouth and chin fully visible. Face width about 46-50% of the square width, eyes around 48-53% of canvas height. Hair and ear tips may be naturally clipped by the top or side edges as in a close crop. Crucially retain the attached neck, collar and visible shoulders/upper chest, extending them all the way THROUGH THE BOTTOM EDGE of the square. The silhouette must touch the bottom across a wide connected area: absolutely NO floating or detached head, NO transparent gap below the neck, NO severed neck, NO isolated head on padding. A natural cropped photographic bust, with little torso visible. Use genuine transparency only around the upper and side silhouette. Clean fine hair edges, no gray halo, no white fringe, no sharpening artifacts, no background, no text, no watermark, no frame, no props. Keep the complete face undistorted. Output only this one transparent square bust avatar.

## Zhuang

Original: `endfield/assets/operators/avatars/Zhuang.png`
Final: `endfield/assets/operators/avatars/refined/Zhuang.png`

Exact prompt:

Use case: background-extraction and faithful portrait enhancement. Edit target: Zhuang, the character in the supplied game portrait. Create ONE high-resolution square RGBA avatar for a game character database. Remove the flat gray game background and its lines while keeping the exact character rendering, identity, face proportions, gentle closed-mouth smile, amber-green eyes, dark green hair with red side streaks, pointed ears, red horns and metal hair ornaments, ornate black-gold neckline and pale costume. Preserve the existing polished 3D anime game-render style, original lighting and original facial angle; do not redraw into 2D art or redesign. Improve edge clarity and visible detail faithfully. Composition: close-up HEAD-AND-SHOULDERS BUST with a large readable face, centered horizontally. Both eyes, mouth, chin fully visible. Face width about 46-50% of square width, eyes around 48-53% of canvas height. Hair/horn tips may be naturally clipped by top/side edges as in a close crop. Retain the ATTACHED neck, ornate collar and visible shoulders/upper chest extending all the way THROUGH THE BOTTOM EDGE. The connected bust silhouette must touch the bottom across a wide area: absolutely NO floating or detached head, NO transparent gap below the neck, NO isolated head on padding, NO severed neck. A natural tightly cropped bust with little torso. Remove the partly visible dark fan/weapon at lower left; preserve only character and costume. Genuine transparency around upper and side silhouette only. Clean fine hair edges, no gray halos, no white fringe, no blur or sharpening artifacts, no background, no text, no watermark, no frame, no new props. Output only one transparent square bust avatar.


---

## Avatar batch A — 2026-11-25

Mode: built-in image_gen edit; original sources preserved. All 11 outputs visually checked: original 3D game-render style and identity retained; transparent surroundings; natural connected collars/shoulders continue through lower image edge. No variants discarded or extra pixel edits performed.

### Akekuri

Original: endfield/assets/operators/avatars/Akekuri.png
Final: endfield/assets/operators/avatars/refined/Akekuri.png
Generated original: C:\Users\User\.codex\generated_images\01a2144b-2c4e-7352-a2b7-fdc67df082c3\exec-a45a640b-61bf-4b1e-bebc-3cc76ffcb8c0.png

Exact prompt:

Edit target: the provided original Akekuri avatar only. Use case: background-extraction and identity-preserve. Edit the single provided ORIGINAL game avatar into one high-resolution SQUARE transparent RGBA avatar asset, 1024x1024 or higher. Preserve this exact character's identity, original face proportions, facial angle and expression, iris color, hairstyle and ornaments, ears, clothing, material texture, lighting and ORIGINAL 3D game-render visual style. Do not turn the 3D render into a flat anime drawing, do not redesign or beautify the character. Remove only the grey scene/background; clean and faithfully enhance fine details and anti-aliased edges without halos or invented features. Composition: large readable head, face about 46-50% of the square width, eyes at about 48-53% of image height. Keep the head naturally attached through the neck and original collar to a small shoulder/chest crop, with broad connected original clothing continuing THROUGH THE BOTTOM EDGE OF THE CANVAS. This must be a natural bust portrait, NEVER a floating detached head, NEVER transparent empty space beneath the neck or collar. Show little torso. The upper hair/ear tips may be lightly cropped as in the original. Transparent areas at the sides only; true transparent background, no grey/white rectangle, no backdrop, shadow panel, frame, text, watermark, hands, weapons or extra props. Output only this one character's clean coherent bust cutout.

### Antal

Original: endfield/assets/operators/avatars/Antal.png
Final: endfield/assets/operators/avatars/refined/Antal.png
Generated original: C:\Users\User\.codex\generated_images\01a2144b-2c4e-7352-a2b7-fdc67df082c3\exec-fc18bd03-4061-4f1e-af56-568881a627c4.png

Exact prompt:

Edit target: the provided original Antal avatar only. Use case: background-extraction and identity-preserve. Edit the single provided ORIGINAL game avatar into one high-resolution SQUARE transparent RGBA avatar asset, 1024x1024 or higher. Preserve this exact character's identity, original face proportions, facial angle and expression, iris color, hairstyle and ornaments, ears, clothing, material texture, lighting and ORIGINAL 3D game-render visual style. Do not turn the 3D render into a flat anime drawing, do not redesign or beautify the character. Remove only the grey scene/background; clean and faithfully enhance fine details and anti-aliased edges without halos or invented features. Composition: large readable head, face about 46-50% of the square width, eyes at about 48-53% of image height. Keep the head naturally attached through the neck and original collar to a small shoulder/chest crop, with broad connected original clothing continuing THROUGH THE BOTTOM EDGE OF THE CANVAS. This must be a natural bust portrait, NEVER a floating detached head, NEVER transparent empty space beneath the neck or collar. Show little torso. The upper hair/ear tips may be lightly cropped as in the original. Transparent areas at the sides only; true transparent background, no grey/white rectangle, no backdrop, shadow panel, frame, text, watermark, hands, weapons or extra props. Output only this one character's clean coherent bust cutout.

### Alesh

Original: endfield/assets/operators/avatars/Alesh.png
Final: endfield/assets/operators/avatars/refined/Alesh.png
Generated original: C:\Users\User\.codex\generated_images\01a2144b-2c4e-7352-a2b7-fdc67df082c3\exec-4e9d19a4-dbde-4de1-a66d-2054c5bf2c81.png

Exact prompt:

Edit target: the provided original Alesh avatar only. Use case: background-extraction and identity-preserve. Edit the single provided ORIGINAL game avatar into one high-resolution SQUARE transparent RGBA avatar asset, 1024x1024 or higher. Preserve this exact character's identity, original face proportions, facial angle and expression, iris color, hairstyle and ornaments, ears, clothing, material texture, lighting and ORIGINAL 3D game-render visual style. Do not turn the 3D render into a flat anime drawing, do not redesign or beautify the character. Remove only the grey scene/background; clean and faithfully enhance fine details and anti-aliased edges without halos or invented features. Composition: large readable head, face about 46-50% of the square width, eyes at about 48-53% of image height. Keep the head naturally attached through the neck and original collar to a small shoulder/chest crop, with broad connected original clothing continuing THROUGH THE BOTTOM EDGE OF THE CANVAS. This must be a natural bust portrait, NEVER a floating detached head, NEVER transparent empty space beneath the neck or collar. Show little torso. The upper hair/ear tips may be lightly cropped as in the original. Transparent areas at the sides only; true transparent background, no grey/white rectangle, no backdrop, shadow panel, frame, text, watermark, hands, weapons or extra props. Output only this one character's clean coherent bust cutout.

### Arclight

Original: endfield/assets/operators/avatars/Arclight.png
Final: endfield/assets/operators/avatars/refined/Arclight.png
Generated original: C:\Users\User\.codex\generated_images\01a2144b-2c4e-7352-a2b7-fdc67df082c3\exec-1d051196-5927-4314-8ee0-b1ccfe2b1681.png

Exact prompt:

Edit target: the provided original Arclight avatar only. Use case: background-extraction and identity-preserve. Edit the single provided ORIGINAL game avatar into one high-resolution SQUARE transparent RGBA avatar asset, 1024x1024 or higher. Preserve this exact character's identity, original face proportions, facial angle and expression, iris color, hairstyle and ornaments, ears, clothing, material texture, lighting and ORIGINAL 3D game-render visual style. Do not turn the 3D render into a flat anime drawing, do not redesign or beautify the character. Remove only the grey scene/background; clean and faithfully enhance fine details and anti-aliased edges without halos or invented features. Composition: large readable head, face about 46-50% of the square width, eyes at about 48-53% of image height. Keep the head naturally attached through the neck and original collar to a small shoulder/chest crop, with broad connected original clothing continuing THROUGH THE BOTTOM EDGE OF THE CANVAS. This must be a natural bust portrait, NEVER a floating detached head, NEVER transparent empty space beneath the neck or collar. Show little torso. The upper hair/ear tips may be lightly cropped as in the original. Transparent areas at the sides only; true transparent background, no grey/white rectangle, no backdrop, shadow panel, frame, text, watermark, hands, weapons or extra props. Output only this one character's clean coherent bust cutout.

### Arcane

Original: endfield/assets/operators/avatars/Arcane.png
Final: endfield/assets/operators/avatars/refined/Arcane.png
Generated original: C:\Users\User\.codex\generated_images\01a2144b-2c4e-7352-a2b7-fdc67df082c3\exec-87228305-9daf-4be4-bb24-1a650926afe5.png

Exact prompt:

Edit target: the provided original Arcane avatar only. Use case: background-extraction and identity-preserve. Edit the single provided ORIGINAL game avatar into one high-resolution SQUARE transparent RGBA avatar asset, 1024x1024 or higher. Preserve this exact character's identity, original face proportions, facial angle and expression, iris color, hairstyle and ornaments, ears, clothing, material texture, lighting and ORIGINAL 3D game-render visual style. Do not turn the 3D render into a flat anime drawing, do not redesign or beautify the character. Remove only the grey scene/background; clean and faithfully enhance fine details and anti-aliased edges without halos or invented features. Composition: large readable head, face about 46-50% of the square width, eyes at about 48-53% of image height. Keep the head naturally attached through the neck and original collar to a small shoulder/chest crop, with broad connected original clothing continuing THROUGH THE BOTTOM EDGE OF THE CANVAS. This must be a natural bust portrait, NEVER a floating detached head, NEVER transparent empty space beneath the neck or collar. Show little torso. The upper hair/ear tips may be lightly cropped as in the original. Transparent areas at the sides only; true transparent background, no grey/white rectangle, no backdrop, shadow panel, frame, text, watermark, hands, weapons or extra props. Output only this one character's clean coherent bust cutout.

### Ardelia

Original: endfield/assets/operators/avatars/Ardelia.png
Final: endfield/assets/operators/avatars/refined/Ardelia.png
Generated original: C:\Users\User\.codex\generated_images\01a2144b-2c4e-7352-a2b7-fdc67df082c3\exec-119ca167-5144-4c9e-937b-e1dbc871af92.png

Exact prompt:

Edit target: the provided original Ardelia avatar only. Use case: background-extraction and identity-preserve. Edit the single provided ORIGINAL game avatar into one high-resolution SQUARE transparent RGBA avatar asset, 1024x1024 or higher. Preserve this exact character's identity, original face proportions, facial angle and expression, iris color, hairstyle and ornaments, ears, clothing, material texture, lighting and ORIGINAL 3D game-render visual style. Do not turn the 3D render into a flat anime drawing, do not redesign or beautify the character. Remove only the grey scene/background; clean and faithfully enhance fine details and anti-aliased edges without halos or invented features. Composition: large readable head, face about 46-50% of the square width, eyes at about 48-53% of image height. Keep the head naturally attached through the neck and original collar to a small shoulder/chest crop, with broad connected original clothing continuing THROUGH THE BOTTOM EDGE OF THE CANVAS. This must be a natural bust portrait, NEVER a floating detached head, NEVER transparent empty space beneath the neck or collar. Show little torso. The upper hair/ear tips may be lightly cropped as in the original. Transparent areas at the sides only; true transparent background, no grey/white rectangle, no backdrop, shadow panel, frame, text, watermark, hands, weapons or extra props. Output only this one character's clean coherent bust cutout.

### Avywenna

Original: endfield/assets/operators/avatars/Avywenna.png
Final: endfield/assets/operators/avatars/refined/Avywenna.png
Generated original: C:\Users\User\.codex\generated_images\01a2144b-2c4e-7352-a2b7-fdc67df082c3\exec-ae1b0b37-7fac-4036-bd81-258d3e375792.png

Exact prompt:

Edit target: the provided original Avywenna avatar only. Use case: background-extraction and identity-preserve. Edit the single provided ORIGINAL game avatar into one high-resolution SQUARE transparent RGBA avatar asset, 1024x1024 or higher. Preserve this exact character's identity, original face proportions, facial angle and expression, iris color, hairstyle and ornaments, ears, clothing, material texture, lighting and ORIGINAL 3D game-render visual style. Do not turn the 3D render into a flat anime drawing, do not redesign or beautify the character. Remove only the grey scene/background; clean and faithfully enhance fine details and anti-aliased edges without halos or invented features. Composition: large readable head, face about 46-50% of the square width, eyes at about 48-53% of image height. Keep the head naturally attached through the neck and original collar to a small shoulder/chest crop, with broad connected original clothing continuing THROUGH THE BOTTOM EDGE OF THE CANVAS. This must be a natural bust portrait, NEVER a floating detached head, NEVER transparent empty space beneath the neck or collar. Show little torso. The upper hair/ear tips may be lightly cropped as in the original. Transparent areas at the sides only; true transparent background, no grey/white rectangle, no backdrop, shadow panel, frame, text, watermark, hands, weapons or extra props. Output only this one character's clean coherent bust cutout.

### Camille

Original: endfield/assets/operators/avatars/Camille.png
Final: endfield/assets/operators/avatars/refined/Camille.png
Generated original: C:\Users\User\.codex\generated_images\01a2144b-2c4e-7352-a2b7-fdc67df082c3\exec-18dfd2cd-0c27-4a8f-9b11-3b57c756d334.png

Exact prompt:

Edit target: the provided original Camille avatar only. Use case: background-extraction and identity-preserve. Edit the single provided ORIGINAL game avatar into one high-resolution SQUARE transparent RGBA avatar asset, 1024x1024 or higher. Preserve this exact character's identity, original face proportions, facial angle and expression, iris color, hairstyle and ornaments, ears, clothing, material texture, lighting and ORIGINAL 3D game-render visual style. Do not turn the 3D render into a flat anime drawing, do not redesign or beautify the character. Remove only the grey scene/background; clean and faithfully enhance fine details and anti-aliased edges without halos or invented features. Composition: large readable head, face about 46-50% of the square width, eyes at about 48-53% of image height. Keep the head naturally attached through the neck and original collar to a small shoulder/chest crop, with broad connected original clothing continuing THROUGH THE BOTTOM EDGE OF THE CANVAS. This must be a natural bust portrait, NEVER a floating detached head, NEVER transparent empty space beneath the neck or collar. Show little torso. The upper hair/ear tips may be lightly cropped as in the original. Transparent areas at the sides only; true transparent background, no grey/white rectangle, no backdrop, shadow panel, frame, text, watermark, hands, weapons or extra props. Output only this one character's clean coherent bust cutout.

### Catcher

Original: endfield/assets/operators/avatars/Catcher.png
Final: endfield/assets/operators/avatars/refined/Catcher.png
Generated original: C:\Users\User\.codex\generated_images\01a2144b-2c4e-7352-a2b7-fdc67df082c3\exec-751e9598-b0b6-44fb-b805-28b70b1cccc4.png

Exact prompt:

Edit target: the provided original Catcher avatar only. Use case: background-extraction and identity-preserve. Edit the single provided ORIGINAL game avatar into one high-resolution SQUARE transparent RGBA avatar asset, 1024x1024 or higher. Preserve this exact character's identity, original face proportions, facial angle and expression, iris color, hairstyle and ornaments, ears, clothing, material texture, lighting and ORIGINAL 3D game-render visual style. Do not turn the 3D render into a flat anime drawing, do not redesign or beautify the character. Remove only the grey scene/background; clean and faithfully enhance fine details and anti-aliased edges without halos or invented features. Composition: large readable head, face about 46-50% of the square width, eyes at about 48-53% of image height. Keep the head naturally attached through the neck and original collar to a small shoulder/chest crop, with broad connected original clothing continuing THROUGH THE BOTTOM EDGE OF THE CANVAS. This must be a natural bust portrait, NEVER a floating detached head, NEVER transparent empty space beneath the neck or collar. Show little torso. The upper hair/ear tips may be lightly cropped as in the original. Transparent areas at the sides only; true transparent background, no grey/white rectangle, no backdrop, shadow panel, frame, text, watermark, hands, weapons or extra props. Output only this one character's clean coherent bust cutout.

### Dapan

Original: endfield/assets/operators/avatars/Dapan.png
Final: endfield/assets/operators/avatars/refined/Dapan.png
Generated original: C:\Users\User\.codex\generated_images\01a2144b-2c4e-7352-a2b7-fdc67df082c3\exec-e42cb93d-7cd1-41b7-a343-cdd6b08f887d.png

Exact prompt:

Edit target: the provided original Dapan avatar only. Use case: background-extraction and identity-preserve. Edit the single provided ORIGINAL game avatar into one high-resolution SQUARE transparent RGBA avatar asset, 1024x1024 or higher. Preserve this exact character's identity, original face proportions, facial angle and expression, iris color, hairstyle and ornaments, ears, clothing, material texture, lighting and ORIGINAL 3D game-render visual style. Do not turn the 3D render into a flat anime drawing, do not redesign or beautify the character. Remove only the grey scene/background; clean and faithfully enhance fine details and anti-aliased edges without halos or invented features. Composition: large readable head, face about 46-50% of the square width, eyes at about 48-53% of image height. Keep the head naturally attached through the neck and original collar to a small shoulder/chest crop, with broad connected original clothing continuing THROUGH THE BOTTOM EDGE OF THE CANVAS. This must be a natural bust portrait, NEVER a floating detached head, NEVER transparent empty space beneath the neck or collar. Show little torso. The upper hair/ear tips may be lightly cropped as in the original. Transparent areas at the sides only; true transparent background, no grey/white rectangle, no backdrop, shadow panel, frame, text, watermark, hands, weapons or extra props. Output only this one character's clean coherent bust cutout.

### Chen

Original: endfield/assets/operators/avatars/Chen.png
Final: endfield/assets/operators/avatars/refined/Chen.png
Generated original: C:\Users\User\.codex\generated_images\01a2144b-2c4e-7352-a2b7-fdc67df082c3\exec-eaaefdc0-ae2b-48fd-a106-196c5d9c0a79.png

Exact prompt:

Edit target: the provided original Chen avatar only. Use case: background-extraction and identity-preserve. Edit the single provided ORIGINAL game avatar into one high-resolution SQUARE transparent RGBA avatar asset, 1024x1024 or higher. Preserve this exact character's identity, original face proportions, facial angle and expression, iris color, hairstyle and ornaments, ears, clothing, material texture, lighting and ORIGINAL 3D game-render visual style. Do not turn the 3D render into a flat anime drawing, do not redesign or beautify the character. Remove only the grey scene/background; clean and faithfully enhance fine details and anti-aliased edges without halos or invented features. Composition: large readable head, face about 46-50% of the square width, eyes at about 48-53% of image height. Keep the head naturally attached through the neck and original collar to a small shoulder/chest crop, with broad connected original clothing continuing THROUGH THE BOTTOM EDGE OF THE CANVAS. This must be a natural bust portrait, NEVER a floating detached head, NEVER transparent empty space beneath the neck or collar. Show little torso. The upper hair/ear tips may be lightly cropped as in the original. Transparent areas at the sides only; true transparent background, no grey/white rectangle, no backdrop, shadow panel, frame, text, watermark, hands, weapons or extra props. Output only this one character's clean coherent bust cutout.



---

## Regular operator avatar refinement — batch B

Built-in `image_gen` edits, one call per avatar, original local PNG inspected first. No CLI fallback. Outputs visually inspected: original 3D character design retained, transparent background, connected head/neck/collar/shoulders crossing bottom edge; no floating heads. Original images preserved. All eleven accepted on first generation.

Technical QA (read-only System.Drawing inspection): all outputs are 1254 × 1254, Format32bppArgb. Top-left and top-right corner alpha are zero for every output. Bottom-center alpha ranges from 251 to 253; 81.7–100% of each bottom row has alpha above 240, confirming a broad connected chest/shoulder crop rather than an empty gap below the neck.

### Ember

- Edit target: `endfield/assets/operators/avatars/Ember.png`
- Generated file: `C:\Users\User\.codex\generated_images\01a2144b-53f7-70c3-940c-8429c427fb4a\exec-6eab7fdd-9e26-403c-9958-3ce704b171c2.png`
- Selected project output: `endfield/assets/operators/avatars/refined/Ember.png`
- Transparent background: `true`
- Visual QA: accepted; original identity/style retained, face legible, gray backdrop removed, body connected to bottom crop.

Exact prompt:

```text
Use case: background-extraction, identity-preserve.
Asset type: polished square operator avatar for a game character database.
Input image 1 is the EDIT TARGET. Retain this exact character and faithful original 3D game-render style, original head orientation, face shape, facial expression, eye color, hairstyle, hair color, ears, ornaments, clothing and materials. Improve clarity and upscale faithfully, with clean natural antialiased hair edges. Remove only the gray backdrop; produce genuine transparent RGBA, not a checkerboard painted into the image.
Composition: tight natural head-and-shoulders crop, square high-resolution canvas. Large clearly recognizable face about 46–50% of image width; eyes about 48–53% of canvas height. Hair or ear tips may lightly clip the top or side edges. IMPORTANT: NO FLOATING HEAD. Keep the head physically joined to the neck, collar and both shoulders; the original clothed upper chest and shoulders must continue THROUGH the BOTTOM EDGE as a broad connected opaque body area. No transparent gap below the neck, no detached head cutout, no rounded isolated bust silhouette with empty margin beneath it. Show little torso, mostly the large face; lower edge is a natural chest crop.
Do not repaint into 2D anime or change identity, costume design or colors. No new props, hands, weapons, background, text, watermark, border or frame.
Character-specific invariants: Ember, long deep-red hair with a dark blue streak, yellow irises with purple upper shading, stern neutral mouth, dark armored collar with silver knot-like brooch, black and silver spiked head ornament. Preserve all faithfully.
```

### Endmin

- Edit target: `endfield/assets/operators/avatars/Endmin.png`
- Generated file: `C:\Users\User\.codex\generated_images\01a2144b-53f7-70c3-940c-8429c427fb4a\exec-f65945f3-8097-4d31-8886-4489f1b13ec3.png`
- Selected project output: `endfield/assets/operators/avatars/refined/Endmin.png`
- Transparent background: `true`
- Visual QA: accepted; original identity/style retained, face legible, gray backdrop removed, body connected to bottom crop.

Exact prompt:

```text
Use case: background-extraction, identity-preserve.
Asset type: polished square operator avatar for a game character database.
Input image 1 is the EDIT TARGET. Retain this exact character and faithful original 3D game-render style, original head orientation, face shape, facial expression, eye color, hairstyle, hair color, ears, ornaments, clothing and materials. Improve clarity and upscale faithfully, with clean natural antialiased hair edges. Remove only the gray backdrop; produce genuine transparent RGBA, not a checkerboard painted into the image.
Composition: tight natural head-and-shoulders crop, square high-resolution canvas. Large clearly recognizable face about 46–50% of image width; eyes about 48–53% of canvas height. Hair or ear tips may lightly clip the top or side edges. IMPORTANT: NO FLOATING HEAD. Keep the head physically joined to the neck, collar and both shoulders; the original clothed upper chest and shoulders must continue THROUGH the BOTTOM EDGE as a broad connected opaque body area. No transparent gap below the neck, no detached head cutout, no rounded isolated bust silhouette with empty margin beneath it. Show little torso, mostly the large face; lower edge is a natural chest crop.
Do not repaint into 2D anime or change identity, costume design or colors. No new props, hands, weapons, background, text, watermark, border or frame.
Character-specific invariants: Endministrator with short dark-gray bob, black angular carbon-fiber eye visor completely covering the eyes, tiny yellow fasteners on visor, slight smile, white-gray winter tactical collar, fur trim and metal ring-clasp. The visor must stay ON and fully cover the eyes exactly as in the source; do not invent visible eyes. Preserve pose and costume.
```

### Estella

- Edit target: `endfield/assets/operators/avatars/Estella.png`
- Generated file: `C:\Users\User\.codex\generated_images\01a2144b-53f7-70c3-940c-8429c427fb4a\exec-0b6f63e0-6cbb-4989-96c8-eabdd13f308c.png`
- Selected project output: `endfield/assets/operators/avatars/refined/Estella.png`
- Transparent background: `true`
- Visual QA: accepted; original identity/style retained, face legible, gray backdrop removed, body connected to bottom crop.

Exact prompt:

```text
Use case: background-extraction, identity-preserve.
Asset type: polished square operator avatar for a game character database.
Input image 1 is the EDIT TARGET. Retain this exact character and faithful original 3D game-render style, original head orientation, face shape, facial expression, eye color, hairstyle, hair color, ears, ornaments, clothing and materials. Improve clarity and upscale faithfully, with clean natural antialiased hair edges. Remove only the gray backdrop; produce genuine transparent RGBA, not a checkerboard painted into the image.
Composition: tight natural head-and-shoulders crop, square high-resolution canvas. Large clearly recognizable face about 46–50% of image width; eyes about 48–53% of canvas height. Hair or ear tips may lightly clip the top or side edges. IMPORTANT: NO FLOATING HEAD. Keep the head physically joined to the neck, collar and both shoulders; the original clothed upper chest and shoulders must continue THROUGH the BOTTOM EDGE as a broad connected opaque body area. No transparent gap below the neck, no detached head cutout, no rounded isolated bust silhouette with empty margin beneath it. Show little torso, mostly the large face; lower edge is a natural chest crop.
Do not repaint into 2D anime or change identity, costume design or colors. No new props, hands, weapons, background, text, watermark, border or frame.
Character-specific invariants: Estella, pale silver-lavender straight hair, blue eyes, small rectangular bandage on cheek, large white furry cat-eared winter hat with small yellow-and-black triangular badge, white outfit with bright lime-green harness and circular black/silver fasteners. Retain original three-quarter head tilt, subdued expression and original 3D game materials.
```

### Fluorite

- Edit target: `endfield/assets/operators/avatars/Fluorite.png`
- Generated file: `C:\Users\User\.codex\generated_images\01a2144b-53f7-70c3-940c-8429c427fb4a\exec-3d47f223-60fb-4830-b642-1c204b88a3e2.png`
- Selected project output: `endfield/assets/operators/avatars/refined/Fluorite.png`
- Transparent background: `true`
- Visual QA: accepted; original identity/style retained, face legible, gray backdrop removed, body connected to bottom crop.

Exact prompt:

```text
Use case: background-extraction, identity-preserve.
Asset type: polished square operator avatar for a game character database.
Input image 1 is the EDIT TARGET. Retain this exact character and faithful original 3D game-render style, original head orientation, face shape, facial expression, eye color, hairstyle, hair color, ears, ornaments, clothing and materials. Improve clarity and upscale faithfully, with clean natural antialiased hair edges. Remove only the gray backdrop; produce genuine transparent RGBA, not a checkerboard painted into the image.
Composition: tight natural head-and-shoulders crop, square high-resolution canvas. Large clearly recognizable face about 46–50% of image width; eyes about 48–53% of canvas height. Hair or ear tips may lightly clip the top or side edges. IMPORTANT: NO FLOATING HEAD. Keep the head physically joined to the neck, collar and both shoulders; the original clothed upper chest and shoulders must continue THROUGH the BOTTOM EDGE as a broad connected opaque body area. No transparent gap below the neck, no detached head cutout, no rounded isolated bust silhouette with empty margin beneath it. Show little torso, mostly the large face; lower edge is a natural chest crop.
Do not repaint into 2D anime or change identity, costume design or colors. No new props, hands, weapons, background, text, watermark, border or frame.
Character-specific invariants: Fluorite: green hair and vivid green eyes, gentle slight smile, silver/white technical hood, white high collar and lime-green clasp. Keep original pose, face, hood construction, side black fittings, silver hair clip and exact 3D lighting/materials.
```

### Gilberta

- Edit target: `endfield/assets/operators/avatars/Gilberta.png`
- Generated file: `C:\Users\User\.codex\generated_images\01a2144b-53f7-70c3-940c-8429c427fb4a\exec-9e7c7c31-28f0-4ec0-aebd-8edd0ce407a9.png`
- Selected project output: `endfield/assets/operators/avatars/refined/Gilberta.png`
- Transparent background: `true`
- Visual QA: accepted; original identity/style retained, face legible, gray backdrop removed, body connected to bottom crop.

Exact prompt:

```text
Use case: background-extraction, identity-preserve.
Asset type: polished square operator avatar for a game character database.
Input image 1 is the EDIT TARGET. Retain this exact character and faithful original 3D game-render style, original head orientation, face shape, facial expression, eye color, hairstyle, hair color, ears, ornaments, clothing and materials. Improve clarity and upscale faithfully, with clean natural antialiased hair edges. Remove only the gray backdrop; produce genuine transparent RGBA, not a checkerboard painted into the image.
Composition: tight natural head-and-shoulders crop, square high-resolution canvas. Large clearly recognizable face about 46–50% of image width; eyes about 48–53% of canvas height. Hair or ear tips may lightly clip the top or side edges. IMPORTANT: NO FLOATING HEAD. Keep the head physically joined to the neck, collar and both shoulders; the original clothed upper chest and shoulders must continue THROUGH the BOTTOM EDGE as a broad connected opaque body area. No transparent gap below the neck, no detached head cutout, no rounded isolated bust silhouette with empty margin beneath it. Show little torso, mostly the large face; lower edge is a natural chest crop.
Do not repaint into 2D anime or change identity, costume design or colors. No new props, hands, weapons, background, text, watermark, border or frame.
Character-specific invariants: Gilberta: brown twin ponytails, brown furry animal ears, warm orange-red irises with purple upper shading, slight gentle smile, black/red angular hair fittings and high black tactical choker with silver-purple front clasp. Retain both ears, ponytails, expression and original 3D render materials.
```

### Laevatain

- Edit target: `endfield/assets/operators/avatars/Laevatain.png`
- Generated file: `C:\Users\User\.codex\generated_images\01a2144b-53f7-70c3-940c-8429c427fb4a\exec-7c430d71-476d-44a8-9032-86358baeec5d.png`
- Selected project output: `endfield/assets/operators/avatars/refined/Laevatain.png`
- Transparent background: `true`
- Visual QA: accepted; original identity/style retained, face legible, gray backdrop removed, body connected to bottom crop.

Exact prompt:

```text
Use case: background-extraction, identity-preserve.
Asset type: polished square operator avatar for a game character database.
Input image 1 is the EDIT TARGET. Retain this exact character and faithful original 3D game-render style, original head orientation, face shape, facial expression, eye color, hairstyle, hair color, ears, ornaments, clothing and materials. Improve clarity and upscale faithfully, with clean natural antialiased hair edges. Remove only the gray backdrop; produce genuine transparent RGBA, not a checkerboard painted into the image.
Composition: tight natural head-and-shoulders crop, square high-resolution canvas. Large clearly recognizable face about 46–50% of image width; eyes about 48–53% of canvas height. Hair or ear tips may lightly clip the top or side edges. IMPORTANT: NO FLOATING HEAD. Keep the head physically joined to the neck, collar and both shoulders; the original clothed upper chest and shoulders must continue THROUGH the BOTTOM EDGE as a broad connected opaque body area. No transparent gap below the neck, no detached head cutout, no rounded isolated bust silhouette with empty margin beneath it. Show little torso, mostly the large face; lower edge is a natural chest crop.
Do not repaint into 2D anime or change identity, costume design or colors. No new props, hands, weapons, background, text, watermark, border or frame.
Character-specific invariants: Laevatain: vivid red choppy layered hair, two black upward-curving horns with deep red inner shading and spikes at their bases, purple-blue eyes with warm orange centers, serious neutral expression, silver high pointed collar and black crossing chest straps. Preserve face, head direction, horn design and original 3D render style; original garment may continue through bottom edge.
```

### Last_Rite

- Edit target: `endfield/assets/operators/avatars/Last_Rite.png`
- Generated file: `C:\Users\User\.codex\generated_images\01a2144b-53f7-70c3-940c-8429c427fb4a\exec-f66ed310-1951-45bf-899a-06ea849aacef.png`
- Selected project output: `endfield/assets/operators/avatars/refined/Last_Rite.png`
- Transparent background: `true`
- Visual QA: accepted; original identity/style retained, face legible, gray backdrop removed, body connected to bottom crop.

Exact prompt:

```text
Use case: background-extraction, identity-preserve.
Asset type: polished square operator avatar for a game character database.
Input image 1 is the EDIT TARGET. Retain this exact character and faithful original 3D game-render style, original head orientation, face shape, facial expression, eye color, hairstyle, hair color, ears, ornaments, clothing and materials. Improve clarity and upscale faithfully, with clean natural antialiased hair edges. Remove only the gray backdrop; produce genuine transparent RGBA, not a checkerboard painted into the image.
Composition: tight natural head-and-shoulders crop, square high-resolution canvas. Large clearly recognizable face about 46–50% of image width; eyes about 48–53% of canvas height. Hair or ear tips may lightly clip the top or side edges. IMPORTANT: NO FLOATING HEAD. Keep the head physically joined to the neck, collar and both shoulders; the original clothed upper chest and shoulders must continue THROUGH the BOTTOM EDGE as a broad connected opaque body area. No transparent gap below the neck, no detached head cutout, no rounded isolated bust silhouette with empty margin beneath it. Show little torso, mostly the large face; lower edge is a natural chest crop.
Do not repaint into 2D anime or change identity, costume design or colors. No new props, hands, weapons, background, text, watermark, border or frame.
Character-specific invariants: Last Rite: straight turquoise-blue bangs and long side hair, long pointed elf-like ears, copper-red eyes with blue highlights, neutral slightly sad expression, silver/black angular helmet with tall side fins and pale cloud-like motifs, black/red choker, blue/black/white outfit with purple glowing collar trim. Preserve exact helmet and face, original 3D materials; no new props.
```

### Lifeng

- Edit target: `endfield/assets/operators/avatars/Lifeng.png`
- Generated file: `C:\Users\User\.codex\generated_images\01a2144b-53f7-70c3-940c-8429c427fb4a\exec-638b0331-13f7-4b2d-923b-a995694157b2.png`
- Selected project output: `endfield/assets/operators/avatars/refined/Lifeng.png`
- Transparent background: `true`
- Visual QA: accepted; original identity/style retained, face legible, gray backdrop removed, body connected to bottom crop.

Exact prompt:

```text
Use case: background-extraction, identity-preserve.
Asset type: polished square operator avatar for a game character database.
Input image 1 is the EDIT TARGET. Retain this exact character and faithful original 3D game-render style, original head orientation, face shape, facial expression, eye color, hairstyle, hair color, ears, ornaments, clothing and materials. Improve clarity and upscale faithfully, with clean natural antialiased hair edges. Remove only the gray backdrop; produce genuine transparent RGBA, not a checkerboard painted into the image.
Composition: tight natural head-and-shoulders crop, square high-resolution canvas. Large clearly recognizable face about 46–50% of image width; eyes about 48–53% of canvas height. Hair or ear tips may lightly clip the top or side edges. IMPORTANT: NO FLOATING HEAD. Keep the head physically joined to the neck, collar and both shoulders; the original clothed upper chest and shoulders must continue THROUGH the BOTTOM EDGE as a broad connected opaque body area. No transparent gap below the neck, no detached head cutout, no rounded isolated bust silhouette with empty margin beneath it. Show little torso, mostly the large face; lower edge is a natural chest crop.
Do not repaint into 2D anime or change identity, costume design or colors. No new props, hands, weapons, background, text, watermark, border or frame.
Character-specific invariants: Lifeng: youthful male with pale green tousled short hair, narrow lavender eyes, slight gentle smile, two dark decorated horns entering from top edge, long silver side locks, black high collar with small gold fastener, olive-yellow tactical chest panel with a pale square pattern, red-green ornament beside one cheek. Preserve male facial structure, hairstyle, head direction, costume and original 3D game graphics.
```

### Liino

- Edit target: `endfield/assets/operators/avatars/Liino.png`
- Generated file: `C:\Users\User\.codex\generated_images\01a2144b-53f7-70c3-940c-8429c427fb4a\exec-0affcce3-127d-4a9a-9997-6ee53053236a.png`
- Selected project output: `endfield/assets/operators/avatars/refined/Liino.png`
- Transparent background: `true`
- Visual QA: accepted; original identity/style retained, face legible, gray backdrop removed, body connected to bottom crop.

Exact prompt:

```text
Use case: background-extraction, identity-preserve.
Asset type: polished square operator avatar for a game character database.
Input image 1 is the EDIT TARGET. Retain this exact character and faithful original 3D game-render style, original head orientation, face shape, facial expression, eye color, hairstyle, hair color, ears, ornaments, clothing and materials. Improve clarity and upscale faithfully, with clean natural antialiased hair edges. Remove only the gray backdrop; produce genuine transparent RGBA, not a checkerboard painted into the image.
Composition: tight natural head-and-shoulders crop, square high-resolution canvas. Large clearly recognizable face about 46–50% of image width; eyes about 48–53% of canvas height. Hair or ear tips may lightly clip the top or side edges. IMPORTANT: NO FLOATING HEAD. Keep the head physically joined to the neck, collar and both shoulders; the original clothed upper chest and shoulders must continue THROUGH the BOTTOM EDGE as a broad connected opaque body area. No transparent gap below the neck, no detached head cutout, no rounded isolated bust silhouette with empty margin beneath it. Show little torso, mostly the large face; lower edge is a natural chest crop.
Do not repaint into 2D anime or change identity, costume design or colors. No new props, hands, weapons, background, text, watermark, border or frame.
Character-specific invariants: Liino: peach-blond long hair, purple irises with prominent star-shaped pupils, black star hairpin, pointed ears, black/violet curved head ornaments and violet striped headband with blue bow on right of image, smile, white/lilac theatrical collar and purple bow, orange strap down chest. Preserve exact star pupils, face, original 3D game style and colors. Keep neck, collar and shoulders continuous through bottom crop, never detach the head.
```

### Mi_Fu

- Edit target: `endfield/assets/operators/avatars/Mi_Fu.png`
- Generated file: `C:\Users\User\.codex\generated_images\01a2144b-53f7-70c3-940c-8429c427fb4a\exec-f9d54ed1-4c90-443e-8b56-f6f0800c0f91.png`
- Selected project output: `endfield/assets/operators/avatars/refined/Mi_Fu.png`
- Transparent background: `true`
- Visual QA: accepted; original identity/style retained, face legible, gray backdrop removed, body connected to bottom crop.

Exact prompt:

```text
Use case: background-extraction, identity-preserve.
Asset type: polished square operator avatar for a game character database.
Input image 1 is the EDIT TARGET. Retain this exact character and faithful original 3D game-render style, original head orientation, face shape, facial expression, eye color, hairstyle, hair color, ears, ornaments, clothing and materials. Improve clarity and upscale faithfully, with clean natural antialiased hair edges. Remove only the gray backdrop; produce genuine transparent RGBA, not a checkerboard painted into the image.
Composition: tight natural head-and-shoulders crop, square high-resolution canvas. Large clearly recognizable face about 46–50% of image width; eyes about 48–53% of canvas height. Hair or ear tips may lightly clip the top or side edges. IMPORTANT: NO FLOATING HEAD. Keep the head physically joined to the neck, collar and both shoulders; the original clothed upper chest and shoulders must continue THROUGH the BOTTOM EDGE as a broad connected opaque body area. No transparent gap below the neck, no detached head cutout, no rounded isolated bust silhouette with empty margin beneath it. Show little torso, mostly the large face; lower edge is a natural chest crop.
Do not repaint into 2D anime or change identity, costume design or colors. No new props, hands, weapons, background, text, watermark, border or frame.
Character-specific invariants: Mi Fu: white/silver hair with pale pink ends and side bangs partly covering the left eye in image, pink-red irises with cyan centers, two blue metallic/crystalline antlers, long pointed ears, small soft smile, white high collar with two blue fasteners and dark textured silver-trimmed shoulders. Preserve original elegant face and exact hair/antler/costume design, original 3D render materials. Keep both shoulders and collar extending through lower canvas edge.
```

### Pogranichnik

- Edit target: `endfield/assets/operators/avatars/Pogranichnik.png`
- Generated file: `C:\Users\User\.codex\generated_images\01a2144b-53f7-70c3-940c-8429c427fb4a\exec-f6cad241-f783-4196-bfe7-c2abfeef20b9.png`
- Selected project output: `endfield/assets/operators/avatars/refined/Pogranichnik.png`
- Transparent background: `true`
- Visual QA: accepted; original identity/style retained, face legible, gray backdrop removed, body connected to bottom crop.

Exact prompt:

```text
Use case: background-extraction, identity-preserve.
Asset type: polished square operator avatar for a game character database.
Input image 1 is the EDIT TARGET. Retain this exact character and faithful original 3D game-render style, original head orientation, face shape, facial expression, eye color, hairstyle, hair color, ears, ornaments, clothing and materials. Improve clarity and upscale faithfully, with clean natural antialiased hair edges. Remove only the gray backdrop; produce genuine transparent RGBA, not a checkerboard painted into the image.
Composition: tight natural head-and-shoulders crop, square high-resolution canvas. Large clearly recognizable face about 46–50% of image width; eyes about 48–53% of canvas height. Hair or ear tips may lightly clip the top or side edges. IMPORTANT: NO FLOATING HEAD. Keep the head physically joined to the neck, collar and both shoulders; the original clothed upper chest and shoulders must continue THROUGH the BOTTOM EDGE as a broad connected opaque body area. No transparent gap below the neck, no detached head cutout, no rounded isolated bust silhouette with empty margin beneath it. Show little torso, mostly the large face; lower edge is a natural chest crop.
Do not repaint into 2D anime or change identity, costume design or colors. No new props, hands, weapons, background, text, watermark, border or frame.
Character-specific invariants: Pogranichnik: mature male, long straight ash-gray hair with ivory crown and dark central streak, tall dark animal ears, angular masculine jaw, narrow amber-gray eyes with reddish lash shading, stern closed mouth, black high leather collar with four round metal studs and red under-collar, red-and-black military clothing. Preserve original male facial proportions, expression and 3D game render style. Remove the faint rectangular UI artifacts in source background together with gray backdrop; retain all character details.
```



---

## Refined operator avatar batch C — 2026-11-25

Mode: built-in image_gen, edit/background-extraction. AI-assisted faithful derivatives of the existing game portraits. Originals remain unchanged in `endfield/assets/operators/avatars/`. Final files are 1254×1254 RGBA at `endfield/assets/operators/avatars/refined/<Name>.png`.

All eleven outputs were visually inspected for identity, preserved rendering style, clean transparency, readable faces and a continuous neck/collar/shoulder silhouette reaching the lower edge. No detached heads or transparent gap beneath the bust. Kay, Si, Argent Flow and Purrchena retain the source illustration style; the other seven retain their 3D game-render style.

### Argent_Flow

Input: `endfield/assets/operators/avatars/Argent_Flow.png`

Final: `endfield/assets/operators/avatars/refined/Argent_Flow.png`

Exact prompt:

Use case: background-extraction and faithful portrait enhancement. Edit target: the character in the supplied original game artwork. Create ONE high-resolution square RGBA avatar for a character database. Preserve exact original identity, facial proportions, eye color, expression, hair, ornaments, clothing and original anime illustration style; do not redesign or switch to a different rendering style. Reconstruct only edge details needed for the crop and faithfully restore sharp fine detail from the small source. Composition: large centered HEAD-AND-SHOULDERS BUST, face width about 46-50% of canvas, eyes around 48-53% of height. Keep eyes, mouth and chin visible, ear/hair tips may naturally clip slightly at top/side edges. Crucially retain attached neck, collar, shoulders and a small amount of upper chest extending THROUGH THE BOTTOM EDGE across a wide connected area. NO floating head, NO severed neck and NO transparent gap below the neck. Transparent sides around upper silhouette only. No background, text, frame, hands, weapons, new props, white fringe, gray halo, blur or sharpening artifacts. Output only this one transparent square bust. Subject: Argent Flow, silver-blond-haired man with narrow red eyes, pointed furry ears, blue dangling earring, blue scarf and ornate white-gold coat. Preserve the serious calm expression and exact original face angle.

### Kay

Input: `endfield/assets/operators/avatars/Kay.png`

Final: `endfield/assets/operators/avatars/refined/Kay.png`

Exact prompt:

Use case: background-extraction and faithful portrait enhancement. Edit target: the character in the supplied original game artwork. Create ONE high-resolution square RGBA avatar for a character database. Preserve exact original identity, facial proportions, eye color, expression, hair, ornaments, clothing and original anime illustration style; do not redesign or switch to a different rendering style. Reconstruct only edge details needed for the crop and faithfully restore sharp fine detail from the small source. Composition: large centered HEAD-AND-SHOULDERS BUST, face width about 46-50% of canvas, eyes around 48-53% of height. Keep eyes, mouth and chin visible, ear/hair tips may naturally clip slightly at top/side edges. Crucially retain attached neck, collar, shoulders and a small amount of upper chest extending THROUGH THE BOTTOM EDGE across a wide connected area. NO floating head, NO severed neck and NO transparent gap below the neck. Transparent sides around upper silhouette only. No background, text, frame, hands, weapons, new props, white fringe, gray halo, blur or sharpening artifacts. Output only this one transparent square bust. Subject: Kay, golden-blonde short-haired woman with red-orange eyes, cheerful open smile, black-gold futuristic hair clips, black outfit and visible shoulder. Preserve exact tilted head, eye direction and smiling expression. Keep the original 2D game illustration style and existing outfit.

### Purrchena

Input: `endfield/assets/operators/avatars/Purrchena.png`

Final: `endfield/assets/operators/avatars/refined/Purrchena.png`

Exact prompt:

Use case: background-extraction and faithful portrait enhancement. Edit target: Purrchena, the white furry round bear-like character wearing black oval goggles, white headgear and a red scarf in the supplied original game illustration. Create ONE square high-resolution RGBA portrait avatar. Preserve the exact nonhuman character, round furry face/muzzle, goggles and reflection, gray ear, white equipment, smile/angle, red scarf and original 2D painted anime game illustration style. Sharpen details faithfully without redesigning or humanizing. Remove the background. Composition: a large readable HEAD-AND-SHOULDERS BUST, tilted exactly as source; full facial goggles and muzzle visible. Keep the red scarf and upper white outfit with its dark details attached continuously to the head, extending THROUGH THE BOTTOM EDGE of the square across most of the width. No floating detached head and no transparent space below the neck. Little torso visible. Hair/fur or helmet tips may clip naturally at top and sides. Keep all exposed side background genuinely transparent, with clean fine fur edges; no text, frame, border, halo, new props or invented weapons. Output only this one transparent square bust.

### Si

Input: `endfield/assets/operators/avatars/Si.png`

Final: `endfield/assets/operators/avatars/refined/Si.png`

Exact prompt:

Use case: background-extraction and faithful portrait enhancement. Edit target: the character in the supplied original game artwork. Create ONE high-resolution square RGBA avatar for a character database. Preserve exact original identity, facial proportions, eye color, expression, hair, ornaments, clothing and original anime illustration style; do not redesign or switch to a different rendering style. Reconstruct only edge details needed for the crop and faithfully restore sharp fine detail from the small source. Composition: large centered HEAD-AND-SHOULDERS BUST, face width about 46-50% of canvas, eyes around 48-53% of height. Keep eyes, mouth and chin visible, ear/hair tips may naturally clip slightly at top/side edges. Crucially retain attached neck, collar, shoulders and a small amount of upper chest extending THROUGH THE BOTTOM EDGE across a wide connected area. NO floating head, NO severed neck and NO transparent gap below the neck. Transparent sides around upper silhouette only. No background, text, frame, hands, weapons, new props, white fringe, gray halo, blur or sharpening artifacts. Output only this one transparent square bust. Subject: Si, pale mint-green/silver long-haired woman with cyan-blue eyes edged in red-pink lashes, small slightly parted mouth, black-green geometric crown ornaments, dark high collar and gold accents. Preserve exact tilted head, expression and original 2D painted illustration style.

### Rossi

Input: `endfield/assets/operators/avatars/Rossi.png`

Final: `endfield/assets/operators/avatars/refined/Rossi.png`

Exact prompt:

Use case: background-extraction and faithful portrait enhancement. Edit target: the character in the supplied original game artwork. Create ONE high-resolution square RGBA avatar for a character database. Preserve exact original identity, facial proportions, eye color, expression, hair, ornaments, clothing and original polished 3D anime game-render style; do not redesign or switch to a different rendering style. Reconstruct only edge details needed for the crop and faithfully restore sharp fine detail from the small source. Composition: large centered HEAD-AND-SHOULDERS BUST, face width about 46-50% of canvas, eyes around 48-53% of height. Keep eyes, mouth and chin visible, ear/hair tips may naturally clip slightly at top/side edges. Crucially retain attached neck, collar, shoulders and a small amount of upper chest extending THROUGH THE BOTTOM EDGE across a wide connected area. NO floating head, NO severed neck and NO transparent gap below the neck. Transparent sides around upper silhouette only. No background, text, frame, hands, weapons, new props, white fringe, gray halo, blur or sharpening artifacts. Output only this one transparent square bust. Subject: Rossi, blonde woman in a red hood with gray furry ears and red-blue braid, golden-yellow eyes with purple upper highlights, slight closed smile, tied side locks, red cloak and white chest outfit. Preserve exact expression and face angle; retain game-render materials and lighting.

### Snowshine

Input: `endfield/assets/operators/avatars/Snowshine.png`

Final: `endfield/assets/operators/avatars/refined/Snowshine.png`

Exact prompt:

Use case: background-extraction and faithful portrait enhancement. Edit target: the character in the supplied original game artwork. Create ONE high-resolution square RGBA avatar for a character database. Preserve exact original identity, facial proportions, eye color, expression, hair, ornaments, clothing and original polished 3D anime game-render style; do not redesign or switch to a different rendering style. Reconstruct only edge details needed for the crop and faithfully restore sharp fine detail from the small source. Composition: large centered HEAD-AND-SHOULDERS BUST, face width about 46-50% of canvas, eyes around 48-53% of height. Keep eyes, mouth and chin visible, ear/hair tips may naturally clip slightly at top/side edges. Crucially retain attached neck, collar, shoulders and a small amount of upper chest extending THROUGH THE BOTTOM EDGE across a wide connected area. NO floating head, NO severed neck and NO transparent gap below the neck. Transparent sides around upper silhouette only. No background, text, frame, hands, weapons, new props, white fringe, gray halo, blur or sharpening artifacts. Output only this one transparent square bust. Subject: Snowshine, short pale gray-blue-haired woman with fluffy rounded bear ears, blue reflective ski goggles on forehead, cyan eyes, soft smile, light knitted high scarf and black-gray technical winter coat with pale outer panels. Preserve source expression and original angle, materials and game-render lighting.

### Tangtang

Input: `endfield/assets/operators/avatars/Tangtang.png`

Final: `endfield/assets/operators/avatars/refined/Tangtang.png`

Exact prompt:

Use case: background-extraction and faithful portrait enhancement. Edit target: the character in the supplied original game artwork. Create ONE high-resolution square RGBA avatar for a character database. Preserve exact original identity, facial proportions, eye color, expression, hair, ornaments, clothing and original polished 3D anime game-render style; do not redesign or switch to a different rendering style. Reconstruct only edge details needed for the crop and faithfully restore sharp fine detail from the small source. Composition: large centered HEAD-AND-SHOULDERS BUST, face width about 46-50% of canvas, eyes around 48-53% of height. Keep eyes, mouth and chin visible, ear/hair tips may naturally clip slightly at top/side edges. Crucially retain attached neck, collar, shoulders and a small amount of upper chest extending THROUGH THE BOTTOM EDGE across a wide connected area. NO floating head, NO severed neck and NO transparent gap below the neck. Transparent sides around upper silhouette only. No background, text, frame, hands, weapons, new props, white fringe, gray halo, blur or sharpening artifacts. Output only this one transparent square bust. Subject: Tangtang, short black-gray bob-haired woman with furry pointed ears, star hair clips, one blue-violet eye visible and the other covered by a black eyepatch with silver infinity detail and pink accents, slight cheeky smile, yellow standing collar and black-gray armor. Preserve exact eye count/eyepatch, expression, angle and game-render materials.

### typhoeus

Input: `endfield/assets/operators/avatars/typhoeus.png`

Final: `endfield/assets/operators/avatars/refined/typhoeus.png`

Exact prompt:

Use case: background-extraction and faithful portrait enhancement. Edit target: the character in the supplied original game artwork. Create ONE high-resolution square RGBA avatar for a character database. Preserve exact original identity, facial proportions, eye color, expression, hair, ornaments, clothing and original polished 3D anime game-render style; do not redesign or switch to a different rendering style. Reconstruct only edge details needed for the crop and faithfully restore sharp fine detail from the small source. Composition: large centered HEAD-AND-SHOULDERS BUST, face width about 46-50% of canvas, eyes around 48-53% of height. Keep eyes, mouth and chin visible, ear/hair tips may naturally clip slightly at top/side edges. Crucially retain attached neck, collar, shoulders and a small amount of upper chest extending THROUGH THE BOTTOM EDGE across a wide connected area. NO floating head, NO severed neck and NO transparent gap below the neck. Transparent sides around upper silhouette only. No background, text, frame, hands, weapons, new props, white fringe, gray halo, blur or sharpening artifacts. Output only this one transparent square bust. Subject: Typhoeus, lavender-haired woman with curled twin side sections, magenta eyes, huge dark curved horns, black head apparatus with two triangular white panels and tiny camera, slight smile, gray-black high collar and white armored chest with a red octagonal fastener. Preserve original horns, face angle, expression and mechanical details. No need to show entire long horns: keep their roots and a natural top-edge crop.

### Wulfgard

Input: `endfield/assets/operators/avatars/Wulfgard.png`

Final: `endfield/assets/operators/avatars/refined/Wulfgard.png`

Exact prompt:

Use case: background-extraction and faithful portrait enhancement. Edit target: the character in the supplied original game artwork. Create ONE high-resolution square RGBA avatar for a character database. Preserve exact original identity, facial proportions, eye color, expression, hair, ornaments, clothing and original polished 3D anime game-render style; do not redesign or switch to a different rendering style. Reconstruct only edge details needed for the crop and faithfully restore sharp fine detail from the small source. Composition: large centered HEAD-AND-SHOULDERS BUST, face width about 46-50% of canvas, eyes around 48-53% of height. Keep eyes, mouth and chin visible, ear/hair tips may naturally clip slightly at top/side edges. Crucially retain attached neck, collar, shoulders and a small amount of upper chest extending THROUGH THE BOTTOM EDGE across a wide connected area. NO floating head, NO severed neck and NO transparent gap below the neck. Transparent sides around upper silhouette only. No background, text, frame, hands, weapons, new props, white fringe, gray halo, blur or sharpening artifacts. Output only this one transparent square bust. Subject: Wulfgard, young man with spiky dark charcoal hair, tall furry dark ears with red-violet interiors, amber eyes, diagonal cheek scar and neck scars, serious neutral expression, red leather high-collar jacket with silver buckles and dark inner layer. Preserve exact scars, eye shape, facial proportions and original game-render style/materials.

### Xaihi

Input: `endfield/assets/operators/avatars/Xaihi.png`

Final: `endfield/assets/operators/avatars/refined/Xaihi.png`

Exact prompt:

Use case: background-extraction and faithful portrait enhancement. Edit target: the character in the supplied original game artwork. Create ONE high-resolution square RGBA avatar for a character database. Preserve exact original identity, facial proportions, eye color, expression, hair, ornaments, clothing and original polished 3D anime game-render style; do not redesign or switch to a different rendering style. Reconstruct only edge details needed for the crop and faithfully restore sharp fine detail from the small source. Composition: large centered HEAD-AND-SHOULDERS BUST, face width about 46-50% of canvas, eyes around 48-53% of height. Keep eyes, mouth and chin visible, ear/hair tips may naturally clip slightly at top/side edges. Crucially retain attached neck, collar, shoulders and a small amount of upper chest extending THROUGH THE BOTTOM EDGE across a wide connected area. NO floating head, NO severed neck and NO transparent gap below the neck. Transparent sides around upper silhouette only. No background, text, frame, hands, weapons, new props, white fringe, gray halo, blur or sharpening artifacts. Output only this one transparent square bust. Subject: Xaihi, teal-haired woman with long braided side locks, violet-yellow irises, small gray triangle marking above eyebrow, thin white geometric cheek line, pointed ears, white-gray black draped head covering with dark horns, large silver hair ornament, slight closed-mouth smile and white high-collar outfit. Preserve exact facial markings, eye colors, expression, headwear and game-render materials.

### Yvonne

Input: `endfield/assets/operators/avatars/Yvonne.png`

Final: `endfield/assets/operators/avatars/refined/Yvonne.png`

Exact prompt:

Use case: background-extraction and faithful portrait enhancement. Edit target: the character in the supplied original game artwork. Create ONE high-resolution square RGBA avatar for a character database. Preserve exact original identity, facial proportions, eye color, expression, hair, ornaments, clothing and original polished 3D anime game-render style; do not redesign or switch to a different rendering style. Reconstruct only edge details needed for the crop and faithfully restore sharp fine detail from the small source. Composition: large centered HEAD-AND-SHOULDERS BUST, face width about 46-50% of canvas, eyes around 48-53% of height. Keep eyes, mouth and chin visible, ear/hair tips may naturally clip slightly at top/side edges. Crucially retain attached neck, collar, shoulders and a small amount of upper chest extending THROUGH THE BOTTOM EDGE across a wide connected area. NO floating head, NO severed neck and NO transparent gap below the neck. Transparent sides around upper silhouette only. No background, text, frame, hands, weapons, new props, white fringe, gray halo, blur or sharpening artifacts. Output only this one transparent square bust. Subject: Yvonne, pink-haired woman with long twin tails, cyan inner hair streaks, pointed elven ears, black-pink hornlike crown ornaments, black angular hair clip, bright multicolored cyan-pink-yellow irises, small cheek marking, slight smile, black high neck collar with silver buckles and gray-white outfit. Preserve exact face angle, expression, eye colors and game-render style.
