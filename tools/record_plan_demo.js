const { chromium } = require('playwright');
const click = async (page, txt) => {
  const l = page.locator(`button:has-text("${txt}")`).first();
  if ((await l.count()) && await l.isVisible().catch(()=>false)) { await l.click().catch(()=>{}); return true; }
  return false;
};
const scrollTo = (page,y)=>page.evaluate(_y=>window.scrollTo({top:_y,behavior:'smooth'}),y);

(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({
    viewport:{width:390,height:844}, deviceScaleFactor:2, isMobile:true, hasTouch:true,
    recordVideo:{ dir:'/home/user/recplan', size:{width:390,height:844} },
  });
  const page = await ctx.newPage();
  await page.goto('http://localhost:5173/calendar', { waitUntil:'networkidle', timeout:20000 });
  await page.waitForTimeout(3200); // шапка + карточки анимируются

  // раскрыть рецепт обеда
  await click(page,'Плов с курицей'); await page.waitForTimeout(800);
  await scrollTo(page, 380); await page.waitForTimeout(2600); // показать ингредиенты/приготовление
  await scrollTo(page, 0); await page.waitForTimeout(700);
  await click(page,'Плов с курицей'); await page.waitForTimeout(700); // свернуть

  // переключить дни
  await click(page,'Пт'); await page.waitForTimeout(1900);
  await click(page,'Сб'); await page.waitForTimeout(1700);
  await click(page,'Вс'); await page.waitForTimeout(1700);

  // показать кнопки действий
  await scrollTo(page, 520); await page.waitForTimeout(1300);

  // перейти в Покупки (нативная кнопка в карточке дня)
  await click(page,'🛒 Покупки'); await page.waitForTimeout(2600);
  // скролл по списку покупок
  const h = await page.evaluate(()=>document.body.scrollHeight);
  for (let y=0; y<h-700; y+=380){ await scrollTo(page,y); await page.waitForTimeout(750); }
  await page.waitForTimeout(1500);

  const vpath = await page.video().path();
  await ctx.close(); await b.close();
  console.log('VIDEO:', vpath);
})();
