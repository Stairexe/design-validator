# @design-validator/visual-diff

Visual evidence for measured issues (Phase 7):

- `diffImages` — pixel difference between the website screenshot and the design image (pixelmatch).
- `renderDesignHtml` — renders a normalized DesignSpec page to standalone HTML. The pipeline screenshots it to obtain a
  design image when the source cannot export one (uploaded Figma JSON, Adobe XD manifests, no Figma token). Such images
  are labelled "rendered from design data" in the UI: they are an approximation, never measurement evidence.

Pixel differences are evidence only. They never create, remove or change measured issues.
