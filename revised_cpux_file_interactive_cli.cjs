#!/usr/bin/env node
// cpux_file_interactive_cli.cjs
// Interactive demo wired to cpux_core.js (uses Gatekeeper + immediate absorption model).
// Usage unchanged. This file delegates runtime to cpux_core.CPUX.

'use strict';

const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const readline = require('readline');
const { Pulse, Signal, CPUX } = require('./revised-cpux-core.cjs'); // <- use updated core

/* ---------- CLI arg parsing ---------- */
const argv = process.argv.slice(2);
function findArg(name) {
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === name && argv[i+1]) return argv[i+1];
    if (argv[i].startsWith(name + '=')) return argv[i].split('=')[1];
  }
  return null;
}
const cliSpecPath = findArg('--spec') || findArg('--spec=') || null;
const cliFilePath = findArg('--file') || findArg('--file=') || null;
const nonInteractiveFlag = argv.includes('--noninteractive') || argv.includes('--no-interactive');

/* ---------- Spec loader ---------- */
function tryLoadSpecFromPath(p) {
  try {
    if (!p) return null;
    const rp = path.resolve(process.cwd(), p);
    if (!fsSync.existsSync(rp)) return null;
    const raw = fsSync.readFileSync(rp, 'utf8');
    return JSON.parse(raw);
  } catch (e) {
    console.error(`Failed to load/parse spec file ${p}:`, e && e.message);
    return null;
  }
}

let specFromFile = null;
if (cliSpecPath) specFromFile = tryLoadSpecFromPath(cliSpecPath);
if (!specFromFile) {
  const defaultLocal = path.resolve(process.cwd(), 'spec.json');
  specFromFile = tryLoadSpecFromPath(defaultLocal);
  if (specFromFile) console.log(`Loaded spec from ${defaultLocal}`);
}
const spec = specFromFile || {
  maxSnapshotRepeat: 2,
  maxPasses: 10,
  externalSeeds: [],
  designSequence: [
    { type: 'DN', id: 'DN1', seqIndex: 1, boundObject: 'O1', boundSeqIndex: 2, gate: { matchMode: 'always' }, produces: ['fileready'] },
    { type: 'Object', id: 'O1', seqIndex: 2 },
    { type: 'DN', id: 'DN2', seqIndex: 3, boundObject: 'O2', boundSeqIndex: 4, gate: { matchMode: 'hasPrompt', signal: { pulses: [{ prompt: 'fileready' }] } }, produces: ['wordcount'] },
    { type: 'Object', id: 'O2', seqIndex: 4 }
  ]
};

if (!specFromFile && cliSpecPath) console.warn(`Could not load spec from ${cliSpecPath}; using built-in spec.`);

/* ---------- small interactive helpers ---------- */
function questionAsync(prompt) {
  return new Promise(resolve => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question(prompt, ans => { rl.close(); resolve(ans); });
  });
}
async function chooseFileFromDir(dir = process.cwd(), extFilter = []) {
  try {
    const entries = await fs.readdir(dir);
    const files = [];
    for (const e of entries) {
      try {
        const st = await fs.stat(path.join(dir, e));
        if (st.isFile()) {
          if (!extFilter.length) files.push(e);
          else {
            const ext = path.extname(e).toLowerCase();
            if (extFilter.includes(ext)) files.push(e);
          }
        }
      } catch(_) {}
    }
    if (files.length === 0) return null;
    const maxShow = 40;
    const show = files.slice(0, maxShow);
    console.log('\nFiles in current directory:');
    show.forEach((f, i) => console.log(`  ${i+1}. ${f}`));
    if (files.length > maxShow) console.log(`  ... (${files.length - maxShow} more)`);
    const pick = (await questionAsync('\nType file number to pick, or press Enter to cancel: ')).trim();
    const n = parseInt(pick, 10);
    if (!isNaN(n) && n >= 1 && n <= show.length) return path.join(dir, show[n-1]);
    return null;
  } catch (err) {
    return null;
  }
}

