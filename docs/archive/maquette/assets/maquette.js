/* ═══════════════════════════════════════════════════════════════════════════
   Maquette — interactions (aucune dépendance)
   ═══════════════════════════════════════════════════════════════════════════ */
(() => {
  const root = document.documentElement;
  const body = document.body;
  const isDesktop = () => window.matchMedia('(min-width: 1024px)').matches;

  /* ── Thème ─────────────────────────────────────────────────────────────── */
  const mediaDark = window.matchMedia('(prefers-color-scheme: dark)');
  let themeChoice = localStorage.getItem('maquette-theme') || 'light';
  const resolvedTheme = value => (value === 'system' ? (mediaDark.matches ? 'dark' : 'light') : value);

  const syncThemeButtons = () => {
    const dark = root.dataset.theme === 'dark';
    document.querySelectorAll('[data-theme-choice]').forEach(button => {
      button.setAttribute('aria-pressed', String(button.dataset.themeChoice === themeChoice));
    });
    document.querySelectorAll('[data-action="toggle-theme"]').forEach(button => {
      button.setAttribute('aria-label', dark ? 'الوضع النهاري' : 'الوضع الليلي');
    });
  };

  const setTheme = theme => {
    themeChoice = theme;
    const resolved = resolvedTheme(theme);
    root.dataset.theme = resolved;
    root.classList.toggle('dark', resolved === 'dark');
    localStorage.setItem('maquette-theme', theme);
    syncThemeButtons();
  };

  setTheme(themeChoice);
  mediaDark.addEventListener('change', () => {
    if (themeChoice === 'system') setTheme('system');
  });

  /* ── Langue ────────────────────────────────────────────────────────────── */
  const applyLocale = lang => {
    root.lang = lang;
    root.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.querySelectorAll('[data-ar]').forEach(node => {
      const value = node.dataset[lang === 'ar' ? 'ar' : 'fr'];
      if (typeof value === 'string') node.textContent = value;
    });
    document.querySelectorAll('[data-ph-ar]').forEach(node => {
      const value = node.dataset[lang === 'ar' ? 'PhAr' : 'PhFr'];
      if (typeof value === 'string') node.setAttribute('placeholder', value);
    });
    document.querySelectorAll('[data-title-ar]').forEach(node => {
      const value = node.dataset[lang === 'ar' ? 'TitleAr' : 'TitleFr'];
      if (typeof value === 'string') node.setAttribute('title', value);
    });
    document.querySelectorAll('[data-label-ar]').forEach(node => {
      const value = node.dataset[lang === 'ar' ? 'LabelAr' : 'LabelFr'];
      if (typeof value === 'string') node.setAttribute('aria-label', value);
    });
    document.querySelectorAll('[data-lang-choice]').forEach(button => {
      button.setAttribute('aria-pressed', String(button.dataset.langChoice === lang));
    });
    localStorage.setItem('maquette-lang', lang);
  };

  /* ── Densité de texte ─────────────────────────────────────────────────── */
  const applyDensity = size => {
    const map = { sm: 0.94, md: 1, lg: 1.12, xl: 1.24 };
    root.style.setProperty('--app-text-density', String(map[size] ?? 1));
    document.querySelectorAll('[data-text-size]').forEach(button => {
      button.setAttribute('aria-pressed', String(button.dataset.textSize === size));
    });
    localStorage.setItem('maquette-size', size);
  };

  /* ── Toasts ────────────────────────────────────────────────────────────── */
  let toastTimer;
  const toast = message => {
    const node = document.getElementById('toast');
    if (!node) return;
    node.textContent = message;
    node.classList.add('is-visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => node.classList.remove('is-visible'), 2400);
  };

  /* ── Overlays ──────────────────────────────────────────────────────────── */
  let lastFocus = null;
  const openOverlay = id => {
    const overlay = document.getElementById(id);
    if (!overlay) return;
    lastFocus = document.activeElement;
    overlay.classList.add('is-open');
    overlay.setAttribute('aria-hidden', 'false');
    body.classList.add('is-locked');
    const focusable = overlay.querySelector('input, button, [tabindex="0"]');
    window.requestAnimationFrame(() => focusable?.focus({ preventScroll: true }));
  };
  const closeOverlay = overlay => {
    if (!overlay) return;
    overlay.classList.remove('is-open');
    overlay.setAttribute('aria-hidden', 'true');
    if (!document.querySelector('.overlay.is-open')) body.classList.remove('is-locked');
    if (lastFocus instanceof HTMLElement) lastFocus.focus({ preventScroll: true });
  };
  const closeAll = () => {
    document.querySelectorAll('.overlay.is-open').forEach(closeOverlay);
  };

  /* ── Écrans ────────────────────────────────────────────────────────────── */
  const showScreen = name => {
    document.querySelectorAll('.screen').forEach(screen => {
      screen.classList.toggle('is-active', screen.id === `screen-${name}`);
    });
    document.querySelectorAll('.tab-btn[data-screen]').forEach(button => {
      if (button.dataset.screen === name) button.setAttribute('aria-current', 'page');
      else button.removeAttribute('aria-current');
    });
    document.querySelectorAll('.rail-btn[data-screen]').forEach(button => {
      if (button.dataset.screen === name) button.setAttribute('aria-current', 'page');
      else button.removeAttribute('aria-current');
    });
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  /* ── Paramètres ───────────────────────────────────────────────────────── */
  const settingsShell = document.querySelector('.settings-shell');
  const settingsBack = document.getElementById('settings-back');
  const settingsTitle = document.getElementById('settings-title-text');
  let activePanel = 'apparence';

  const showPanel = (id, { silent = false } = {}) => {
    activePanel = id;
    document.querySelectorAll('.panel').forEach(panel => {
      panel.classList.toggle('is-active', panel.dataset.panel === id);
    });
    document.querySelectorAll('[data-panel-target]').forEach(button => {
      if (button.dataset.panelTarget === id) button.setAttribute('aria-current', 'page');
      else button.removeAttribute('aria-current');
    });
    if (settingsShell) settingsShell.classList.add('is-detail');
    if (settingsBack) settingsBack.hidden = isDesktop();
    const source = document.querySelector(`[data-panel-target="${id}"]`);
    if (settingsTitle && source) {
      settingsTitle.dataset.ar = source.dataset.nameAr ?? '';
      settingsTitle.dataset.fr = source.dataset.nameFr ?? '';
      settingsTitle.textContent = root.lang === 'ar' ? settingsTitle.dataset.ar : settingsTitle.dataset.fr;
    }
    const footer = document.getElementById('settings-footer');
    if (footer) footer.hidden = id !== 'profil';
    if (!silent) document.querySelector('.settings-scroll')?.scrollTo({ top: 0 });
  };

  const backToHub = () => {
    settingsShell?.classList.remove('is-detail');
    if (settingsBack) settingsBack.hidden = true;
    if (settingsTitle) {
      settingsTitle.dataset.ar = 'الإعدادات';
      settingsTitle.dataset.fr = 'Paramètres';
      settingsTitle.textContent = root.lang === 'ar' ? 'الإعدادات' : 'Paramètres';
    }
    const footer = document.getElementById('settings-footer');
    if (footer) footer.hidden = true;
  };

  /* ── Assistant de création ────────────────────────────────────────────── */
  const wizard = { step: 0 };
  const wizardSteps = ['niveau', 'groupe', 'details'];
  const renderWizard = () => {
    document.querySelectorAll('.wizard-step').forEach(node => {
      node.classList.toggle('is-active', node.dataset.step === wizardSteps[wizard.step]);
    });
    document.querySelectorAll('.stepper__step').forEach((node, index) => {
      node.dataset.state = index < wizard.step ? 'complete' : index === wizard.step ? 'current' : 'upcoming';
      const node$ = node.querySelector('.stepper__node');
      if (node$ && index < wizard.step) node$.innerHTML = '<svg class="icon" aria-hidden="true"><use href="#i-check"/></svg>';
      else if (node$) node$.textContent = String(index + 1);
    });
    const fill = document.querySelector('.stepper__fill');
    if (fill) fill.style.width = `${(wizard.step / (wizardSteps.length - 1)) * 100}%`;
    const back = document.getElementById('wizard-back');
    const next = document.getElementById('wizard-next');
    if (back) back.hidden = wizard.step === 0;
    if (next) {
      const isLast = wizard.step === wizardSteps.length - 1;
      next.textContent = isLast
        ? (root.lang === 'ar' ? 'إنشاء القسم' : 'Créer la classe')
        : (root.lang === 'ar' ? 'متابعة' : 'Continuer');
    }
  };

  /* ── Délégation d’événements ──────────────────────────────────────────── */
  let nudgeShown = false;
  document.addEventListener('click', event => {
    const target = event.target instanceof Element ? event.target : null;
    if (!target) return;

    const open = target.closest('[data-open]');
    if (open) {
      event.preventDefault();
      if (open.dataset.stack !== '1') {
        document.querySelectorAll('.overlay.is-open').forEach(overlay => {
          if (overlay.id !== open.dataset.open) closeOverlay(overlay);
        });
      }
      openOverlay(open.dataset.open);
      if (open.dataset.toastAr) {
        toast(root.lang === 'ar' ? open.dataset.toastAr : (open.dataset.toastFr || open.dataset.toastAr));
      }
      if (open.dataset.open === 'overlay-settings') backToHub();
      if (open.dataset.open === 'overlay-create') { wizard.step = 0; renderWizard(); }
      return;
    }

    const close = target.closest('[data-close]');
    if (close) {
      event.preventDefault();
      closeOverlay(close.closest('.overlay'));
      return;
    }

    const screenBtn = target.closest('[data-screen]');
    if (screenBtn) {
      event.preventDefault();
      closeAll();
      showScreen(screenBtn.dataset.screen);
      // Comme dans l'application : au premier cahier ouvert sans séances
      // planifiées, on propose de verser les créneaux dans l'emploi du temps.
      if (screenBtn.dataset.screen === 'editor' && !nudgeShown) {
        nudgeShown = true;
        openOverlay('overlay-nudge');
      }
      return;
    }

    const themeBtn = target.closest('[data-action="toggle-theme"]');
    if (themeBtn) {
      setTheme(root.dataset.theme === 'dark' ? 'light' : 'dark');
      return;
    }

    const themeChoice = target.closest('[data-theme-choice]');
    if (themeChoice) { setTheme(themeChoice.dataset.themeChoice); return; }

    const langChoice = target.closest('[data-lang-choice]');
    if (langChoice) { applyLocale(langChoice.dataset.langChoice); renderWizard(); return; }

    const sizeChoice = target.closest('[data-text-size]');
    if (sizeChoice) { applyDensity(sizeChoice.dataset.textSize); return; }

    const panelTarget = target.closest('[data-panel-target]');
    if (panelTarget) {
      event.preventDefault();
      showPanel(panelTarget.dataset.panelTarget);
      return;
    }

    if (target.closest('#settings-back')) { event.preventDefault(); backToHub(); return; }

    const switchBtn = target.closest('.switch');
    if (switchBtn) {
      const next = switchBtn.getAttribute('aria-checked') !== 'true';
      switchBtn.setAttribute('aria-checked', String(next));
      const row = switchBtn.closest('.toggle-row');
      row?.setAttribute('data-on', String(next));
      const state = row?.querySelector('.toggle-row__state');
      if (state) state.textContent = next ? (root.lang === 'ar' ? 'مفعّل' : 'Activé') : (root.lang === 'ar' ? 'غير مفعّل' : 'Désactivé');
      return;
    }

    const pressed = target.closest('[data-pressed-group] [aria-pressed]');
    if (pressed) {
      const group = pressed.closest('[data-pressed-group]');
      group.querySelectorAll('[aria-pressed]').forEach(node => node.setAttribute('aria-pressed', 'false'));
      pressed.setAttribute('aria-pressed', 'true');
      return;
    }

    const segTab = target.closest('.seg-tab');
    if (segTab) {
      const modal = segTab.closest('.modal');
      modal?.querySelectorAll('.seg-tab').forEach(node => node.setAttribute('aria-selected', String(node === segTab)));
      modal?.querySelectorAll('[data-class-panel]').forEach(panel => {
        panel.hidden = panel.dataset.classPanel !== segTab.dataset.tab;
      });
      return;
    }

    const swatch = target.closest('.swatches .swatch');
    if (swatch) {
      swatch.closest('.swatches')?.querySelectorAll('.swatch').forEach(node => node.setAttribute('aria-pressed', String(node === swatch)));
      return;
    }

    const stepBtn = target.closest('.stepper__btn[data-step]');
    if (stepBtn) {
      const output = stepBtn.closest('.stepper')?.querySelector('.stepper__value');
      if (output) output.textContent = String(Math.min(9, Math.max(0, Number(output.textContent || '0') + Number(stepBtn.dataset.step))));
      return;
    }

    const toastButton = target.closest('[data-toast-ar]');
    if (toastButton) {
      event.preventDefault();
      toast(root.lang === 'ar' ? toastButton.dataset.toastAr : (toastButton.dataset.toastFr || toastButton.dataset.toastAr));
      return;
    }

    const wizardNext = target.closest('#wizard-next');
    if (wizardNext) {
      if (wizard.step < wizardSteps.length - 1) { wizard.step += 1; renderWizard(); }
      else { closeOverlay(document.getElementById('overlay-create')); toast(root.lang === 'ar' ? 'تم إنشاء القسم' : 'Classe créée'); }
      return;
    }
    const wizardBack = target.closest('#wizard-back');
    if (wizardBack) { wizard.step = Math.max(0, wizard.step - 1); renderWizard(); return; }

    const choiceCard = target.closest('.choice-card[data-flow]');
    if (choiceCard) {
      const group = choiceCard.closest('.stack-2');
      group?.querySelectorAll('.choice-card[aria-pressed]').forEach(node => {
        node.setAttribute('aria-pressed', 'false');
        node.querySelector('.choice-card__check')?.remove();
      });
      choiceCard.setAttribute('aria-pressed', 'true');
      if (!choiceCard.querySelector('.choice-card__check')) {
        const check = document.createElement('span');
        check.className = 'choice-card__check';
        check.setAttribute('aria-hidden', 'true');
        check.innerHTML = '<svg class="icon"><use href="#i-check"/></svg>';
        choiceCard.append(check);
      }
      if (choiceCard.dataset.flow === 'goto-group') { wizard.step = 1; renderWizard(); }
      else if (choiceCard.dataset.flow === 'goto-details') { wizard.step = 2; renderWizard(); }
      return;
    }

    const railToggle = target.closest('#rail-toggle');
    if (railToggle) {
      const sidebar = document.querySelector('.workspace-sidebar');
      sidebar.dataset.expanded = sidebar.dataset.expanded === 'true' ? 'false' : 'true';
      return;
    }

    const classOpen = target.closest('.class-card__open');
    if (classOpen) {
      closeAll();
      showScreen('editor');
      return;
    }
  });

  document.addEventListener('keydown', event => {
    if (event.key !== 'Escape') return;
    const openOverlayEl = [...document.querySelectorAll('.overlay.is-open')].pop();
    if (openOverlayEl) { event.preventDefault(); closeOverlay(openOverlayEl); }
  });

  /* ── Initialisation ───────────────────────────────────────────────────── */
  applyLocale(localStorage.getItem('maquette-lang') === 'fr' ? 'fr' : 'ar');
  applyDensity(localStorage.getItem('maquette-size') || 'md');
  syncThemeButtons();
  renderWizard();
  showScreen('dashboard');
  showPanel('apparence', { silent: true });

  const mq = window.matchMedia('(min-width: 1024px)');
  mq.addEventListener('change', () => {
    if (settingsBack) settingsBack.hidden = mq.matches || !settingsShell?.classList.contains('is-detail');
    if (mq.matches) showPanel(activePanel, { silent: true });
  });
})();
