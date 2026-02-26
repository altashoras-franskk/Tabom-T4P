import { chromium } from 'playwright';

async function testRhizomeLab() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  const errors = [];
  const consoleMessages = [];

  page.on('console', msg => {
    const text = msg.text();
    consoleMessages.push({ type: msg.type(), text });
    if (msg.type() === 'error') {
      errors.push(text);
    }
  });

  page.on('pageerror', error => {
    const errorMsg = `Page Error: ${error.message}\n${error.stack}`;
    errors.push(errorMsg);
    console.log(errorMsg);
  });

  try {
    console.log('=== STEP 1: Navigate to http://localhost:5173/ ===');
    await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
    console.log('Page loaded');

    console.log('\n=== Taking screenshot of home page ===');
    await page.screenshot({ path: 'screenshot-home.png', fullPage: true });
    console.log('Screenshot saved');

    console.log('\n=== Checking page content ===');
    const pageContent = await page.evaluate(() => {
      return {
        title: document.title,
        bodyText: document.body.innerText.substring(0, 500),
        buttons: Array.from(document.querySelectorAll('button, a')).map(el => ({
          tag: el.tagName,
          text: el.innerText?.substring(0, 50),
          id: el.id,
          className: el.className
        }))
      };
    });
    console.log('Page title:', pageContent.title);
    console.log('Available buttons/links:', JSON.stringify(pageContent.buttons, null, 2));

    console.log('\n=== STEP 2: Scroll to labs section ===');
    await page.evaluate(() => {
      document.getElementById('labs-section')?.scrollIntoView({ behavior: 'smooth' });
    });
    await page.waitForTimeout(2000);
    console.log('Scrolled to labs section');

    console.log('\n=== STEP 3: Looking for Rhizome Search lab ===');
    
    let rhizomeButton = null;
    try {
      rhizomeButton = await page.locator('h4:has-text("Rhizome Search")').first();
      await rhizomeButton.waitFor({ timeout: 5000 });
      console.log('Found "Rhizome Search" lab card');
    } catch (e) {
      console.log('Could not find "Rhizome Search" text, trying parent div...');
      
      try {
        const labCard = await page.locator('div:has(h4:has-text("Rhizome"))').first();
        await labCard.waitFor({ timeout: 5000 });
        rhizomeButton = labCard;
        console.log('Found lab card with "Rhizome" text');
      } catch (e2) {
        console.log('Could not find Rhizome lab. Available text on page:');
        console.log(pageContent.bodyText);
        throw new Error('Cannot find Rhizome Lab');
      }
    }

    await rhizomeButton.click();
    console.log('Clicked Rhizome Search lab card');

    console.log('\n=== STEP 4: Wait 3 seconds for lab to load ===');
    await page.waitForTimeout(3000);

    console.log('\n=== STEP 5: Take snapshot ===');
    await page.screenshot({ path: 'screenshot-rhizome.png', fullPage: true });
    console.log('Screenshot saved to screenshot-rhizome.png');

    console.log('\n=== STEP 6: Check for JavaScript errors ===');
    if (errors.length > 0) {
      console.log('ERRORS FOUND:');
      errors.forEach((err, i) => console.log(`  ${i + 1}. ${err}`));
    } else {
      console.log('No JavaScript errors detected in console');
    }

    console.log('\n=== Console messages (last 20) ===');
    consoleMessages.slice(-20).forEach((msg, i) => {
      console.log(`[${msg.type}] ${msg.text}`);
    });

    console.log('\n=== STEP 7: Execute canvas state check ===');
    const canvasInfo = await page.evaluate(() => {
      const canvases = document.querySelectorAll('canvas');
      const info = [];
      canvases.forEach((c, i) => {
        try {
          const ctx = c.getContext('2d');
          const data = ctx ? ctx.getImageData(0, 0, Math.min(c.width, 100), Math.min(c.height, 100)) : null;
          const hasPixels = data ? data.data.some(v => v > 0) : false;
          info.push({ 
            index: i, 
            width: c.width, 
            height: c.height, 
            cssWidth: c.offsetWidth, 
            cssHeight: c.offsetHeight, 
            hasPixels, 
            display: c.style.display, 
            parentTag: c.parentElement?.tagName,
            visibility: window.getComputedStyle(c).visibility,
            opacity: window.getComputedStyle(c).opacity
          });
        } catch (err) {
          info.push({
            index: i,
            error: err.message
          });
        }
      });
      return info;
    });

    console.log('\n=== STEP 8: Canvas State Info ===');
    console.log(JSON.stringify(canvasInfo, null, 2));

    console.log('\n=== STEP 9: Additional canvas check ===');
    const canvasResults = await page.evaluate(() => {
      const all = document.querySelectorAll('canvas');
      const results = [];
      all.forEach((c, i) => {
        const w = c.width;
        const h = c.height;
        results.push(`Canvas ${i}: ${w}x${h} css=${c.offsetWidth}x${c.offsetHeight} visible=${c.offsetParent !== null}`);
      });
      return results.join('\n');
    });

    console.log(canvasResults);

    console.log('\n=== Checking for Three.js renderer ===');
    const threeJsInfo = await page.evaluate(() => {
      const info = {
        hasThree: typeof window.THREE !== 'undefined',
        canvasCount: document.querySelectorAll('canvas').length,
        webglContexts: []
      };
      
      document.querySelectorAll('canvas').forEach((canvas, i) => {
        try {
          const gl = canvas.getContext('webgl') || canvas.getContext('webgl2');
          if (gl) {
            info.webglContexts.push({
              index: i,
              type: canvas.getContext('webgl2') ? 'webgl2' : 'webgl',
              drawingBufferWidth: gl.drawingBufferWidth,
              drawingBufferHeight: gl.drawingBufferHeight
            });
          }
        } catch (e) {
          info.webglContexts.push({
            index: i,
            error: e.message
          });
        }
      });
      
      return info;
    });

    console.log('\n=== Three.js / WebGL Info ===');
    console.log(JSON.stringify(threeJsInfo, null, 2));

    console.log('\n=== Final Report ===');
    console.log(`Total canvases found: ${canvasInfo.length}`);
    console.log(`JavaScript errors: ${errors.length}`);
    console.log(`Total console messages: ${consoleMessages.length}`);
    
    console.log('\n=== Waiting 5 seconds before closing ===');
    await page.waitForTimeout(5000);
    
  } catch (error) {
    console.error('\n=== TEST FAILED ===');
    console.error(error);
    await page.screenshot({ path: 'screenshot-error.png', fullPage: true });
  } finally {
    await browser.close();
  }
}

testRhizomeLab().catch(console.error);
