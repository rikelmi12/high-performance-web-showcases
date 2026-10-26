// Test page script: tries puppeteer first, then gracefully falls back to native Edge CDP runner
const targetUrl = process.env.SOFTTEC_TEST_URL || 'http://127.0.0.1:8000/softtec/';

async function runPuppeteer() {
  const puppeteer = require('puppeteer');
  const pageErrors = [];
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', error => {
    pageErrors.push(error.message);
    console.log('PAGE ERROR:', error.message);
  });
  page.on('requestfailed', request => console.log('REQUEST FAILED:', request.url(), request.failure()?.errorText));

  await page.setViewport({ width: 1280, height: 800 });
  await page.goto(targetUrl, { waitUntil: 'networkidle2', timeout: 20000 });
  await page.waitForFunction(() => !document.body.classList.contains('loading'), { timeout: 9000 });
  await page.evaluate(() => window.ScrollTrigger?.refresh());
  await new Promise(r => setTimeout(r, 500));
  
  const metrics = await page.evaluate(() => ({
    height: document.documentElement.scrollHeight,
    step: Math.max(400, Math.round(window.innerHeight * 0.72))
  }));
  for (let y = 0; y < metrics.height; y += metrics.step) {
    await page.evaluate((scrollTop) => window.scrollTo({ top: scrollTop, behavior: 'instant' }), y);
    await new Promise(r => setTimeout(r, 90));
  }

  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  await new Promise(r => setTimeout(r, 450));

  const diagnostics = await page.evaluate(() => ({
    bodyClass: document.body.className,
    motionFallback: document.documentElement.classList.contains('motion-fallback'),
    noThree: document.documentElement.classList.contains('no-three'),
    gsap: Boolean(window.gsap),
    scrollTrigger: Boolean(window.ScrollTrigger),
    three: Boolean(window.THREE),
    hiddenReveals: [...document.querySelectorAll('.reveal-up')]
      .filter((el) => Number.parseFloat(getComputedStyle(el).opacity) < 0.05).length,
    heroCanvas: {
      width: document.getElementById('hero-webgl')?.width || 0,
      height: document.getElementById('hero-webgl')?.height || 0
    }
  }));
  console.log('DIAGNOSTICS:', JSON.stringify(diagnostics, null, 2));
  await page.screenshot({ path: 'screenshot_test.jpg', fullPage: false });
  console.log("Screenshot saved as screenshot_test.jpg");
  await browser.close();
  if (pageErrors.length) process.exitCode = 1;
}

