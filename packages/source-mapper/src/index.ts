export { SourceRepositoryError, fetchGitHubStylesheets } from './github';
export type { GitHubRepository, GitHubSourceOptions } from './github';
export { locateDeclarations, mediaApplies, relatedProperties } from './locate';
export type { SourceFile, SourceMatch } from './locate';
export { ruleScore, selectorScore } from './match';
export type { ElementIdentity } from './match';
export { parseStylesheet } from './parse';
export type { Declaration, StyleRule } from './parse';
export { proposePatch, rewriteShorthand } from './patch';
