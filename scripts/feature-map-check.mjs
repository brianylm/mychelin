#!/usr/bin/env node
// Run from the repository root. No dependencies or application env needed.
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

const problems = [];
if (!existsSync('FEATURES.md')) {
  console.error('feature-map: missing FEATURES.md');
  process.exit(1);
}
const map = readFileSync('FEATURES.md', 'utf8');
const ids = [...map.matchAll(/\{#([^}\s]+)\}/g)].map(match => match[1]);
const seen = new Set();
for (const id of ids) {
  if (seen.has(id)) problems.push(`duplicate feature id: ${id}`);
  seen.add(id);
}
const paths = new Set([...map.matchAll(/`([^`\n]+)`/g)]
  .map(match => match[1])
  .filter(value => /^(?:app|scripts|docs|\.github)\//.test(value)
    || /^(?:[\w.-]+\.[a-zA-Z0-9]+|[A-Z][A-Z0-9_-]+|Dockerfile|Makefile|\.[\w.-]+)$/.test(value)));
for (const file of paths) {
  if (path.isAbsolute(file) || file.split('/').includes('..') || !existsSync(file)) {
    problems.push(`missing mapped path: ${file}`);
  } else if (file.endsWith('/') && !statSync(file).isDirectory()) {
    problems.push(`mapped directory is not a directory: ${file}`);
  }
}
const bareRoots = new Set(['app/src/', 'app/src/app/', 'app/src/app/api/', 'app/src/components/']);
const directories = [...paths].filter(file => file.endsWith('/') && !bareRoots.has(file));
function walk(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const file = `${directory}/${entry.name}`;
    return entry.isDirectory() ? walk(file) : [file];
  });
}
const required = [
  ...walk('app/src/app').filter(file => file.endsWith('/page.tsx')
    || (file.startsWith('app/src/app/api/') && file.endsWith('/route.ts'))),
  ...walk('app/src/components').filter(file => !/(?:^|\/)(?:__tests__|__mocks__)(?:\/|$)|\.(?:test|spec)\.[^/]+$/.test(file)),
];
for (const file of required) {
  if (!paths.has(file) && !directories.some(directory => file.startsWith(directory))) {
    problems.push(`unmapped file: ${file}`);
  }
}
if (problems.length) {
  console.error(`feature-map: FAILED\n${problems.map(problem => `- ${problem}`).join('\n')}`);
  process.exitCode = 1;
} else {
  console.log(`feature-map: OK (${ids.length} features, ${paths.size} paths)`);
}
