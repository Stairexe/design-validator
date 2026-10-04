# Figma fixtures

`pricing.nodes.json` is a hand-built `GET /v1/files/:key/nodes?ids=1:2,5:2` response for a pricing page
(`1:2` desktop frame, `5:2` mobile frame with stacked cards). It mirrors `fixtures/websites/pricing.html` with deliberate differences:

| Element | Website | Design |
| --- | --- | --- |
| Hero heading | 44px / 52px | 48px / 56px |
| Primary CTA padding X | 20px | 24px |
| Primary CTA radius | 8px | 12px |
| Card gap | 20px | 24px |

The frames are offset on the canvas (x=1000, y=2000) to exercise coordinate normalization.