/* ---------- DN implementations (use cpux_core's Pulse/Signal types) ---------- */
async function dn1_file_reader_factory(selectedFilePath) {
  // returns an async DN function that reads the provided path
  return async function dn1_fn(txnCtx, incomingIntention, incomingSignal, cpuXFieldSignal) {
    if (!selectedFilePath) {
      console.log('DN1: no file selected; using built-in sample text.');
      const sample = 'Sample text used because no file was selected.';
      const p = new Pulse('fileready', [sample], 'Y', { type: 'DN', id: 'DN1' });
      return { emitted: [{ intention: 'fileready', signal: new Signal('sig_dn1', [p]) }] };
    }
    try {
      const content = await fs.readFile(selectedFilePath, 'utf8');
      console.log(`DN1: read file "${selectedFilePath}" (${content.length} bytes)`);
      const p = new Pulse('fileready', [content], 'Y', { type: 'DN', id: 'DN1' });
      return { emitted: [{ intention: 'fileready', signal: new Signal('sig_dn1', [p]) }] };
    } catch (err) {
      console.error(`DN1: failed to read file "${selectedFilePath}":`, err && err.message);
      return { emitted: [] };
    }
  };
}
async function dn2_fn(txnCtx, incomingIntention, incomingSignal, cpuXFieldSignal) {
  const p = cpuXFieldSignal.pulses.get('fileready');
  if (!p) return { emitted: [] };
  const text = (p.responses && p.responses[0]) || '';
  const words = text.trim().split(/\s+/).filter(Boolean);
  const count = words.length;
  console.log('DN2: computed wordcount =', count);
  const pc = new Pulse('wordcount', [String(count)], 'Y', { type: 'DN', id: 'DN2' });
  return { emitted: [{ intention: 'wordcount', signal: new Signal('sig_dn2', [pc]) }] };
}

/* ---------- Run flow ---------- */
(async function main() {
  try {
    console.log('CPUX interactive demo starting...');
    // Determine selected file
    let selected = null;
    if (cliFilePath) {
      const resolved = path.resolve(process.cwd(), cliFilePath);
      if (fsSync.existsSync(resolved) && fsSync.statSync(resolved).isFile()) {
        selected = resolved;
        console.log(`Using file from --file: ${selected}`);
      } else {
        console.warn(`--file ${cliFilePath} not found or not a file; ignoring.`);
      }
    }

    if (!selected && !nonInteractiveFlag && process.stdin.isTTY) {
      // interactive prompt
      console.log('\nChoose a file for DN1 to read (press Enter to browse):');
      const typed = (await questionAsync('Type filename (relative) or press Enter to browse files in current directory: ')).trim();
      if (typed) {
        const resolved = path.resolve(process.cwd(), typed);
        if (fsSync.existsSync(resolved) && fsSync.statSync(resolved).isFile()) selected = resolved;
        else {
          console.log(`"${typed}" not found or not a file. Showing directory list...`);
          const pick = await chooseFileFromDir(process.cwd(), ['.txt', '.md', '.js', '.json', '.csv']);
          if (pick) selected = pick;
        }
      } else {
        const pick = await chooseFileFromDir(process.cwd(), ['.txt', '.md', '.js', '.json', '.csv']);
        if (pick) selected = pick;
      }
    }

    if (selected) console.log(`Selected file: ${selected}`);
    else if (nonInteractiveFlag) console.log('Non-interactive mode: no file provided; using sample text.');
    else console.log('No file chosen — demo will use built-in sample text.');

    const dn1fn = await dn1_file_reader_factory(selected);
    const dnFns = { 'DN1': dn1fn, 'DN2': dn2_fn };
    const cpux = new CPUX(spec, { dnFns, txnCtx: { txId: `tx-interactive-${Date.now()}` } });

    const result = await cpux.run();
    console.log('\nFinal result:', result);

    for (const id of Object.keys(cpux.objRegistry)) {
      console.log('\n--- Object', id, 'field snapshot:');
      console.log(JSON.stringify(cpux.objRegistry[id].field.snapshotObject(), null, 2));
    }

    // show gatekeeper history for visibility (useful in teaching)
    console.log('\nGatekeeper pass-area history (per object):');
    for (const [k, v] of Object.entries(cpux.gatekeeper.history)) {
      console.log(`  ${k}: ${v.length} events`);
    }

    process.exit(0);
  } catch (err) {
    console.error('Fatal error:', err && err.message);
    process.exit(1);
  }
})();
