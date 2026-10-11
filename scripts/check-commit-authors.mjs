/**
 * Fails when a commit of a range names an AI agent as its author, its committer or a co-author.
 *
 * Only humans are authors in this repo (see CONTRIBUTING.md, "AI tools"): the GitHub
 * contributors list and the Insights graph count the co-authors of a commit too, so a single
 * agent trailer puts the agent in them.
 *
 * Usage:
 *   node scripts/check-commit-authors.mjs <range>     e.g. origin/v0.5.0..HEAD
 */

import { execFileSync } from 'node:child_process';

const AGENT = /claude|anthropic|copilot|openai|chatgpt|codex|cursoragent|gemini|devin-ai|aider/i;

const range = process.argv[2];
if (!range) {
  console.error('usage: node scripts/check-commit-authors.mjs <range>');
  process.exit(2);
}

const SEP = '\u0001';
const log = execFileSync(
  'git',
  ['log', `--format=%h${SEP}%an <%ae>${SEP}%cn <%ce>${SEP}%B${SEP}${SEP}`, range],
  { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 },
);

const problems = [];
for (const entry of log.split(SEP + SEP).filter(e => e.trim())) {
  const [hash, author, committer, message] = entry.replace(/^\n/, '').split(SEP);
  if (AGENT.test(author)) problems.push(`${hash}: author is an AI agent (${author})`);
  if (AGENT.test(committer)) problems.push(`${hash}: committer is an AI agent (${committer})`);
  for (const line of message.split('\n')) {
    const attribution = /^\s*(co-authored-by|[\w-]+-session):|generated with/i.test(line);
    if (attribution && AGENT.test(line)) problems.push(`${hash}: ${line.trim()}`);
  }
}

if (problems.length > 0) {
  console.error('✖ only humans author commits in this repo (CONTRIBUTING.md, "AI tools"):');
  for (const problem of problems) console.error(`  ${problem}`);
  console.error('Remove these lines with `git rebase -i` (reword), then push again.');
  process.exit(1);
}
console.log(`✔ no AI agent in the authors of ${range}`);
