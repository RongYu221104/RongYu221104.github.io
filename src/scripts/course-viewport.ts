import { graphSize } from '../data/course-paths';

/** One camera for mouse, pen, touch and keyboard. DOM writes are coalesced per frame. */
export function createCourseViewport(viewport: HTMLElement, map: HTMLElement, root: HTMLElement, signal: AbortSignal, onSelect: (code: string) => void, onGesture: () => void) {
  const { width, height } = graphSize;
  const output = root.querySelector<HTMLOutputElement>('[data-zoom-value]')!;
  const min = .2, max = 2.4, step = .1;
  let scale = 1, x = 0, y = 0, frame = 0, autoFit = true, wheelDelta = 0;
  let vw = viewport.clientWidth, vh = viewport.clientHeight;
  type Point = { x: number; y: number; startX: number; startY: number; code?: string };
  const pointers = new Map<number, Point>();
  let moved = false;
  let last = { x: 0, y: 0, distance: 0 };
  let pinchBase: { distance: number; scale: number; x: number; y: number; midX: number; midY: number } | undefined;
  const clamp = (value: number, lower: number, upper: number) => Math.max(lower, Math.min(upper, value));
  const quantize = (value: number) => clamp(Math.round(value / step) * step, min, max);

  function constrain() {
    x = width * scale <= vw ? (vw - width * scale) / 2 : clamp(x, vw - width * scale - 24, 24);
    y = height * scale <= vh ? (vh - height * scale) / 2 : clamp(y, vh - height * scale - 24, 24);
  }
  function paint() {
    frame = 0;
    map.style.transform = `translate(${x}px, ${y}px) scale(${scale})`;
    viewport.dataset.zoom = String(scale);
    viewport.dataset.panX = String(x);
    viewport.dataset.panY = String(y);
    output.value = `${Math.round(scale * 100)}%`;
    root.querySelector<HTMLButtonElement>('[data-zoom="out"]')!.disabled = scale <= min;
    root.querySelector<HTMLButtonElement>('[data-zoom="in"]')!.disabled = scale >= max;
  }
  function update() { constrain(); if (!frame) frame = requestAnimationFrame(paint); }
  function zoomAt(next: number, ax: number, ay: number) {
    const old = scale;
    scale = quantize(next);
    x = ax - (ax - x) * scale / old;
    y = ay - (ay - y) * scale / old;
    update();
  }
  function fit() {
    autoFit = true;
    const raw = Math.min((vw - 24) / width, (vh - 24) / height, 1);
    scale = clamp(Math.floor(raw / step) * step, min, 1);
    x = (vw - width * scale) / 2; y = (vh - height * scale) / 2;
    update();
  }
  function reset() {
    fit();
  }
  function reveal(cx: number, cy: number, readable = true) {
    autoFit = false;
    if (readable) scale = Math.max(1, scale);
    x = vw / 2 - cx * scale; y = vh / 2 - cy * scale;
    update();
  }
  function local(clientX: number, clientY: number) {
    const rect = viewport.getBoundingClientRect();
    return { x: clientX - rect.left - viewport.clientLeft, y: clientY - rect.top - viewport.clientTop };
  }
  function centroid() {
    const points = [...pointers.values()];
    if (points.length === 1) return { x: points[0].x, y: points[0].y, distance: 0 };
    return { x: (points[0].x + points[1].x) / 2, y: (points[0].y + points[1].y) / 2, distance: Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y) };
  }
  function endGesture() {
    for (const id of pointers.keys()) if (viewport.hasPointerCapture(id)) viewport.releasePointerCapture(id);
    pointers.clear(); moved = false;
    pinchBase = undefined;
    viewport.classList.remove('is-dragging');
  }
  viewport.addEventListener('wheel', event => {
    event.preventDefault();
    if (pointers.size) return;
    autoFit = false; onGesture();
    const anchor = local(event.clientX, event.clientY);
    const delta = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? vh : 1);
    wheelDelta += delta;
    if (Math.abs(wheelDelta) < 40) return;
    zoomAt(scale + (wheelDelta < 0 ? step : -step), anchor.x, anchor.y);
    wheelDelta = 0;
  }, { passive: false, signal });
  viewport.addEventListener('pointerdown', event => {
    if (event.button !== 0 || pointers.size >= 2) return;
    event.preventDefault();
    const p = local(event.clientX, event.clientY);
    if (!pointers.size) moved = false;
    pointers.set(event.pointerId, { ...p, startX: p.x, startY: p.y, code: (event.target as Element).closest<HTMLElement>('[data-course]')?.dataset.course });
    viewport.setPointerCapture(event.pointerId);
    last = centroid();
    if (pointers.size > 1) {
      moved = true; onGesture();
      pinchBase = { distance: last.distance, scale, x, y, midX: last.x, midY: last.y };
    }
  }, { signal });
  viewport.addEventListener('pointermove', event => {
    const p = pointers.get(event.pointerId);
    if (!p) return;
    const current = local(event.clientX, event.clientY);
    p.x = current.x; p.y = current.y;
    if (!moved && Math.hypot(p.x - p.startX, p.y - p.startY) <= 6) return;
    moved = true; autoFit = false; onGesture();
    viewport.classList.add('is-dragging');
    const next = centroid();
    if (pointers.size === 2 && pinchBase?.distance) {
      // Quantize against the gesture's starting distance so small moves accumulate naturally.
      scale = quantize(pinchBase.scale * next.distance / pinchBase.distance);
      x = next.x - (pinchBase.midX - pinchBase.x) * scale / pinchBase.scale;
      y = next.y - (pinchBase.midY - pinchBase.y) * scale / pinchBase.scale;
    } else { x += next.x - last.x; y += next.y - last.y; }
    last = next; update();
  }, { signal });
  function release(event: PointerEvent, cancelled = false) {
    const p = pointers.get(event.pointerId);
    if (!p) return;
    const tapped = !cancelled && !moved && pointers.size === 1 && p.code;
    pointers.delete(event.pointerId);
    if (viewport.hasPointerCapture(event.pointerId)) viewport.releasePointerCapture(event.pointerId);
    if (pointers.size) { last = centroid(); pinchBase = undefined; }
    else { viewport.classList.remove('is-dragging'); moved = false; pinchBase = undefined; }
    if (tapped) onSelect(tapped);
  }
  viewport.addEventListener('pointerup', event => release(event), { signal });
  viewport.addEventListener('pointercancel', event => release(event, true), { signal });
  viewport.addEventListener('lostpointercapture', event => release(event, true), { signal });
  // Pointer taps are committed above; suppress the browser's follow-up click after any drag/pinch.
  viewport.addEventListener('click', event => { if (event.detail > 0) { event.preventDefault(); event.stopPropagation(); } }, { capture: true, signal });
  window.addEventListener('blur', endGesture, { signal });
  viewport.addEventListener('keydown', event => {
    if (event.target !== viewport) return;
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    const shift = event.shiftKey ? 140 : 60;
    if (event.key === 'Home') { event.preventDefault(); fit(); return; }
    if (event.key === '+' || event.key === '=' || event.key === '-') {
      event.preventDefault(); autoFit = false; zoomAt(scale + (event.key === '-' ? -step : step), vw / 2, vh / 2); return;
    }
    const movement: Record<string, [number, number]> = { ArrowLeft: [shift, 0], ArrowRight: [-shift, 0], ArrowUp: [0, shift], ArrowDown: [0, -shift] };
    if (movement[event.key]) { event.preventDefault(); autoFit = false; x += movement[event.key][0]; y += movement[event.key][1]; update(); }
  }, { signal });
  const observer = new ResizeObserver(() => {
    const nw = viewport.clientWidth, nh = viewport.clientHeight;
    if (nw === vw && nh === vh) return;
    const cx = (vw / 2 - x) / scale, cy = (vh / 2 - y) / scale;
    vw = nw; vh = nh;
    endGesture();
    if (autoFit) fit();
    else { x = vw / 2 - cx * scale; y = vh / 2 - cy * scale; update(); }
  });
  observer.observe(viewport);
  signal.addEventListener('abort', () => { endGesture(); observer.disconnect(); if (frame) cancelAnimationFrame(frame); }, { once: true });
  reset();
  return {
    fit, reset, reveal,
    zoom(direction: string) { autoFit = false; zoomAt(direction === 'read' ? 1 : scale + (direction === 'in' ? step : -step), vw / 2, vh / 2); },
    isInteracting: () => pointers.size > 0,
    ensureVisible(node: HTMLElement) {
      const cx = parseFloat(node.style.left) + graphSize.nodeWidth / 2;
      const cy = parseFloat(node.style.top) + graphSize.nodeHeight / 2;
      if (x + cx * scale < 30 || x + cx * scale > vw - 30 || y + cy * scale < 30 || y + cy * scale > vh - 30) reveal(cx, cy, false);
    },
  };
}
