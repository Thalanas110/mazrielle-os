import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';

const isWindows = process.platform === 'win32';
const command = isWindows ? process.env.ComSpec ?? 'cmd.exe' : 'npx';
const args = isWindows
  ? ['/d', '/s', '/c', 'npx supabase gen types typescript --linked']
  : ['supabase', 'gen', 'types', 'typescript', '--linked'];
const types = execFileSync(command, args, {
  encoding: 'utf8',
  stdio: ['inherit', 'pipe', 'inherit'],
});

writeFileSync(new URL('../src/lib/supabase.types.ts', import.meta.url), types, 'utf8');
