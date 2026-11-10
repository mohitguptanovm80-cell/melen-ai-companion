const ts = require('typescript');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const files = ['src/types/index.ts', 'src/utils/modelHelpers.ts', 'src/utils/backendUrl.ts', 'src/components/3d/AnimationController.ts', 'src/services/providerService.ts', 'src/services/aiService.ts'];
for (const file of files) {
  const output = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } });
  const dest = path.join('.test-build', file.replace(/\.ts$/, '.js'));
  fs.mkdirSync(path.dirname(dest), { recursive: true }); fs.writeFileSync(dest, output.outputText);
}
const result = spawnSync(process.execPath, ['--test', 'tests/core.cjs', 'tests/native.cjs'], { stdio: 'inherit' });
process.exitCode = result.status ?? 1;
