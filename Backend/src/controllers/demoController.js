const path = require('path');
const { spawn } = require('child_process');

// Whitelisted demos only — never build a command from user input. Streams
// the same output these scripts print when run directly (`node scripts/...`),
// so a deployed link can show them without a terminal.
const DEMOS = {
  'ai-buyer': { script: 'scripts/aiBuyerAgent.js', args: [], label: 'AI buyer (REST) — happy path' },
  'ai-buyer-fail-fitness': { script: 'scripts/aiBuyerAgent.js', args: ['--fail=fitness'], label: 'AI buyer (REST) — deliberate fitness guardrail rejection' },
  'ai-buyer-fail-budget': { script: 'scripts/aiBuyerAgent.js', args: ['--fail=budget'], label: 'AI buyer (REST) — deliberate budget guardrail rejection' },
  'mcp-buyer': { script: 'scripts/mcpBuyerAgent.js', args: [], label: 'AI buyer (MCP) — independent client, no shared secrets' }
};

const BACKEND_ROOT = path.join(__dirname, '..', '..');
const MAX_RUNTIME_MS = 90 * 1000;

let running = false; // simple single-flight guard — this spawns real processes
                      // hitting the real Groq/Razorpay APIs, not something to
                      // let a public link run unbounded in parallel.

exports.listDemos = (req, res) => {
  res.json({
    success: true,
    data: Object.entries(DEMOS).map(([id, d]) => ({ id, label: d.label }))
  });
};

exports.streamDemo = (req, res) => {
  const demoId = req.query.demoId;
  const demo = DEMOS[demoId];

  res.writeHead(demo ? 200 : 400, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no'
  });

  const send = (event, data) => {
    if (event) res.write(`event: ${event}\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  if (!demo) {
    send('error', { message: `Unknown demoId. Valid options: ${Object.keys(DEMOS).join(', ')}` });
    return res.end();
  }

  if (running) {
    send('error', { message: 'Another demo is already running on this server — try again in a moment.' });
    return res.end();
  }

  running = true;
  send('start', { label: demo.label });

  // Point the spawned script at THIS server's own port, whatever it is —
  // don't assume 5000, since a deployed host picks its own PORT.
  const port = process.env.PORT || 5000;
  const child = spawn(process.execPath, [demo.script, ...demo.args], {
    cwd: BACKEND_ROOT,
    env: { ...process.env, AI_BUYER_BASE_URL: `http://localhost:${port}`, ALTITUDE_BASE_URL: `http://localhost:${port}` }
  });

  const emitLines = (buf) => {
    buf.toString('utf8').split('\n').forEach((line) => {
      if (line.trim().length > 0) send('log', { line });
    });
  };

  child.stdout.on('data', emitLines);
  child.stderr.on('data', emitLines);

  const killTimer = setTimeout(() => {
    send('log', { line: '\n[demo runner] Exceeded max runtime — stopping.' });
    child.kill('SIGKILL');
  }, MAX_RUNTIME_MS);

  child.on('close', (code) => {
    clearTimeout(killTimer);
    running = false;
    send('done', { code });
    res.end();
  });

  child.on('error', (err) => {
    clearTimeout(killTimer);
    running = false;
    send('error', { message: err.message });
    res.end();
  });

  req.on('close', () => {
    clearTimeout(killTimer);
    if (!child.killed) child.kill('SIGKILL');
    running = false;
  });
};
