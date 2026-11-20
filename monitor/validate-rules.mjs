// The validator of the alert rules of MON-1 (priitkustala/ai-news-frontend#57). It reads the rules
// file given as its one argument and prints one line per fault, naming the rule (its uid, or rule and
// its index when the uid is missing) and the fault; it exits 1 on any fault and prints rules OK with
// the rule count and exits 0 on a good file. It only reads the file and the probe names of
// monitor/probes.mjs; importing that script runs no probe, and nothing here sends a request.
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { PROBES } from './probes.mjs';

const SEVERITIES = ['warning', 'critical'];
const OUTAGE_VALUES = ['yes', 'no'];

// The fault lines of a parsed rules file; an empty list when it is valid.
export function faultsOf(document) {
  if (document === null || typeof document !== 'object' || !Array.isArray(document.rules)) {
    return ['rules file has no rules list'];
  }
  const faults = [];
  const seen = new Set();
  document.rules.forEach((rule, index) => {
    if (rule === null || typeof rule !== 'object' || Array.isArray(rule)) {
      faults.push(`rule ${index} is not an object`);
      return;
    }
    const hasUid = typeof rule.uid === 'string' && rule.uid.trim() !== '';
    const name = hasUid ? rule.uid : `rule ${index}`;
    if (!hasUid) faults.push(`${name} uid missing`);
    else if (seen.has(rule.uid)) faults.push(`${name} duplicate uid`);
    else seen.add(rule.uid);
    if (!SEVERITIES.includes(rule.severity)) faults.push(`${name} severity must be warning or critical`);
    if (!Number.isInteger(rule.for) || rule.for < 1) faults.push(`${name} for missing or not a positive integer`);
    if (!PROBES.includes(rule.probe)) faults.push(`${name} probe not in monitor/probes.mjs`);
    if (!OUTAGE_VALUES.includes(rule.outage)) faults.push(`${name} outage missing or not yes or no`);
    else if (rule.outage === 'yes' && rule.severity !== 'critical') faults.push(`${name} outage yes on a rule that is not critical`);
  });
  return faults;
}

function main() {
  const path = process.argv[2];
  if (!path || process.argv.length > 3) {
    console.log('usage: node monitor/validate-rules.mjs <rules file>');
    process.exit(2);
  }
  let document;
  try {
    document = JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    console.log('rules file unreadable or not JSON');
    process.exit(1);
  }
  const faults = faultsOf(document);
  for (const fault of faults) console.log(fault);
  if (faults.length > 0) process.exit(1);
  console.log(`rules OK ${document.rules.length}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
