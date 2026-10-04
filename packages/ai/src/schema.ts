import { z } from 'zod';

/** Structured output requested from Claude (runtime-ai.md "AI response schema"). */
export const recommendationOutputSchema = z.object({
  recommendations: z.array(
    z.object({
      issueId: z.string(),
      explanation: z.string(),
      probableCause: z.string(),
      recommendedChange: z.object({
        language: z.enum(['css', 'scss', 'tailwind', 'javascript', 'typescript', 'other']),
        code: z.string(),
      }),
      caveats: z.array(z.string()),
    }),
  ),
  groupSummary: z.string(),
});

export type RecommendationOutput = z.infer<typeof recommendationOutputSchema>;

/** Stored/returned recommendation. Never contains measured values. */
export interface AIRecommendation {
  issueId: string;
  explanation: string;
  probableCause?: string;
  recommendedChange?: {
    language: 'css' | 'scss' | 'tailwind' | 'javascript' | 'typescript' | 'other';
    code: string;
  };
  caveats?: string[];
}

export interface GroupRecommendation {
  summary: string;
  recommendations: AIRecommendation[];
  model: string;
  promptVersion: string;
}
