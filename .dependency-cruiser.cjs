/**
 * Module boundaries (BUILD_PLAN.md section 5): feature modules never import each other.
 * They may import core, integrations and their own _shared helpers. Cross-module work goes through events.
 */
const MODULES = '^packages/modules/src/([^/_][^/]*)/'

module.exports = {
  forbidden: [
    {
      name: 'no-cross-module-imports',
      severity: 'error',
      comment: 'Feature modules communicate through events, not imports.',
      from: { path: MODULES },
      to: { path: '^packages/modules/src/([^/_][^/]*)/', pathNot: ['^packages/modules/src/$1/'] },
    },
    {
      name: 'core-is-standalone',
      severity: 'error',
      comment: 'core must not depend on modules, integrations, themes or the app.',
      from: { path: '^packages/core/' },
      to: { path: '^(packages/(modules|integrations|themes|ui)|apps)/' },
    },
    {
      name: 'packages-do-not-import-the-app',
      severity: 'error',
      from: { path: '^packages/' },
      to: { path: '^apps/' },
    },
    {
      name: 'no-circular',
      severity: 'warn',
      from: {},
      to: { circular: true },
    },
  ],
  options: {
    doNotFollow: { path: 'node_modules' },
    exclude: { path: '(node_modules|\\.next|test-results)' },
    tsPreCompilationDeps: true,
    tsConfig: { fileName: 'tsconfig.base.json' },
    enhancedResolveOptions: { exportsFields: ['exports'], conditionNames: ['import', 'require', 'node', 'default', 'types'] },
  },
}
