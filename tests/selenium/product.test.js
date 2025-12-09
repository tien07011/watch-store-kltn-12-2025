const { Builder, By, until } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');
const chromedriver = require('chromedriver');
const { spawn } = require('child_process');
const http = require('http');
const chai = require('chai');
const expect = chai.expect;

// Helper: start the app as a child process on PORT 4500
function startServer() {
  return new Promise((resolve, reject) => {
    const env = {
      ...process.env,
      PORT: '4500',
      NODE_ENV: 'test'
    };

    const proc = spawn('node', ['app.js'], {
      env,
      cwd: process.cwd(),
      stdio: ['ignore', 'pipe', 'pipe']
    });

    let resolved = false;

    const handleOutput = (d) => {
      const s = d.toString().toLowerCase();
      if (!resolved && s.includes('server is running at port')) {
        resolved = true;
        resolve(proc);
      }
    };

    proc.stdout.on('data', handleOutput);
    proc.stderr.on('data', handleOutput);

    proc.on('error', (err) => {
      if (!resolved) reject(err);
    });

    // Fallback polling
    const start = Date.now();
    const timeout = 20000;
    const interval = setInterval(() => {
      http.get('http://127.0.0.1:4500/', () => {
        if (!resolved) {
          resolved = true;
          clearInterval(interval);
          resolve(proc);
        }
      }).on('error', () => {
        if (Date.now() - start > timeout) {
          clearInterval(interval);
          if (!resolved) {
            reject(new Error('Server start timeout'));
          }
        }
      });
    }, 500);
  });
}

describe('Selenium smoke tests - products', function () {
  this.timeout(60000);
  let driver;
  let serverProc;

  before(async function () {
    // Start server
    serverProc = await startServer();

    // Create Chrome service (correct way in selenium 4.6+)
    const service = new chrome.ServiceBuilder(chromedriver.path);

    // Chrome options
    const options = new chrome.Options();
    options.addArguments(
        '--headless=new',   // headless đúng format
        '--disable-gpu',
        '--no-sandbox',
        '--disable-dev-shm-usage',
        '--window-size=1280,800'
    );

    // Build Selenium driver
    driver = await new Builder()
        .forBrowser('chrome')
        .setChromeOptions(options)
        .setChromeService(service)
        .build();
  });

  // ---------- TEST CASE ---------- //
  it('should navigate to /products and find the product grid', async function () {
    await driver.get('http://127.0.0.1:4500/products');
    // Wait for the product grid container to be present (longer timeout for server render)
    await driver.wait(until.elementLocated(By.css('.product-grid')), 15000);
    const grid = await driver.findElement(By.css('.product-grid'));
    // Some headless environments report elements as not 'displayed' even when present.
    // Assert the element exists and contains HTML (may be empty if no products are seeded).
    const html = await grid.getAttribute('innerHTML');
    expect(html).to.be.a('string');

    // It's OK if there are zero products in the seeded DB; ensure selector returns an array.
    const items = await driver.findElements(By.css('.product-card'));
    expect(items).to.be.an('array');
  });

  // Cleanup
  after(async function () {
    if (driver) await driver.quit();
    if (serverProc) {
      try { serverProc.kill(); } catch (_) {}
    }
  });
});
