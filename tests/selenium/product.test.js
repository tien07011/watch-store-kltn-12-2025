const { Builder, By, until } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');
const { spawn } = require('child_process');
const http = require('http');
const chai = require('chai');
const expect = chai.expect;

function waitForServer(url, timeout = 20000) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const interval = setInterval(() => {
      http.get(url, (res) => {
        if (res.statusCode >= 200 && res.statusCode < 500) {
          clearInterval(interval);
          resolve();
        }
      }).on('error', () => {
        if (Date.now() - start > timeout) {
          clearInterval(interval);
          reject(new Error('Server not reachable'));
        }
      });
    }, 500);
  });
}

function startServer() {
  return new Promise(async (resolve, reject) => {
    const env = {
      ...process.env,
      PORT: '4500',
      // NODE_ENV: 'test'
    };

    const proc = spawn('node', ['app.js'], {
      env,
      cwd: process.cwd(),
      stdio: ['ignore', 'pipe', 'pipe']
    });

    proc.on('error', reject);

    try {
      await waitForServer('http://127.0.0.1:4500/login');
      resolve(proc);
    } catch (err) {
      proc.kill();
      reject(err);
    }
  });
}

describe('Selenium smoke tests - products', function () {
  this.timeout(60000);
  let driver;
  let serverProc;

  before(async function () {
    serverProc = await startServer();

    const options = new chrome.Options();
    options.addArguments(
      '--headless=new',
      '--disable-gpu',
      '--no-sandbox',
      '--disable-dev-shm-usage',
      '--window-size=1280,800'
    );

    driver = await new Builder()
      .forBrowser('chrome')
      .setChromeOptions(options)
      .build();
  });

  it('should navigate to /products and find the product grid', async function () {
    await driver.get('http://127.0.0.1:4500/products');

    await driver.wait(
      until.elementLocated(By.css('.product-grid')),
      15000
    );

    const grid = await driver.findElement(By.css('.product-grid'));
    const html = await grid.getAttribute('innerHTML');
    expect(html).to.be.a('string');
  });

it('TC_LOGIN_SUCCESS - Đăng nhập thành công', async function () {
  await driver.get('http://127.0.0.1:4500/login');

  await driver.findElement(By.id('form3Example3'))
    .sendKeys('ThuanToan.Vuong@gmail.com');

  await driver.findElement(By.id('form3Example4'))
    .sendKeys('123456');

  await driver.findElement(By.css('button[type="submit"]')).click();

  // ✅ Đợi URL KHÔNG còn /login
  await driver.wait(async () => {
    const url = await driver.getCurrentUrl();
    return !url.includes('/login');
  }, 10000, 'Login success but URL not changed');

  const currentUrl = await driver.getCurrentUrl();
  console.log('✅ Login success, current URL:', currentUrl);

  expect(currentUrl).to.not.include('/login');
});


  after(async function () {
    if (driver) await driver.quit();
    if (serverProc) serverProc.kill();
  });
});
