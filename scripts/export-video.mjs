import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

export function exportVideo(source, destination) {
  const encoders = execFileSync('ffmpeg', ['-hide_banner', '-encoders'], { encoding: 'utf8' });
  const codec = /\blibx264\b/.test(encoders)
    ? ['-c:v', 'libx264', '-preset', 'veryfast', '-crf', '22']
    : ['-c:v', 'libopenh264', '-b:v', '3M'];
  execFileSync(
    'ffmpeg',
    [
      '-hide_banner',
      '-loglevel',
      'error',
      '-y',
      '-i',
      source,
      ...codec,
      '-pix_fmt',
      'yuv420p',
      '-movflags',
      '+faststart',
      destination,
    ],
    { stdio: ['ignore', 'ignore', 'inherit'] },
  );
  console.info(`Saved ${destination}`);
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  if (!process.argv[2])
    throw new Error('Usage: node scripts/export-video.mjs input.webm [output.mp4]');
  exportVideo(process.argv[2], process.argv[3] ?? 'artifacts/demo/miniledger-demo.mp4');
}
