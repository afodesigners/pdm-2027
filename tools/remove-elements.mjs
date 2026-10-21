#!/usr/bin/env node
/**
 * remove-elements.mjs — delete one-line elements from index.html by class or id,
 * and make js/main.js safe so a removed element never causes a JavaScript error.
 *
 * USAGE (run from the project folder, in the VS Code terminal):
 *   node tools/remove-elements.mjs                      # removes the 3 hero labels
 *   node tools/remove-elements.mjs hero__eyebrow        # remove by class name
 *   node tools/remove-elements.mjs heroCap              # ...or by id
 *   node tools/remove-elements.mjs --dry hero__cap      # preview only, change nothing
 *
 * Safe to run twice. Everything is undoable with `git checkout .` before you commit.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const HTML = path.join(root, 'index.html');
const JS = path.join(root, 'js', 'main.js');
const DEFAULTS = ['hero__eyebrow', 'hero__cap', 'hero__scroll'];

const args = process.argv.slice(2);
const dry = args.includes('--dry');
const names = args.filter((a) => !a.startsWith('--'));
const targets = names.length ? names : DEFAULTS;

/* ---- 1. index.html: remove whole one-line elements that carry the class/id ---- */
let html = fs.readFileSync(HTML, 'utf8');
const lines = html.split('\n');
const removed = [];
const kept = lines.filter((line) => {
  const t = line.trim();
  const hit = targets.some((n) =>
    new RegExp(`class="[^"]*\\b${n}\\b[^"]*"|id="${n}"`).test(t));
  if (!hit) return true;
  const tag = (t.match(/^<([a-z0-9]+)/i) || [])[1];
  const oneLine = tag && t.endsWith(`</${tag}>`);
  if (!oneLine) { console.warn(`! Skipped (not a single-line element, remove by hand): ${t.slice(0, 80)}`); return true; }
  removed.push(t.slice(0, 90));
  return false;
});
removed.forEach((r) => console.log('- removed from index.html:', r));
if (!removed.length) console.log('(nothing to remove in index.html — already clean)');

/* ---- 2. js/main.js: null-guard the hero caption so a missing element is harmless ---- */
let js = fs.readFileSync(JS, 'utf8');
const patches = [
  ["const defaultCap = cap.textContent;", "const defaultCap = cap ? cap.textContent : '';"],
  ["if (cap.textContent !== c.dataset.cap) {", "if (cap && cap.textContent !== c.dataset.cap) {"],
  ["cap.textContent = defaultCap;", "if (cap) cap.textContent = defaultCap;"],
  // GSAP warns in the console when an animation targets something you deleted; silence it
  ["gsap.registerPlugin(ScrollTrigger);", "gsap.registerPlugin(ScrollTrigger);\n  gsap.config({ nullTargetWarn: false });   // removed elements are fine"]
];
let patched = 0;
for (const [from, to] of patches) {
  if (js.includes(from) && !js.includes(to)) { js = js.replace(from, to); patched++; }
}
console.log(patched ? `- patched ${patched} line(s) in js/main.js to be null-safe` : '(js/main.js already null-safe)');

if (dry) { console.log('\nDry run — no files written.'); process.exit(0); }
fs.writeFileSync(HTML, kept.join('\n'));
fs.writeFileSync(JS, js);
console.log('\nDone. Preview in Live Server, then: git add . && git commit -m "Remove hero labels" && git push');
