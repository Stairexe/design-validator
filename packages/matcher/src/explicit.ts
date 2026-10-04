import type { DesignElement, ExplicitMapping } from '@design-validator/design-spec';

/**
 * Resolves explicit evidence: user mappings (by ID or selector) and
 * `data-dv-id` attributes on the website naming a design element ID or name.
 */
export function explicitMatches(
  design: readonly DesignElement[],
  implementation: readonly DesignElement[],
  mappings: readonly ExplicitMapping[],
): { designId: string; implementationId: string; method: 'explicit' | 'source-id' }[] {
  const result: { designId: string; implementationId: string; method: 'explicit' | 'source-id' }[] =
    [];
  const bySelector = new Map(
    implementation.map((element) => [element.source.selector, element.id]),
  );
  const implementationIds = new Set(implementation.map((element) => element.id));

  for (const mapping of mappings) {
    const implementationId =
      mapping.implementationId && implementationIds.has(mapping.implementationId)
        ? mapping.implementationId
        : mapping.implementationSelector
          ? bySelector.get(mapping.implementationSelector)
          : undefined;
    if (implementationId)
      result.push({ designId: mapping.designId, implementationId, method: 'explicit' });
  }

  const mapped = new Set(result.map((entry) => entry.designId));
  for (const element of implementation) {
    const tag = element.source.attributes?.['data-dv-id'];
    if (!tag) continue;
    const target = design.find((d) => !mapped.has(d.id) && (d.id === tag || d.name === tag));
    if (target) {
      result.push({ designId: target.id, implementationId: element.id, method: 'source-id' });
      mapped.add(target.id);
    }
  }
  return result;
}
