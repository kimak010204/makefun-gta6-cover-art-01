// Vice Sunset Cover Studio — entry program (Node 22, standard library only).
// The app is plain static files under app/ (index.html plus its ES modules, fonts
// and sample photos; it runs offline in desktop Chrome). This program hands the
// entry in: it copies app/ and screenshots/ from beside this file into /output
// and writes /output/dossier.json with the vendored make.fun library, so the
// judge reads the same files the gate scored.
//
// Serve it locally with `node serve.ts`, then open http://localhost:8080.
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(outputDir, { recursive: true });
cpSync(join(repoRoot, 'app'), join(outputDir, 'app'), { recursive: true });

const shotsDir = join(repoRoot, 'screenshots');
mkdirSync(join(outputDir, 'screenshots'), { recursive: true });
if (existsSync(shotsDir)) cpSync(shotsDir, join(outputDir, 'screenshots'), { recursive: true });

// Caps from the scorer's gate: the dossier text cap shapes the bytes; the rest
// refuse an entry the scorer would refuse (over 4 screenshots, a screenshot over
// 256 KiB, over 993 files or 48 MiB in app/, or an app/ path over 1000 bytes).
// The run is deterministic: same input files, same dossier bytes, every time.
const dossierPath = join(outputDir, 'dossier.json');
writeFileSync(
  dossierPath,
  buildDossier(outputDir, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    app_max_files: 993,
    app_max_bytes: 50331648,
    app_path_max_bytes: 1000,
  }),
);
console.log(`wrote ${dossierPath}`);
