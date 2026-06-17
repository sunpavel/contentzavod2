const { chromium } = require('playwright');

const click = async (page, txt, exact = false) => {
  const l = page.locator('button', { hasText: txt }).first();
  if ((await l.count()) && (await l.isVisible().catch(() => false))) {
    await l.click().catch(() => {});
    return true;
  }
  return false;
};
const fwd = async (page) => {
  const n = page.locator('button:not([disabled])').filter({ hasText: 'Далее' }).first();
  await n.waitFor({ timeout: 6000 }).catch(() => {});
  await n.click().catch(() => {});
};

(async () => {
  const b = await chromium.launch({ args: ['--ignore-certificate-errors'] });
  const ctx = await b.newContext({
    ignoreHTTPSErrors: true,
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    recordVideo: { dir: '/home/user/rec2', size: { width: 390, height: 844 } },
  });
  const page = await ctx.newPage();
  page.setDefaultTimeout(8000);
  await page.goto('https://foodgenius-ai-production.up.railway.app', { waitUntil: 'networkidle', timeout: 45000 });
  await page.waitForTimeout(2600);

  // экран 1: цель + вес + бюджет
  await page.waitForTimeout(1400);
  await click(page, 'Похудеть'); await page.waitForTimeout(1000);
  await click(page, '5–10'); await page.waitForTimeout(1000);
  await click(page, 'Экономный'); await page.waitForTimeout(1300);
  await fwd(page); await page.waitForTimeout(1900);

  // экран 2: что исключаем
  await click(page, 'Нет ограничений'); await page.waitForTimeout(1300);
  await fwd(page); await page.waitForTimeout(1900);

  // экран 3: активность
  await click(page, 'Лёгкая'); await page.waitForTimeout(1300);
  await fwd(page); await page.waitForTimeout(1900);

  // экран 4: сколько человек + сводка профиля (НЕ жмём "Создать меню" — вне Telegram даёт ошибку)
  await click(page, '+'); await page.waitForTimeout(1500);
  // задержаться на сводке профиля — это кадр-концовка
  await page.waitForTimeout(3800);

  const vpath = await page.video().path();
  await ctx.close();
  await b.close();
  console.log('VIDEO:', vpath);
})();
