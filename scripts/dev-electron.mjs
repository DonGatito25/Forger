import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');
const isWindows = process.platform === 'win32';
const npmCmd = isWindows ? 'npm.cmd' : 'npm';
const electronCmd = isWindows
  ? path.join(projectRoot, 'node_modules', '.bin', 'electron.cmd')
  : path.join(projectRoot, 'node_modules', '.bin', 'electron');

const rendererUrl = 'http://127.0.0.1:5173';

const waitForUrl = (url, timeoutMs = 30000) =>
  new Promise((resolve, reject) => {
    const startedAt = Date.now();

    const tryConnect = () => {
      const request = http.get(url, (response) => {
        response.resume();
        resolve();
      });

      request.on('error', () => {
        if (Date.now() - startedAt > timeoutMs) {
          reject(new Error(`Timed out waiting for ${url}`));
          return;
        }
        setTimeout(tryConnect, 400);
      });
    };

    tryConnect();
  });

const viteProcess = spawn(npmCmd, ['run', 'dev', '--', '--host', '127.0.0.1', '--port', '5173'], {
  cwd: projectRoot,
  stdio: 'inherit',
  env: process.env,
});

let electronProcess = null;

const shutdown = (exitCode = 0) => {
  if (electronProcess && !electronProcess.killed) electronProcess.kill();
  if (viteProcess && !viteProcess.killed) viteProcess.kill();
  process.exit(exitCode);
};

viteProcess.on('exit', (code) => {
  if (!electronProcess) {
    process.exit(code ?? 1);
    return;
  }
  shutdown(code ?? 0);
});

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));

try {
  await waitForUrl(rendererUrl);
  electronProcess = spawn(electronCmd, ['.'], {
    cwd: projectRoot,
    stdio: 'inherit',
    env: {
      ...process.env,
      ELECTRON_RENDERER_URL: rendererUrl,
    },
  });

  electronProcess.on('exit', (code) => {
    shutdown(code ?? 0);
  });
} catch (error) {
  console.error(error.message);
  shutdown(1);
}