async function runNativeCDP() {
  const http = require('http');
  const { spawn } = require('child_process');
  const path = require('path');
  const fs = require('fs');

  const edgePaths = [
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
  ];
  const edgePath = edgePaths.find(p => fs.existsSync(p));
  if (!edgePath) {
    throw new Error('No Edge or Chrome executable found on system.');
  }

  const userDataDir = path.join(__dirname, '.temp_edge_user');
  const port = 9333;

  const edgeProcess = spawn(edgePath, [
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${userDataDir}`,
    '--headless=new',
    '--no-first-run',
    '--no-default-browser-check',
    '--window-size=1280,800',
    targetUrl
  ], { stdio: 'ignore' });

  try {
    let versionData = null;
    for (let i = 0; i < 25; i++) {
      await new Promise(r => setTimeout(r, 250));
      try {
        versionData = await new Promise((resolve, reject) => {
          http.get(`http://127.0.0.1:${port}/json/version`, res => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => resolve(JSON.parse(body)));
          }).on('error', reject);
        });
        if (versionData) break;
      } catch (e) {}
    }

    if (!versionData) throw new Error('Could not connect to browser CDP port.');

    const list = await new Promise((resolve, reject) => {
      http.get(`http://127.0.0.1:${port}/json/list`, res => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => resolve(JSON.parse(body)));
      }).on('error', reject);
    });

    const pageTarget = list.find(t => t.type === 'page' && t.url.includes('softtec')) || list.find(t => t.type === 'page');
    if (!pageTarget) throw new Error('No browser page target found.');

    const ws = new WebSocket(pageTarget.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => {
      ws.onopen = resolve;
      ws.onerror = reject;
    });

    let idCounter = 1;
    const pending = new Map();
    const pageErrors = [];

    function send(method, params = {}) {
      return new Promise((resolve, reject) => {
        const id = idCounter++;
        pending.set(id, { resolve, reject });
        ws.send(JSON.stringify({ id, method, params }));
      });
    }

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.id && pending.has(msg.id)) {
        const { resolve, reject } = pending.get(msg.id);
        pending.delete(msg.id);
        if (msg.error) reject(msg.error);
        else resolve(msg.result);
        return;
      }
      if (msg.method === 'Runtime.consoleAPICalled') {
        const text = msg.params.args.map(a => a.value ?? a.description ?? '').join(' ');
        console.log('PAGE LOG:', text);
      }
      if (msg.method === 'Runtime.exceptionThrown') {
        const desc = msg.params.exceptionDetails.exception?.description || msg.params.exceptionDetails.text;
        console.log('PAGE ERROR:', desc);
        pageErrors.push(desc);
      }
    };

    await send('Runtime.enable');
    await send('Page.enable');

    // Wait for loader
    for (let i = 0; i < 40; i++) {
      const res = await send('Runtime.evaluate', {
        expression: "!document.body.classList.contains('loading')",
        returnByValue: true
      });
      if (res.result?.value === true) break;
      await new Promise(r => setTimeout(r, 200));
    }

    await send('Runtime.evaluate', { expression: 'window.ScrollTrigger?.refresh()' });
    await new Promise(r => setTimeout(r, 500));

    // Walk viewports
    const metricsRes = await send('Runtime.evaluate', {
      expression: 'JSON.stringify({ height: document.documentElement.scrollHeight, step: Math.max(400, Math.round(window.innerHeight * 0.72)) })',
      returnByValue: true
    });
    const metrics = JSON.parse(metricsRes.result.value);

    for (let y = 0; y < metrics.height; y += metrics.step) {
      await send('Runtime.evaluate', { expression: `window.scrollTo({ top: ${y}, behavior: 'instant' })` });
      await new Promise(r => setTimeout(r, 60));
    }

    await send('Runtime.evaluate', { expression: 'window.scrollTo({ top: 0, behavior: "instant" })' });
    await new Promise(r => setTimeout(r, 450));

    const diagRes = await send('Runtime.evaluate', {
      expression: `JSON.stringify({
        bodyClass: document.body.className,
        motionFallback: document.documentElement.classList.contains('motion-fallback'),
        noThree: document.documentElement.classList.contains('no-three'),
        gsap: Boolean(window.gsap),
        scrollTrigger: Boolean(window.ScrollTrigger),
        three: Boolean(window.THREE),
        hiddenReveals: [...document.querySelectorAll('.reveal-up')].filter(el => Number.parseFloat(getComputedStyle(el).opacity) < 0.05).length,
        heroCanvas: {
          width: document.getElementById('hero-webgl')?.width || 0,
          height: document.getElementById('hero-webgl')?.height || 0
        }
      })`,
      returnByValue: true
    });
    console.log('DIAGNOSTICS:', JSON.stringify(JSON.parse(diagRes.result.value), null, 2));

    const shotRes = await send('Page.captureScreenshot', { format: 'jpeg', quality: 90 });
    fs.writeFileSync(path.join(__dirname, 'screenshot_test.jpg'), Buffer.from(shotRes.data, 'base64'));
    console.log('Screenshot saved as screenshot_test.jpg');

    ws.close();
    if (pageErrors.length) process.exitCode = 1;
  } finally {
    edgeProcess.kill();
  }
}

(async () => {
  try {
    await runPuppeteer();
  } catch (err) {
    if (err.code === 'MODULE_NOT_FOUND' && err.message.includes('puppeteer')) {
      console.log('Puppeteer not installed, running automated diagnostics via native Edge CDP...');
      await runNativeCDP();
    } else {
      throw err;
    }
  }
})();
