import type { UnresolvedComparison } from '@design-validator/design-spec';

const REASONS: Record<UnresolvedComparison['reason'], string> = {
  'no-match': 'No reliable match',
  ambiguous: 'Ambiguous: several candidates',
  'low-confidence': 'Low match confidence',
};

/** Mappings the matcher refused to present as exact (comparison-engine.md §7). */
export function UnresolvedTable({ unresolved }: { unresolved: UnresolvedComparison[] }) {
  if (unresolved.length === 0)
    return (
      <p className="p-5 text-sm text-zinc-500">
        Every element was matched with sufficient confidence.
      </p>
    );
  return (
    <div className="relative overflow-x-auto">
      <table className="w-full text-left text-sm">
        <caption className="sr-only">Unresolved element mappings</caption>
        <thead className="border-b border-zinc-950/[0.06] bg-zinc-50/60 text-xs text-zinc-500">
          <tr>
            <th className="px-5 py-2.5 font-medium">Viewport</th>
            <th className="px-5 py-2.5 font-medium">Side</th>
            <th className="px-5 py-2.5 font-medium">Element</th>
            <th className="px-5 py-2.5 font-medium">Reason</th>
            <th className="px-5 py-2.5 font-medium">Candidates</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-950/[0.05]">
          {unresolved.map((entry) => (
            <tr key={`${entry.viewportId}-${entry.side}-${entry.elementId}`}>
              <td className="px-5 py-3">{entry.viewportId}</td>
              <td className="px-5 py-3">
                {entry.side === 'design' ? 'Design only' : 'Website only'}
              </td>
              <td className="px-5 py-3 font-medium text-zinc-900">{entry.name}</td>
              <td className="px-5 py-3">{REASONS[entry.reason]}</td>
              <td className="px-5 py-3 font-mono text-xs">
                {entry.candidates
                  ?.map((c) => `${c.elementId} (${c.confidence.toFixed(2)})`)
                  .join(', ') ?? '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
