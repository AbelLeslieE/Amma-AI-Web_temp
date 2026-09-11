import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

// Use the installed CLI directly so the same command works on Windows and Linux.
const cli = fileURLToPath(new URL('../node_modules/vinext/dist/cli.js', import.meta.url));
const result = spawnSync(process.execPath, [cli, 'build'], {
  stdio: 'inherit',
  env: { ...process.env, AMMA_DEPLOY_TARGET: 'node' },
});
if (result.error) throw result.error;
process.exit(result.status ?? 1);
