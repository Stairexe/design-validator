import type { ValidationIssue } from '@design-validator/design-spec';
import { describe, expect, it } from 'vitest';

import {
  AiProviderError,
  PROMPT_VERSION,
  buildIssueGroupPayload,
  explainIssueGroup,
  recommendationCacheKey,
  sameElementGroup,
  type RecommendationModel,
} from '../src';

const issue = (
  id: string,
  property: string,
  current: number,
  required: number,
  extra: Partial<ValidationIssue> = {},
): ValidationIssue => ({
  id,
  viewportId: 'desktop',
  category: 'spacing',
  severity: 'medium',
  element: {
    name: 'Primary CTA',
    designId: 'd1',
    implementationId: 'dom-3',
    selector: '.primary-cta',
  },
  property,
  current: { kind: 'length', value: current },
  required: { kind: 'length', value: required },
  delta: { kind: 'length', value: required - current },
  tolerance: 2,
  status: 'difference',
  evidence: {},
  ...extra,
});

const issues = [issue('iss_a', 'padding.inline', 20, 24), issue('iss_b', 'radius', 8, 12)];

function fakeModel(output: unknown): RecommendationModel & { calls: unknown[] } {
  const calls: unknown[] = [];
  return {
    model: 'claude-opus-5-5',
    calls,
    recommend: (payload) => {
      calls.push(payload);
      return Promise.resolve(output as never);
    },
  };
}

const goodOutput = {
  groupSummary: 'The button uses smaller padding and radius than designed.',
  recommendations: [
    {
      issueId: 'iss_a',
      explanation: 'Horizontal padding is 20px.',
      probableCause: 'A shared .btn class sets padding: 12px 20px.',
      recommendedChange: { language: 'css', code: '.primary-cta { padding-inline: 24px; }' },
      caveats: [],
    },
    {
      issueId: 'iss_b',
      explanation: 'Radius token is 8px.',
      probableCause: '',
      recommendedChange: { language: 'css', code: '.primary-cta { border-radius: 12px; }' },
      caveats: ['Affects all buttons if changed on .btn'],
    },
  ],
};

describe('buildIssueGroupPayload', () => {
  it('sends compact structured differences only', () => {
    expect(buildIssueGroupPayload(issues)).toEqual({
      element: { name: 'Primary CTA', selector: '.primary-cta' },
      viewport: 'desktop',
      differences: [
        {
          issueId: 'iss_a',
          property: 'padding.inline',
          cssProperty: 'padding-inline',
          current: '20px',
          required: '24px',
          change: '+4px',
          category: 'spacing',
        },
        {
          issueId: 'iss_b',
          property: 'radius',
          cssProperty: 'border-radius',
          current: '8px',
          required: '12px',
          change: '+4px',
          category: 'spacing',
        },
      ],
    });
  });

  it('groups issues by element and viewport', () => {
    const other = issue('iss_c', 'gap', 20, 24, {
      element: { name: 'Cards', designId: 'd9', implementationId: 'dom-9' },
    });
    expect(sameElementGroup([...issues, other], issues[0] ?? other).map((i) => i.id)).toEqual([
      'iss_a',
      'iss_b',
    ]);
  });
});

describe('explainIssueGroup', () => {
  it('returns validated recommendations without touching measured values', async () => {
    const before = structuredClone(issues);
    const model = fakeModel(goodOutput);
    const result = await explainIssueGroup(model, issues);
    expect(result).toMatchObject({
      model: 'claude-opus-5-5',
      promptVersion: PROMPT_VERSION,
      summary: goodOutput.groupSummary,
    });
    expect(result.recommendations.map((r) => r.issueId)).toEqual(['iss_a', 'iss_b']);
    expect(result.recommendations[0]).not.toHaveProperty('probableCause', '');
    expect(issues).toEqual(before);
    // Recommendations carry no current/required/delta fields that could override measurements.
    expect(JSON.stringify(result.recommendations)).not.toMatch(/"(current|required|delta)"/);
  });

  it('discards recommendations for unknown or duplicate issues', async () => {
    const tampered = {
      ...goodOutput,
      recommendations: [
        ...goodOutput.recommendations,
        { ...goodOutput.recommendations[0], issueId: 'iss_invented' },
        goodOutput.recommendations[0],
      ],
    };
    const result = await explainIssueGroup(fakeModel(tampered), issues);
    expect(result.recommendations.map((r) => r.issueId)).toEqual(['iss_a', 'iss_b']);
  });

  it('rejects malformed output with a typed error', async () => {
    await expect(
      explainIssueGroup(fakeModel({ recommendations: 'nope' }), issues),
    ).rejects.toBeInstanceOf(AiProviderError);
    await expect(
      explainIssueGroup(fakeModel({ groupSummary: 'x', recommendations: [] }), issues),
    ).rejects.toMatchObject({ reason: 'invalid-output' });
  });

  it('propagates provider outages as AiProviderError', async () => {
    const failing: RecommendationModel = {
      model: 'm',
      recommend: () => Promise.reject(new AiProviderError('provider-error', 'down')),
    };
    await expect(explainIssueGroup(failing, issues)).rejects.toMatchObject({
      code: 'AI_PROVIDER_FAILED',
    });
  });
});

describe('recommendationCacheKey', () => {
  const payload = buildIssueGroupPayload(issues);
  it('is stable regardless of issue order and changes with prompt version or model', () => {
    const key = recommendationCacheKey({
      auditInputHash: 'h',
      payload,
      promptVersion: 'v1',
      model: 'm',
    });
    const reordered = { ...payload, differences: [...payload.differences].reverse() };
    expect(
      recommendationCacheKey({
        auditInputHash: 'h',
        payload: reordered,
        promptVersion: 'v1',
        model: 'm',
      }),
    ).toBe(key);
    expect(
      recommendationCacheKey({ auditInputHash: 'h', payload, promptVersion: 'v2', model: 'm' }),
    ).not.toBe(key);
    expect(
      recommendationCacheKey({ auditInputHash: 'h', payload, promptVersion: 'v1', model: 'other' }),
    ).not.toBe(key);
  });
});
