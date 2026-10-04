import Anthropic from '@anthropic-ai/sdk';
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod';

import { AiProviderError } from './errors';
import type { IssueGroupPayload } from './payload';
import { SYSTEM_PROMPT } from './prompts';
import { recommendationOutputSchema, type RecommendationOutput } from './schema';

export const DEFAULT_MODEL = 'claude-opus-5-5';

/** Model boundary; tests substitute a fake. */
export interface RecommendationModel {
  readonly model: string;
  recommend(payload: IssueGroupPayload): Promise<RecommendationOutput>;
}

/**
 * Claude via the Anthropic SDK with schema-constrained output. Refusals fall
 * back server-side (`fallbacks: 'default'`); a remaining refusal or
 * unparseable output surfaces as an AiProviderError.
 */
export function createClaudeModel(options: {
  apiKey: string;
  model?: string | undefined;
  timeoutMs?: number;
}): RecommendationModel {
  const client = new Anthropic({
    apiKey: options.apiKey,
    timeout: options.timeoutMs ?? 60_000,
    maxRetries: 2,
  });
  const model = options.model ?? DEFAULT_MODEL;
  return {
    model,
    async recommend(payload) {
      let response;
      try {
        response = await client.beta.messages.parse({
          model,
          max_tokens: 16_000,
          betas: ['server-side-fallback-2026-07-01'],
          fallbacks: 'default',
          system: SYSTEM_PROMPT,
          messages: [{ role: 'user', content: JSON.stringify(payload) }],
          output_config: {
            effort: 'medium',
            format: betaZodOutputFormat(recommendationOutputSchema),
          },
        });
      } catch (error) {
        if (error instanceof Anthropic.RateLimitError)
          throw new AiProviderError('rate-limited', 'Claude is rate limited; try again shortly.', {
            cause: error,
          });
        if (error instanceof Anthropic.APIError)
          throw new AiProviderError(
            'provider-error',
            `Claude request failed (${String(error.status)}).`,
            { cause: error },
          );
        throw new AiProviderError('provider-error', 'Claude could not be reached.', {
          cause: error,
        });
      }
      if (response.stop_reason === 'refusal') {
        throw new AiProviderError('refused', 'Claude declined to explain these differences.');
      }
      if (!response.parsed_output) {
        throw new AiProviderError(
          'invalid-output',
          'Claude returned output that does not match the schema.',
        );
      }
      return response.parsed_output;
    },
  };
}
