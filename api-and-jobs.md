# API and Background Jobs

## 1. API style

Use a typed API layer. REST is sufficient for the MVP; a typed RPC layer can be used later if desired.

## 2. Core resources

### Project

```text
POST   /api/projects
GET    /api/projects/:projectId
PATCH  /api/projects/:projectId
DELETE /api/projects/:projectId
```

### Audit

```text
POST /api/audits
GET  /api/audits/:auditId
POST /api/audits/:auditId/cancel
```

### Issues

```text
GET /api/audits/:auditId/issues
GET /api/audits/:auditId/issues/:issueId
```

### Design source

```text
POST /api/design-sources/figma
POST /api/design-sources/xd
DELETE /api/design-sources/:sourceId
```

## 3. Create audit request

```json
{
  "projectId": "project_123",
  "website": {
    "url": "https://example.com/pricing"
  },
  "viewports": [
    {"id":"desktop","width":1440,"height":900},
    {"id":"mobile","width":390,"height":844}
  ],
  "designSource": {
    "id": "design_456",
    "targetNodeId": "123:456"
  },
  "options": {
    "visualDiff": true,
    "aiRecommendations": true
  }
}
```

Response:

```json
{
  "auditId": "audit_789",
  "status": "queued"
}
```

## 4. Audit state machine

```text
QUEUED
  ↓
INSPECTING_WEBSITE
  ↓
IMPORTING_DESIGN
  ↓
NORMALIZING
  ↓
MATCHING
  ↓
COMPARING
  ↓
VISUAL_DIFF
  ↓
AI_RECOMMENDATIONS
  ↓
COMPLETED
```

Failure can occur at any stage:

```text
FAILED
CANCELLED
```

## 5. Job payload

Every job should contain:

```ts
interface JobEnvelope {
  auditId: string;
  projectId: string;
  attempt: number;
  correlationId: string;
  inputHash: string;
}
```

## 6. Website inspection result

```ts
interface WebsiteInspectionResult {
  viewport: DesignViewport;
  specObjectKey: string;
  screenshotObjectKey: string;
  elementCount: number;
  warnings: string[];
}
```

## 7. Comparison result

```ts
interface ComparisonResult {
  viewportId: string;
  issueCount: number;
  issuesObjectKey?: string;
  unresolvedCount: number;
}
```

For large audits, use object storage for full report JSON while storing searchable issue rows in the database.

## 8. Progress events

The frontend should receive events such as:

```json
{
  "auditId": "audit_789",
  "stage": "COMPARING",
  "status": "running",
  "message": "Comparing typography",
  "progress": 0.72
}
```

Do not promise exact remaining time.

## 9. Idempotency

A retry must not duplicate screenshots, issues, or database records.

Use a unique key such as:

```text
hash(auditId + stage + inputHash + viewportId)
```

## 10. Rate limiting

Apply limits to:

- audit creation,
- concurrent browser contexts,
- screenshot size,
- Figma API operations,
- Claude API operations.

## 11. AI request design

Send only compact structured differences.

A good AI payload:

```json
{
  "element": {
    "name": "Primary CTA",
    "selector": ".primary-cta"
  },
  "differences": [
    {
      "property": "paddingInline",
      "current": 20,
      "required": 24,
      "unit": "px",
      "delta": 4
    },
    {
      "property": "borderRadius",
      "current": 8,
      "required": 12,
      "unit": "px",
      "delta": 4
    }
  ]
}
```

The AI response should be schema-constrained whenever the selected Anthropic API capability supports structured output.

## 12. API security

- Validate every URL server-side.
- Never accept arbitrary internal addresses.
- Keep provider credentials server-side.
- Use short-lived upload URLs for artifacts.
- Limit artifact sizes.
- Sanitize filenames and metadata.
