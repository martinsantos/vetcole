// Arma la página para publicar como Artifact de Claude: un solo archivo con CSS y JS embebidos y sin
// <!doctype>/<html>/<head>/<body> (el visor los agrega al publicar). Salida: dist-claude/colvet-digital.html
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

execSync('npx vite build --config vite.claude.config.js', { stdio: 'inherit' });
const dist = path.resolve('dist-claude');
const html = fs.readFileSync(path.join(dist, 'index.html'), 'utf8');
const css = [...html.matchAll(/<link rel="stylesheet"[^>]*href="\.\/([^"]+)"/g)].map(m => fs.readFileSync(path.join(dist, m[1]), 'utf8')).join('\n');
const js = [...html.matchAll(/<script type="module"[^>]*src="\.\/([^"]+)"/g)].map(m => fs.readFileSync(path.join(dist, m[1]), 'utf8')).join('\n');
const fonts = (html.match(/<link href="https:\/\/fonts\.googleapis\.com[^>]+>/) || [''])[0];
const safeJs = js.replace(/<\/script/gi, '<\\/script').replace(/<!--/g, '<\\!--');
const page = `<title>ColVet Digital</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
${fonts}
<style>${css}</style>
<div id="root"></div>
<script type="module">${safeJs}</script>
`;
const out = path.join(dist, 'colvet-digital.html');
fs.writeFileSync(out, page);
console.log(`Página para Claude: ${out} (${(page.length / 1024).toFixed(0)} KB)`);
