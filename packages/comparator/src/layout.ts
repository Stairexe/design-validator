import { compareKeyword, type Finding, type PairContext } from './context';

const START_END: Record<string, string> = {
  start: 'flex-start',
  end: 'flex-end',
  left: 'flex-start',
  right: 'flex-end',
};
// `normal` behaves as `stretch` on the cross axis and `flex-start` on the main axis.
const normalizeAlign = (value: string) =>
  value === 'normal' ? 'stretch' : (START_END[value] ?? value);
const normalizeJustify = (value: string) =>
  value === 'normal' ? 'flex-start' : (START_END[value] ?? value);
const isFlexLike = (display: string | null | undefined) =>
  Boolean(display && /flex|grid/.test(display));

/**
 * Layout behaviour, only where both sides express it. Design auto layout is
 * not a literal `display:flex` requirement (comparison-engine.md §8): when the
 * implementation lays out differently, spacing and position checks measure the
 * resulting behaviour instead.
 */
export function compareLayout(context: PairContext): Finding[] {
  const { design, implementation } = context;
  if (
    context.sharesParentImplementation ||
    !design.layout.flexDirection ||
    !isFlexLike(implementation.layout.display)
  )
    return [];
  // Grid tracks have no direction equivalent; compare alignment only.
  const isGrid = /grid/.test(implementation.layout.display ?? '');
  const visibleChildren = design.childIds.filter(
    (id) => context.designById.get(id)?.visibility.visible,
  ).length;

  return [
    isGrid
      ? null
      : compareKeyword(
          'layout',
          'layout.flexDirection',
          implementation.layout.flexDirection?.replace('-reverse', ''),
          design.layout.flexDirection,
          'high',
        ),
    // Main-axis distribution only matters with more than one child.
    isGrid || visibleChildren < 2
      ? null
      : compareKeyword(
          'layout',
          'layout.justifyContent',
          implementation.layout.justifyContent,
          design.layout.justifyContent,
          'medium',
          normalizeJustify,
        ),
    isGrid
      ? null
      : compareKeyword(
          'layout',
          'layout.alignItems',
          implementation.layout.alignItems,
          design.layout.alignItems,
          'low',
          normalizeAlign,
        ),
  ].filter((finding): finding is Finding => finding !== null);
}
