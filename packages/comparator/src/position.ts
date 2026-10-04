import { compareLength, type Finding, type PairContext } from './context';

/**
 * Position relative to the matched parent on each side, so a parent's
 * padding change is reported once instead of moving every descendant.
 */
export function comparePosition(context: PairContext): Finding[] {
  const { design, implementation, scale, tolerances } = context;
  if (!design.parentId || context.sharesParentImplementation) return [];
  const designParent = context.designById.get(design.parentId);
  const implParentId = context.matchByDesign.get(design.parentId);
  const implParent = implParentId ? context.implementationById.get(implParentId) : undefined;
  if (!designParent || !implParent) return [];

  const findings = [
    compareLength(
      'position',
      'bounds.x',
      implementation.bounds.x - implParent.bounds.x,
      (design.bounds.x - designParent.bounds.x) * scale,
      tolerances.positionPx,
    ),
    compareLength(
      'position',
      'bounds.y',
      implementation.bounds.y - implParent.bounds.y,
      (design.bounds.y - designParent.bounds.y) * scale,
      tolerances.positionPx,
    ),
  ];
  return findings.filter((finding): finding is Finding => finding !== null);
}
