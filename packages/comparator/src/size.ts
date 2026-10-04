import { compareLength, type Finding, type PairContext } from './context';

/**
 * Width/height for boxes. Text boxes are skipped: their size follows font
 * metrics and wrapping, which typography and position comparisons cover.
 */
export function compareSize(context: PairContext): Finding[] {
  const { design, implementation, scale, tolerances } = context;
  if (!design.parentId || context.sharesParentImplementation || design.type === 'text') return [];
  return [
    compareLength(
      'size',
      'bounds.width',
      implementation.bounds.width,
      design.bounds.width * scale,
      tolerances.sizePx,
    ),
    compareLength(
      'size',
      'bounds.height',
      implementation.bounds.height,
      design.bounds.height * scale,
      tolerances.sizePx,
    ),
  ].filter((finding): finding is Finding => finding !== null);
}
