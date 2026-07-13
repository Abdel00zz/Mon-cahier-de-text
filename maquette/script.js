(() => {
  const root = document;
  const modalLayer = root.querySelector('[data-modal-layer]');
  const dashboard = root.querySelector('#dashboardView');
  const editor = root.querySelector('#editorView');
  const toastRegion = root.querySelector('[data-toast-region]');
  let activeModal = null;
  let lastFocus = null;
  let toastTimer = null;

  const showToast = (message) => {
    if (!toastRegion) return;
    toastRegion.textContent = message;
    toastRegion.hidden = false;
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => { toastRegion.hidden = true; }, 2800);
  };

  const closeModal = (restoreFocus = true) => {
    if (!modalLayer) return;
    modalLayer.hidden = true;
    root.querySelectorAll('[data-modal]').forEach(modal => { modal.hidden = true; });
    document.body.classList.remove('modal-open');
    const focusTarget = lastFocus;
    activeModal = null;
    lastFocus = null;
    if (restoreFocus && focusTarget instanceof HTMLElement) focusTarget.focus();
  };

  const openModal = (id, trigger = null) => {
    if (!modalLayer) return;
    const modal = root.querySelector(`[data-modal="${id}"]`);
    if (!modal) return;
    closeModal(false);
    lastFocus = trigger instanceof HTMLElement ? trigger : document.activeElement;
    activeModal = modal;
    modalLayer.hidden = false;
    modal.hidden = false;
    document.body.classList.add('modal-open');
    window.setTimeout(() => {
      const focusable = modal.querySelector('button, input, select, textarea, [tabindex]:not([tabindex="-1"])');
      if (focusable instanceof HTMLElement) focusable.focus();
    }, 20);
  };

  const setView = (name) => {
    const showEditor = name === 'editor';
    dashboard.hidden = showEditor;
    editor.hidden = !showEditor;
    document.body.dataset.view = name;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  root.addEventListener('click', (event) => {
    const target = event.target instanceof Element ? event.target.closest('[data-open], [data-close-modal], [data-go-dashboard], [data-open-editor], [data-toast]') : null;
    if (!target) return;

    if (target.hasAttribute('data-go-dashboard')) {
      event.preventDefault();
      closeModal();
      setView('dashboard');
      return;
    }
    if (target.hasAttribute('data-open-editor')) {
      const className = target.getAttribute('data-class') || '2AC 3';
      const classTitle = root.querySelector('[data-editor-class]');
      if (classTitle) classTitle.textContent = className;
      setView('editor');
      return;
    }
    const toastMessage = target.getAttribute('data-toast');
    if (toastMessage) showToast(toastMessage);
    if (target.hasAttribute('data-close-modal')) {
      closeModal();
      return;
    }
    const modalId = target.getAttribute('data-open');
    if (modalId) {
      openModal(modalId, target);
    }
  });

  modalLayer?.addEventListener('click', (event) => {
    if (event.target === modalLayer) closeModal();
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && activeModal) {
      closeModal();
      return;
    }
    if (event.key !== 'Tab' || !activeModal) return;
    const focusables = [...activeModal.querySelectorAll('button, input, select, textarea, [tabindex]:not([tabindex="-1"])')].filter(item => !item.hasAttribute('disabled'));
    if (!focusables.length) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  });

  const searchBox = root.querySelector('[data-search-box]');
  const searchInput = root.querySelector('[data-search-input]');
  const resultRegion = root.querySelector('[data-search-results]');
  const resultList = root.querySelector('[data-result-list]');
  const cards = [...root.querySelectorAll('[data-open-editor]')];
  const openSearch = () => {
    searchBox?.classList.add('is-open');
    window.setTimeout(() => searchInput?.focus(), 30);
  };
  const closeSearch = () => {
    if (searchInput) searchInput.value = '';
    searchBox?.classList.remove('is-open');
    if (resultRegion) resultRegion.hidden = true;
  };
  const renderSearch = (value) => {
    const query = value.trim().toLocaleLowerCase('fr');
    if (!query) { if (resultRegion) resultRegion.hidden = true; return; }
    const matches = cards.filter(card => card.textContent.toLocaleLowerCase('fr').includes(query));
    if (resultRegion) resultRegion.hidden = false;
    if (!resultList) return;
    resultList.innerHTML = matches.length
      ? matches.map(card => `<button class="result-item" type="button" data-class="${card.dataset.class}" data-open-editor><span><strong>${card.dataset.class}</strong><small>${card.querySelector('.class-name')?.textContent || 'Cahier de textes'}</small></span><span class="count-badge">Ouvrir</span></button>`).join('')
      : '<div class="empty-state"><p>Aucun contenu ne correspond à cette recherche.</p></div>';
  };
  root.querySelector('[data-toggle-search]')?.addEventListener('click', openSearch);
  root.querySelectorAll('[data-clear-search]').forEach(button => button.addEventListener('click', closeSearch));
  searchInput?.addEventListener('input', event => renderSearch(event.target.value));

  root.querySelectorAll('[data-guide-lang]').forEach(button => button.addEventListener('click', () => {
    const isArabic = button.dataset.guideLang === 'ar';
    const guide = root.querySelector('[data-guide-content]');
    if (!guide) return;
    guide.classList.toggle('guide--arabic', isArabic);
    guide.lang = isArabic ? 'ar' : 'fr';
    guide.querySelector('.guide-paper h3').textContent = isArabic ? 'ابدأ بثلاث خطوات' : 'Commencer en trois gestes';
    guide.querySelector('.guide-intro').textContent = isArabic ? 'كل شاشة تقترح عليك خطوة واضحة. تبقى التنبيهات المهمة ظاهرة حتى تتم معالجتها.' : 'Chaque écran vous donne une prochaine action claire. Les alertes importantes restent visibles jusqu’à leur résolution.';
    root.querySelectorAll('[data-guide-lang]').forEach(item => item.classList.toggle('button--primary', item === button));
  }));

  root.querySelectorAll('[data-transfer-tab]').forEach(button => button.addEventListener('click', () => {
    const tab = button.dataset.transferTab;
    root.querySelectorAll('[data-transfer-tab]').forEach(item => item.classList.toggle('is-active', item === button));
    root.querySelectorAll('[data-transfer-panel]').forEach(panel => { panel.hidden = panel.dataset.transferPanel !== tab; });
  }));

  // Les boutons data-open dans une modale enchaînent vers la prochaine étape.
  root.addEventListener('click', event => {
    const target = event.target instanceof Element ? event.target.closest('[data-open="plannerModal"]') : null;
    if (target && activeModal) openModal('plannerModal', target);
  });
})();
