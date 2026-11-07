// Run a fast check; forgive only diagnostics also present in an untouched base.
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const root = process.cwd();
const [kind, base] = process.argv.slice(2);
const run = (command, args, cwd) => {
  const result = spawnSync(command, args, { cwd, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 });
  if (result.signal || result.error || result.status === 137) {
    console.error(result.error ?? `Check terminated: ${result.signal ?? result.status}`);
    process.exit(result.status === 137 || result.signal === 'SIGKILL' ? 137 : 1);
  }
  return { code: result.status, output: result.stdout + result.stderr };
};
const check = (dir) => kind === 'typecheck'
  ? run('npx', ['tsc', '--noEmit', '-p', 'tsconfig.json'], path.join(dir, 'app'))
  : run('bash', ['scripts/lint-changed.sh'], dir);
const current = check(root);
process.stdout.write(current.output);
if (current.code === 0) process.exit(0);

const temp = mkdtempSync(path.join(tmpdir(), 'mychelin-verify-base-'));
// Also clean up early process.exit paths (for example a killed baseline tsc).
process.on('exit', () => rmSync(temp, { recursive: true, force: true }));
try {
  const archive = execFileSync('git', ['archive', base], { maxBuffer: 100 * 1024 * 1024 });
  execFileSync('tar', ['-x', '-C', temp], { input: archive });
  symlinkSync(path.join(root, 'app/node_modules'), path.join(temp, 'app/node_modules'));
  let baseline;
  let currentDiagnostics;
  let baseDiagnostics;
  if (kind === 'typecheck') {
    baseline = check(temp);
    // Line numbers move when code is inserted. Keep file, TS code and full message.
    const normalize = (output) => output.trim().split('\n')
      .map(line => line.replace(/\(\d+,\d+\): error /, ': error '));
    currentDiagnostics = normalize(current.output);
    baseDiagnostics = normalize(baseline.output);
    if (!current.output.includes(': error TS')) process.exit(current.code);
  } else {
    // Compare structured ESLint diagnostics for exactly the changed files, including
    // untracked files. A new file absent from the base can never be pre-existing.
    const files = [...new Set([
      ...execFileSync('git', ['diff', '--name-only', base, '--diff-filter=d', '--', 'app/src', 'app/scripts'], { encoding: 'utf8' }).trim().split('\n'),
      ...execFileSync('git', ['ls-files', '--others', '--exclude-standard', '--', 'app/src', 'app/scripts'], { encoding: 'utf8' }).trim().split('\n'),
    ])].filter(file => /\.(ts|tsx|mts)$/.test(file));
    const lint = (dir) => {
      const present = files.filter(file => existsSync(path.join(dir, file)));
      return present.length
        ? run('npx', ['eslint', '--format', 'json', ...present.map(file => path.relative('app', file))], path.join(dir, 'app'))
        : { code: 0, output: '[]' };
    };
    const normalize = (output, dir) => JSON.parse(output).flatMap(file => file.messages
      .filter(message => message.severity === 2)
      .map(message => JSON.stringify([path.relative(dir, file.filePath), message.ruleId, message.message])));
    const structured = lint(root);
    baseline = lint(temp);
    currentDiagnostics = normalize(structured.output, root);
    baseDiagnostics = normalize(baseline.output, temp);
  }
  console.log(`\nBase comparison (${base}):\n${baseline.output}`);
  const remaining = [...baseDiagnostics];
  const matches = currentDiagnostics.length > 0 && currentDiagnostics.every(diagnostic => {
    const index = remaining.indexOf(diagnostic);
    if (index < 0) return false;
    remaining.splice(index, 1);
    return true;
  });
  if (baseline.code !== 0 && matches) {
    console.log(`PRE-EXISTING: all ${kind} diagnostics also exist at ${base}.`);
  } else {
    console.error(`New or unclassified ${kind} failure; baseline does not excuse it.`);
    process.exitCode = current.code;
  }
} finally {
  rmSync(temp, { recursive: true, force: true });
}
