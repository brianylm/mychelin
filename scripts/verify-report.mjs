import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';

const file = '.verify/last.json';
const now = () => new Date(Date.now() + 8 * 3_600_000).toISOString().replace('Z', '+08:00');
const [command, ...args] = process.argv.slice(2);
if (command === 'start') {
  writeFileSync(file, JSON.stringify({
    level: args[0],
    git_sha: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
    git_dirty: Boolean(execFileSync('git', ['status', '--porcelain'], { encoding: 'utf8' }).trim()),
    started_at: now(), finished_at: null, steps: [], flaky: [], known_failing: [], result: 'fail',
  }, null, 2) + '\n');
} else {
  const report = JSON.parse(readFileSync(file, 'utf8'));
  if (command === 'step') {
    const [name, status, duration, log] = args;
    report.steps.push({ name, status, duration_s: Number(duration), log });
  } else if (command === 'known-failing') {
    report.known_failing.push({ name: args[0], baseline: args[1], evidence: args.slice(2) });
  } else if (command === 'playwright') {
    const results = JSON.parse(readFileSync(args[0], 'utf8'));
    report.flaky = [];
    const visit = (suite, parents = []) => {
      const titles = [...parents, suite.title].filter(Boolean);
      for (const spec of suite.specs ?? []) {
        for (const test of spec.tests ?? []) {
          if (test.status !== 'flaky') continue;
          report.flaky.push({
            file: spec.file, line: spec.line,
            title: [...titles, spec.title].join(' › '),
            project: test.projectName,
            retries: Math.max(...test.results.map(result => result.retry)),
          });
        }
      }
      for (const child of suite.suites ?? []) visit(child, titles);
    };
    for (const suite of results.suites) visit(suite);
    const { expected, unexpected, flaky, skipped } = results.stats;
    report.playwright = { total: expected + unexpected + flaky + skipped, expected, unexpected, flaky, skipped };
    console.log(`Playwright: ${expected} passed, ${flaky} flaky, ${unexpected} failed, ${skipped} skipped.`);
  } else if (command === 'finish') {
    report.finished_at = now();
    report.duration_s = (Date.parse(report.finished_at) - Date.parse(report.started_at)) / 1000;
    report.result = args[0] === '0' ? 'pass' : 'fail';
    console.log('\nStep                         Status         Seconds');
    for (const step of report.steps) console.log(`${step.name.padEnd(28)} ${step.status.padEnd(14)} ${step.duration_s}`);
    console.log(`${'flaky tests'.padEnd(28)} ${String(report.flaky.length).padEnd(14)} —`);
    for (const test of report.flaky) console.log(`  [${test.project}] ${test.title} (${test.file}:${test.line}, retries: ${test.retries})`);
    for (const failure of report.known_failing) console.log(`KNOWN_FAILING: ${failure.name} (${failure.baseline}); evidence: ${failure.evidence.join(', ')}`);
    console.log(`Total: ${report.duration_s.toFixed(1)}s`);
    console.log(`Result: ${report.result.toUpperCase()} — ${file}`);
  } else throw new Error(`Unknown report command: ${command}`);
  writeFileSync(file, JSON.stringify(report, null, 2) + '\n');
}
