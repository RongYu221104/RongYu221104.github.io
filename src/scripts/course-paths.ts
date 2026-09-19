import { courses, courseEdges, courseByCode, relatedCourses, graphSize } from '../data/course-paths';

import { createCourseViewport } from './course-viewport';

function initializeCoursePaths() {
  const candidate = document.querySelector<HTMLElement>('[data-course-paths]');
  if (!candidate || candidate.dataset.ready) return;
  const root: HTMLElement = candidate;
  root.dataset.ready = 'true';
  const controller = new AbortController();
  const { signal } = controller;
  const query = <T extends HTMLElement>(selector: string) => root.querySelector<T>(selector)!;
  const all = <T extends Element>(selector: string) => Array.from(root.querySelectorAll<T>(selector));
  const viewport = query<HTMLElement>('[data-path-viewport]');
  const map = query<HTMLElement>('[data-path-map]');
  const search = query<HTMLInputElement>('[data-path-search]');
  const detail = query<HTMLElement>('.path-detail');
  const status = query<HTMLElement>('[data-path-status]');
  const focusButton = query<HTMLButtonElement>('[data-path-focus]');
  const buttons = all<HTMLButtonElement>('[data-course]');
  const nodes = all<HTMLButtonElement>('.path-node');
  const edgeElements = all<SVGPathElement>('[data-edge-from]');
  let selected = '';
  let focused = false;
  let hard = true;
  let soft = false;
  let hover = '';
  let detailMotion: Animation | undefined;
  const reduceMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const enabledEdges = () => courseEdges.filter(e => e.kind === 'hard' ? hard : soft);

  function drawEmphasis() {
    const code = hover || selected;
    const edges = enabledEdges();
    const near = code ? new Set([code, ...relatedCourses(code, edges, 'up'), ...relatedCourses(code, edges, 'down')]) : new Set<string>();
    const selectedNear = selected ? new Set([selected, ...relatedCourses(selected, edges, 'up'), ...relatedCourses(selected, edges, 'down')]) : new Set<string>();
    const term = search.value.trim().toLocaleLowerCase();
    nodes.forEach(node => {
      const id = node.dataset.course!;
      const course = courseByCode.get(id)!;
      const matches = `${course.code} ${course.titleZh} ${course.titleEn}`.toLocaleLowerCase().includes(term);
      node.hidden = focused && !!selected && !selectedNear.has(id);
      node.classList.toggle('is-muted', (!!code && !near.has(id)) || !matches);
      node.classList.toggle('is-related', !!code && code !== id && near.has(id));
    });
    edgeElements.forEach(path => {
      const from = path.dataset.edgeFrom!, to = path.dataset.edgeTo!;
      const enabled = path.dataset.edgeKind === 'hard' ? hard : soft;
      const connects = from === code || to === code;
      const focusConnects = from === selected || to === selected;
      path.classList.toggle('is-hidden', !enabled || (focused && !!selected && !focusConnects));
      path.classList.toggle('is-active', enabled && !!code && connects);
      path.classList.toggle('is-muted', enabled && !!code && !connects);
      if (enabled && !code) path.style.opacity = '.4';
      else path.style.removeProperty('opacity');
      // The hidden rule must also win over the overview's inline opacity.
      if (!enabled || (focused && !!selected && !focusConnects)) path.style.opacity = '0';
    });
  }

  function syncUrl() {
    const params = new URLSearchParams();
    if (selected) params.set('course', selected);
    const relationMode = hard && soft ? 'all' : hard ? 'hard' : 'soft';
    if (relationMode !== 'hard') params.set('relations', relationMode);
    if (focused && selected) params.set('focus', '1');
    const hash = params.size ? `#${params}` : '';
    // Keep Astro's route metadata: a null state makes ClientRouter ignore Back from the reader.
    if (location.hash !== hash) history.pushState({ ...history.state, scrollX: window.scrollX, scrollY: window.scrollY }, '', `${location.pathname}${location.search}${hash}`);
  }

  function render() {
    root.dataset.hasSelection = String(!!selected);
    query<HTMLElement>('[data-path-welcome]').hidden = !!selected;
    query<HTMLElement>('[data-detail-controls]').hidden = !selected;
    all<HTMLElement>('[data-course-detail]').forEach(article => article.hidden = article.dataset.courseDetail !== selected);
    buttons.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.course === selected)));
    const relationMode = hard && soft ? 'all' : hard ? 'hard' : 'soft';
    all<HTMLButtonElement>('[data-relation]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.relation === relationMode)));
    focusButton.setAttribute('aria-pressed', String(focused));
    focusButton.textContent = focused ? '返回整体关系' : '聚焦直接关系';
    const edges = enabledEdges();
    const filters = [hard && '硬性', soft && '软性'].filter(Boolean).join('与') || '无';
    status.textContent = selected
      ? `已选 ${selected} · ${courseByCode.get(selected)!.titleZh}。地图显示${filters}关系：${relatedCourses(selected, edges, 'up').size} 门直接前置，${relatedCourses(selected, edges, 'down').size} 门后续课程。详情保留全部关系。`
      : `全图 · ${courses.length} 门课程 · 显示${filters}关系。选择一门课程开始探索。`;
    drawEmphasis();
  }

  function select(code: string, scroll = false) {
    if (!courseByCode.has(code)) return;
    const changed = code !== selected;
    selected = code;
    hover = '';
    if (changed) detail.scrollTop = 0;
    render();
    syncUrl();
    detailMotion?.cancel();
    if (changed && !reduceMotion()) {
      const article = query<HTMLElement>(`[data-course-detail="${code}"]`);
      detailMotion = article.animate([{ opacity: .3, transform: 'translateY(4px)' }, { opacity: 1, transform: 'translateY(0)' }], { duration: 180, easing: 'cubic-bezier(.22,1,.36,1)' });
    }
    if (scroll && (window.innerWidth <= 900 || detail.getBoundingClientRect().top < 0)) {
      detail.scrollIntoView({ block: 'start', behavior: reduceMotion() ? 'instant' : 'smooth' });
    }
  }

  const camera = createCourseViewport(viewport, map, root, signal,
    code => select(code, true),
    () => { if (hover) { hover = ''; drawEmphasis(); } });

  function readUrl() {
    const params = new URLSearchParams(location.hash.slice(1));
    selected = courseByCode.has(params.get('course') || '') ? params.get('course')! : '';
    const relationMode = params.get('relations');
    if (relationMode === 'soft') { hard = false; soft = true; }
    else if (relationMode === 'all') { hard = true; soft = true; }
    else if (params.get('hard') === '0' && params.get('soft') === '1') { hard = false; soft = true; }
    else if (params.get('soft') === '1') { hard = true; soft = true; }
    else { hard = true; soft = false; }
    focused = !!selected && params.get('focus') === '1';
    hover = '';
    render();
  }
  root.addEventListener('click', event => {
    const target = (event.target as Element).closest<HTMLButtonElement>('button');
    if (!target) return;
    if (target.dataset.course) {
      const fromDetail = !!target.closest('[data-course-detail]');
      select(target.dataset.course, true);
      if (!target.closest('[data-path-viewport]')) {
        const course = courseByCode.get(target.dataset.course)!;
        camera.reveal(course.x + graphSize.nodeWidth / 2, course.y + graphSize.nodeHeight / 2);
      }
      if (fromDetail) query<HTMLElement>(`[data-course-detail="${selected}"] h2`).focus({ preventScroll: true });
    }
    else if (target.hasAttribute('data-path-clear')) {
      selected = ''; focused = false; hover = ''; render(); syncUrl();
      if (window.innerWidth <= 760) search.focus({ preventScroll: true });
    } else if (target.hasAttribute('data-path-focus')) {
      focused = !focused; hover = ''; render(); syncUrl();
    } else if (target.dataset.relation) {
      hard = target.dataset.relation !== 'soft';
      soft = target.dataset.relation !== 'hard';
      hover = ''; render(); syncUrl();
    } else if (target.hasAttribute('data-return-map')) {
      query<HTMLElement>('.path-map-bar').scrollIntoView({ block: 'start', behavior: reduceMotion() ? 'instant' : 'smooth' });
      viewport.focus({ preventScroll: true });
    } else if (target.dataset.zoom) {
      if (target.dataset.zoom === 'fit') camera.fit();
      else camera.zoom(target.dataset.zoom);
    }
  }, { signal });
  search.addEventListener('input', () => {
    drawEmphasis();
    const term = search.value.trim().toLocaleLowerCase();
    const count = courses.filter(course => `${course.code} ${course.titleZh} ${course.titleEn}`.toLocaleLowerCase().includes(term)).length;
    status.textContent = term
      ? `找到 ${count} 门课程。图中不匹配的课程已淡化，所选课程详情保留。`
      : `全图 · ${courses.length} 门课程 · 显示${hard && soft ? '硬性与软性' : hard ? '硬性' : '软性'}关系。选择一门课程开始探索。`;
  }, { signal });
  viewport.addEventListener('pointerover', event => {
    if (event.pointerType !== 'mouse' || camera.isInteracting()) return;
    hover = (event.target as Element).closest<HTMLElement>('[data-course]')?.dataset.course || '';
    drawEmphasis();
  }, { signal });
  viewport.addEventListener('pointerleave', () => { hover = ''; drawEmphasis(); }, { signal });
  viewport.addEventListener('focusin', event => {
    hover = (event.target as HTMLElement).dataset.course || ''; drawEmphasis();
    const target = event.target as HTMLElement;
    if (target.matches('.path-node')) camera.ensureVisible(target);
  }, { signal });
  viewport.addEventListener('focusout', () => { hover = ''; drawEmphasis(); }, { signal });
  root.addEventListener('keydown', event => {
    if (event.key === 'Escape' && selected) {
      selected = ''; focused = false; hover = ''; render(); syncUrl(); search.focus({ preventScroll: true });
    }
  }, { signal });
  window.addEventListener('popstate', readUrl, { signal });
  window.addEventListener('hashchange', readUrl, { signal });
  document.addEventListener('astro:before-swap', () => {
    controller.abort(); detailMotion?.cancel();
  }, { once: true, signal });
  readUrl();
}

initializeCoursePaths();
document.addEventListener('astro:page-load', initializeCoursePaths);
