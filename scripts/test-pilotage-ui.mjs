import assert from 'node:assert/strict';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { mkdir } from 'node:fs/promises';

const modulePath = process.env.PILOTAGE_PLAYWRIGHT_MODULE;
const { chromium } = await import(modulePath ? pathToFileURL(modulePath).href : 'playwright');
const browser = await chromium.launch({ headless: true, channel: process.env.PILOTAGE_BROWSER ?? 'msedge' });
const base = process.env.PILOTAGE_TEST_URL ?? 'http://127.0.0.1:5182';
const errors = [];
const screenshots = new URL('../.pilotage-qa/', import.meta.url);
await mkdir(screenshots, { recursive: true });
try {
  for (const locale of ['fr', 'ar']) {
    const context = await browser.newContext({ viewport: locale === 'ar' ? { width: 390, height: 844 } : { width: 1100, height: 850 }, reducedMotion: 'reduce' });
    const page = await context.newPage();
    let releaseFirstPush;
    let announceFirstPush;
    const firstPush = new Promise(resolve => { announceFirstPush = resolve; });
    const payloads = [];
    await page.route('**/api/auth**', route => route.fulfill({ json: { user: { phone: '06000000', nom: 'QA', prenom: 'Test', hasCompletedWelcome: true } } }));
    await page.route('**/api/sync', async route => {
      if (route.request().method() === 'POST') {
        const payload = route.request().postDataJSON();
        payloads.push(payload);
        if (payloads.length === 1) {
          announceFirstPush();
          await new Promise(resolve => { releaseFirstPush = resolve; });
        }
        await route.fulfill({ json: { ok: true, updatedAt: '2026-09-14T09:00:00Z' } });
      } else await route.fulfill({ json: { classes: [], classMeta: {}, deletedClasses: {} } });
    });
    page.on('pageerror', error => errors.push(error.message));
    await page.clock.setFixedTime(new Date('2026-09-14T09:59:00+01:00'));
    await page.addInitScript(({ locale }) => {
      const classInfo = { id: 'qa-c1', name: 'Tronc Commun Scientifique 1', level: 'Tronc Commun Scientifique', subject: 'Mathématiques', cycle: 'lycee', teacherName: 'QA', color: '', createdAt: '2026-09-01' };
      if (location.search.includes('editor=1')) {
        classInfo.curriculumSourceId = 'tcs-mouzoun';
        classInfo.curriculumChapterMatches = { 'tcs-mouzoun-c1': [{ index: 0, title: 'Chapitre 1 : Mes nombres' }] };
      }
      localStorage.setItem('classManager_v1', JSON.stringify([classInfo]));
      localStorage.setItem('workspaceScope_v1', JSON.stringify({ owner: '06000000', revision: 'qa-scope' }));
      localStorage.setItem('authUser_v1', JSON.stringify({ phone: '06000000', nom: 'QA', prenom: 'Test' }));
      localStorage.setItem('app_first_launch_v1', '1');
      localStorage.setItem('classData_v1_qa-c1', JSON.stringify([{ type: 'chapter', title: 'Chapitre 1 : Mes nombres', date: '2026-09-07', items: [{ type: 'définition', date: '2026-09-14' }, { type: 'devoir_maison', title: 'DM', date: '2026-12-01' }, { type: 'activité', date: '2026-12-02' }] }, { type: 'chapter', title: 'Chapitre 2 : Mes vecteurs' }]));
      localStorage.setItem('appConfig_v1', JSON.stringify({ establishmentName: '', defaultTeacherName: 'QA', printShowDescriptions: true, applicationLocale: locale, schoolYearStart: '2026-09-07', timetable: [{ day: 1, slot: 0, classId: 'qa-c1' }, { day: 1, slot: 1, classId: 'qa-c1' }], notificationSettings: { enabled: true, pushEnabled: false, sessionEndReminderEnabled: true, quietDuringVacations: true, sessionVibration: false, gapThreshold: 2, inactivityThresholdDays: 5 } }));
    }, { locale });
    await page.goto(`${base}/scripts/fixtures/pilotage.html?locale=${locale}`, { waitUntil: 'networkidle' });
    const analysis = page.getByRole('dialog');
    const entry = analysis.getByRole('button', { name: locale === 'ar' ? 'ربط دروسي بالبرنامج' : 'Relier mes chapitres au programme', exact: true });
    await entry.waitFor();
    assert.equal(await entry.count(), 1);
    const analysisBox = await analysis.boundingBox();
    const entryBox = await entry.boundingBox();
    assert.ok(entryBox.x < analysisBox.x + analysisBox.width / 2);
    assert.ok(entryBox.y > analysisBox.y + analysisBox.height - 110);
    await page.screenshot({ path: fileURLToPath(new URL(`${locale}-analysis.png`, screenshots)), fullPage: true });
    await entry.click();
    await page.getByRole('combobox').first().waitFor();
    const dialog = page.getByRole('dialog').last();
    await dialog.waitFor();
    assert.equal(await dialog.getByRole('combobox').count(), 2);
    assert.equal(await dialog.locator('input[type="date"]').count(), 0);
    await dialog.getByRole('combobox').first().click();
    const first = page.getByRole('option').filter({ hasText: 'arithmétique' }).first();
    await first.waitFor();
    await page.waitForFunction(() => Boolean(document.querySelector('[role="option"] mjx-container')), { timeout: 20000 });
    await first.click();
    await firstPush;
    // Choose another chapter while the first push is deliberately held in flight.
    await dialog.getByRole('combobox').nth(1).click();
    await page.getByRole('option').filter({ hasText: 'calcul vectoriel' }).click();
    const automaticSecondPush = page.waitForResponse(response => response.url().endsWith('/api/sync') && response.request().method() === 'POST' && response.request().postDataJSON().classes[0].curriculumChapterMatches?.['tcs-mouzoun-c2']?.length === 1, { timeout: 5000 });
    releaseFirstPush();
    await automaticSecondPush;
    assert.equal(payloads.at(-1).classes[0].curriculumChapterMatches['tcs-mouzoun-c1'][0].index, 0);
    assert.equal(payloads.at(-1).classes[0].curriculumChapterMatches['tcs-mouzoun-c2'][0].index, 1);
    await dialog.locator('summary').click();
    await dialog.locator('[data-curriculum-progress]').first().waitFor();
    assert.ok(await dialog.locator('[data-curriculum-progress]').count() > 10);
    const firstProgress = dialog.locator('[data-curriculum-progress]').first();
    assert.equal(await firstProgress.getByRole('progressbar').count(), 2);
    assert.equal(await firstProgress.getByRole('progressbar').first().getAttribute('aria-valuenow'), '100');
    assert.ok(Number(await firstProgress.getByRole('progressbar').last().getAttribute('aria-valuenow')) > 0);
    await page.screenshot({ path: fileURLToPath(new URL(`${locale}-full-program.png`, screenshots)), fullPage: true });
    await dialog.locator('summary').click();
    await page.screenshot({ path: fileURLToPath(new URL(`${locale}-association.png`, screenshots)), fullPage: true });
    assert.equal(await dialog.getByRole('button', { name: locale === 'ar' ? 'حفظ' : 'Enregistrer', exact: true }).count(), 0);
    const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('classManager_v1'))[0]);
    assert.equal(saved.curriculumSourceId, 'tcs-mouzoun');
    assert.equal(saved.courseStartDate, undefined);
    assert.equal(saved.curriculumChapterMatches['tcs-mouzoun-c1'][0].title, 'Chapitre 1 : Mes nombres');
    assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('classData_v1_qa-c1'))[0].title), 'Chapitre 1 : Mes nombres');
    await dialog.getByRole('button', { name: locale === 'ar' ? 'تم' : 'Terminé', exact: true }).click();
    await page.waitForFunction(() => document.querySelectorAll('[role="dialog"]').length === 1);
    assert.equal(await page.getByRole('dialog').locator('[data-curriculum-progress]').count(), 2);
    const chapterProgress = page.getByRole('dialog').locator('[data-curriculum-progress]').first();
    const setCourseDate = async (target, value) => {
      await page.evaluate(({ target, value }) => {
        const data = JSON.parse(localStorage.getItem('classData_v1_qa-c1'));
        const node = target === 'title' ? data[0] : data[0].items[0];
        if (value) node.date = value; else delete node.date;
        window.dispatchEvent(new CustomEvent('qa-lessons-change', { detail: data }));
      }, { target, value });
    };
    await setCourseDate('last', '');
    await page.waitForFunction(() => document.querySelector('[data-curriculum-progress] [role="progressbar"]')?.getAttribute('aria-valuenow') === '0');
    await setCourseDate('last', '2026-09-14');
    await page.waitForFunction(() => document.querySelector('[data-curriculum-progress] [role="progressbar"]')?.getAttribute('aria-valuenow') === '100');
    await setCourseDate('title', '');
    await chapterProgress.getByText(locale === 'ar' ? 'أضف تاريخًا لعنوان الدرس في الجدول.' : 'Datez le titre du chapitre dans le tableau.', { exact: true }).waitFor();
    assert.equal(await chapterProgress.getByRole('progressbar').first().getAttribute('aria-valuenow'), null);
    const restoredPush = page.waitForResponse(response => response.url().endsWith('/api/sync') && response.request().method() === 'POST' && response.request().postDataJSON().lessons?.some(item => item.lessonsData[0].date === '2026-09-07'), { timeout: 5000 });
    await setCourseDate('title', '2026-09-07');
    await restoredPush;
    await page.waitForFunction(() => document.querySelector('[data-curriculum-progress] [role="progressbar"]')?.getAttribute('aria-valuenow') === '100');
    await page.screenshot({ path: fileURLToPath(new URL(`${locale}-progress.png`, screenshots)), fullPage: true });
    await page.getByRole('dialog').getByRole('button', { name: locale === 'ar' ? 'إغلاق' : 'Fermer', exact: true }).last().click();
    await page.waitForFunction(() => document.querySelectorAll('[role="dialog"]').length === 0);
    assert.equal(await page.getByRole('button', { name: /Relier le chapitre|ربط الدرس/ }).count(), 0);
    await page.clock.setFixedTime(new Date('2026-09-21T09:59:00+01:00'));
    await page.evaluate(() => window.dispatchEvent(new Event('storage')));
    const bell = page.locator('button').filter({ has: page.locator('svg.lucide-bell') });
    await page.waitForFunction(() => document.querySelector('svg.lucide-bell')?.closest('button')?.className.includes('bg-amber'));
    const box = await bell.boundingBox();
    assert.ok(locale === 'ar' ? box.x < 100 : box.x > 900);
    await bell.click();
    assert.equal(await page.getByTestId('selected').textContent(), 'qa-c1');
    await page.screenshot({ path: fileURLToPath(new URL(`${locale}-bell.png`, screenshots)), fullPage: true });
    await page.waitForFunction(() => !document.querySelector('svg.lucide-bell')?.closest('button')?.className.includes('bg-amber'));
    await page.evaluate(() => window.dispatchEvent(new Event('storage')));
    assert.ok(!(await bell.getAttribute('class')).includes('bg-amber'));
    if (locale === 'fr') {
      await page.goto(`${base}/scripts/fixtures/pilotage.html?locale=fr&editor=1`, { waitUntil: 'networkidle' });
      await page.locator('[data-editor-toolbar] button[aria-haspopup="menu"]').click();
      await page.getByRole('menuitem', { name: 'Suivi', exact: true }).click();
      const actualEditorProgress = page.getByRole('dialog').locator('[data-curriculum-progress]').first();
      await actualEditorProgress.waitFor();
      assert.equal(await actualEditorProgress.getByRole('progressbar').first().getAttribute('aria-valuenow'), '100');
      await page.evaluate(() => {
        const stored = JSON.parse(localStorage.getItem('classData_v1_qa-c1'));
        const data = Array.isArray(stored) ? stored : stored.lessonsData;
        delete data[0].date;
        window.dispatchEvent(new CustomEvent('qa-cloud-lessons', { detail: data }));
      });
      await actualEditorProgress.getByText('Datez le titre du chapitre dans le tableau.', { exact: true }).waitFor();
      assert.equal(await actualEditorProgress.getByRole('progressbar').first().getAttribute('aria-valuenow'), null);
      console.log('Éditeur réel : réception cloud du cahier et recalcul de l’analyse sans rechargement OK');
    }
    await context.close();
    console.log(`${locale}: aucune date manuelle, détection titre/dernier contenu, DM/activités exclus, effacement/restauration synchronisés, deux barres réactives, LaTeX et cloche 3 s OK`);
  }
  assert.deepEqual(errors, []);
} finally { await browser.close(); }
