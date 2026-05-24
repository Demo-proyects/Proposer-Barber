import sharp from 'sharp';
import { execSync } from 'child_process';
import { mkdtempSync, statSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

async function convertAnimated(input, output, scale) {
  const tmp = mkdtempSync(join(tmpdir(), 'frames-'));
  const meta = await sharp(input).metadata();
  const pages = meta.pages;
  const rate = Math.round(pages / (meta.delay ? meta.delay.reduce((a,b)=>a+b,0) / (meta.delay.length * 1000) : 15));

  console.log(input, ':', pages, 'frames,', meta.width, 'x', meta.height);

  for (let i = 0; i < pages; i++) {
    const f = String(i).padStart(5, '0');
    await sharp(input, { page: i }).resize(scale).png().toFile(join(tmp, `f${f}.png`));
    if (i % 50 === 0) process.stdout.write('.');
  }

  const out = output.replace(/\\/g, '/');
  const inp = join(tmp, 'f%05d.png').replace(/\\/g, '/');
  execSync(`ffmpeg -y -framerate ${rate} -i "${inp}" -c:v libwebp_anim -quality 65 -loop 0 "${out}"`, { stdio: 'pipe' });
  rmSync(tmp, { recursive: true, force: true });

  const oldKb = (statSync(input).size / 1024).toFixed(1);
  const newKb = (statSync(output).size / 1024).toFixed(1);
  console.log(`\n  ${oldKb}KB -> ${newKb}KB (${((1-newKb/oldKb)*100).toFixed(0)}%↓)`);
}

const files = [
  ['ava/nara-espera.webp', 160],
  ['ava/nara-speak.webp', 160],
];

for (const [f, s] of files) {
  await convertAnimated(f, f + '.tmp', s);
  console.log();
}
