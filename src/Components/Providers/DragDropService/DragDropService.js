import { getHandleConfig, computeResizeRect } from './dndGeometry.js';

// PATCHED for touch (see GOTCHAS.md §14 for the vendored-patch convention):
// a finger on a draggable is ambiguous — scroll or drag? — and the browser
// settles it at the first move: unless `touch-action` forbids panning it
// starts scrolling and fires `pointercancel`, after which no pointermove/
// pointerup ever arrives for that pointer. The registry version never
// listened for pointercancel, so the half-started drag stayed "active"
// forever (every later drag was refused by `if (this._activeDrag) return`)
// and a sortable left its item display:none with the ghost stuck on screen.
// Now: (1) pointercancel cleans up — drag without drop, sortable back to its
// original slot, no onReorder; (2) on touch the gesture arms only after the
// finger is held still for `touchDelay` ms (moving beyond `_TOUCH_SLOP` first
// means "scroll" and hands the gesture back to the browser); once armed, a
// non-passive touchmove listener preventDefault()s so the page can't take
// the gesture away, and the long-press context menu / selection callout are
// suppressed. Mouse/pen behave exactly as before (no delay).
export default class DragDropService {
  static _TOUCH_DELAY = 200; // ms of stillness before a touch drag/sort arms (a scroll starts moving well before that)
  static _TOUCH_SLOP = 8;    // px moved during the hold that means "scroll, not drag"

  constructor() {
    this._draggables = new Map();
    this._droppables = new Map();
    this._resizables = new Map();
    this._sortables = new Map();
    this._activeDrag = null;
    this._activeDrop = null;
    this._activeResize = null;
    this._activeSortable = null;
    this._ghost = null;
    this._droppableRects = null;
    this._scroll = null;
    this._touch = null;   // pending/armed touch gesture (see _armForTouch)

    this._onPointerDown = this._onPointerDown.bind(this);
    this._onPointerMove = this._onPointerMove.bind(this);
    this._onPointerUp = this._onPointerUp.bind(this);
    this._onPointerCancel = this._onPointerCancel.bind(this);
    this._onViewportChange = this._snapshotDroppables.bind(this);
    this._autoScrollTick = this._autoScrollTick.bind(this);

    document.addEventListener('pointerdown', this._onPointerDown);
    DragDropService._injectCSS();
  }

  static _cssInjected = false;

  static _injectCSS() {
    if (DragDropService._cssInjected) return;
    DragDropService._cssInjected = true;
    const old = document.getElementById('dnd-service-styles');
    if (old) old.remove();
    const style = document.createElement('style');
    style.id = 'dnd-service-styles';
    style.textContent = `
      .dnd-handle{position:absolute;z-index:1;touch-action:none;transition:background .15s,border-color .15s,box-shadow .15s}
      .dnd-handle:hover{background:rgba(59,130,246,.28);border-color:rgba(59,130,246,.9)}
      .dnd-handle--n,.dnd-handle--s,.dnd-handle--e,.dnd-handle--w{border-radius:1px;background:rgba(59,130,246,.14);border:1px solid rgba(59,130,246,.45)}
      .dnd-handle--n{bottom:auto;top:-5px;left:6px;right:6px;height:10px;cursor:ns-resize}
      .dnd-handle--s{top:auto;bottom:-5px;left:6px;right:6px;height:10px;cursor:ns-resize}
      .dnd-handle--e{left:auto;right:-5px;top:6px;bottom:6px;width:10px;cursor:ew-resize}
      .dnd-handle--w{right:auto;left:-5px;top:6px;bottom:6px;width:10px;cursor:ew-resize}
      .dnd-handle--ne,.dnd-handle--nw,.dnd-handle--se,.dnd-handle--sw{border-radius:4px;background:#fff;border:1.5px solid rgba(59,130,246,.75);box-shadow:0 1px 4px rgba(0,0,0,.2)}
      .dnd-handle--ne::after,.dnd-handle--nw::after,.dnd-handle--se::after,.dnd-handle--sw::after{content:'';position:absolute;inset:2px;border-radius:2px;background:repeating-linear-gradient(135deg,transparent,transparent 2px,rgba(59,130,246,.18) 2px,rgba(59,130,246,.18) 3px);pointer-events:none}
      .dnd-handle--ne{inset:auto -5px -5px auto;width:16px;height:16px;cursor:nesw-resize}
      .dnd-handle--nw{inset:-5px auto -5px -5px;width:16px;height:16px;cursor:nwse-resize}
      .dnd-handle--se{bottom:-5px;right:-5px;width:16px;height:16px;cursor:nwse-resize}
      .dnd-handle--sw{bottom:-5px;left:-5px;width:16px;height:16px;cursor:nesw-resize}
      .dnd-ghost{position:fixed;pointer-events:none;z-index:999999;opacity:.85;margin:0;will-change:transform;box-shadow:0 8px 30px rgba(0,0,0,.15)}
      .dnd-sortable-ph{pointer-events:none;flex:0 0 auto}
      .dnd-dragging{user-select:none;-webkit-user-select:none;-webkit-touch-callout:none}
    `;
    document.head.appendChild(style);
  }

  // ─── Draggable ───────────────────────────────────────────────

  makeDraggable(node, config = {}) {
    const cfg = {
      handle: config.handle || null,
      data: config.data || null,
      axis: config.axis || 'both',
      ghost: config.ghost !== false,
      ghostClass: config.ghostClass || '',
      threshold: config.threshold || 0,
      touchDelay: config.touchDelay ?? DragDropService._TOUCH_DELAY,
      freePosition: config.freePosition || false,
      autoScroll: config.autoScroll !== false,
      onDragStart: config.onDragStart || null,
      onDrag: config.onDrag || null,
      onDragEnd: config.onDragEnd || null,
    };
    this._draggables.set(node, cfg);
    return this;
  }

  // ─── Droppable ───────────────────────────────────────────────

  makeDroppable(node, config = {}) {
    const cfg = {
      accept: config.accept || null,
      onDragEnter: config.onDragEnter || null,
      onDragLeave: config.onDragLeave || null,
      onDragOver: config.onDragOver || null,
      onDrop: config.onDrop || null,
    };
    this._droppables.set(node, cfg);
    return this;
  }

  // ─── Resizable ───────────────────────────────────────────────

  makeResizable(node, config = {}) {
    const cfg = {
      handles: config.handles || ['se'],
      minWidth: config.minWidth ?? 50,
      minHeight: config.minHeight ?? 50,
      maxWidth: config.maxWidth ?? Infinity,
      maxHeight: config.maxHeight ?? Infinity,
      onResizeStart: config.onResizeStart || null,
      onResize: config.onResize || null,
      onResizeEnd: config.onResizeEnd || null,
    };

    const pos = window.getComputedStyle(node).position;
    if (pos === 'static') node.style.position = 'relative';

    const container = document.createElement('div');
    container.className = 'dnd-resize-handles';
    container.style.cssText = 'position:absolute;top:0;left:0;right:0;bottom:0;pointer-events:none';

    for (const name of cfg.handles) {
      const hc = getHandleConfig(name);
      if (!hc) continue;
      const el = document.createElement('div');
      el.className = `dnd-handle dnd-handle--${name}`;
      el.dataset.handle = name;
      el.style.pointerEvents = 'auto';
      el.addEventListener('pointerdown', (e) => this._onHandlePointerDown(e, node, cfg, hc.edges));
      container.appendChild(el);
    }

    node.appendChild(container);
    this._resizables.set(node, cfg);
    return this;
  }

  // ─── Detach / Destroy ────────────────────────────────────────

  detach(node) {
    this._draggables.delete(node);
    this._droppables.delete(node);

    if (this._resizables.delete(node)) {
      const handles = node.querySelector('.dnd-resize-handles');
      if (handles) handles.remove();
    }

    const sortCfg = this._sortables.get(node);
    if (sortCfg) {
      node.removeEventListener('pointerdown', sortCfg._onDown);
      this._sortables.delete(node);
    }

    if (this._activeDrag?.node === node) {
      this._endDrag(null);
    }
    if (this._activeDrop?.node === node) {
      this._activeDrop = null;
    }
    if (this._activeResize?.node === node) {
      this._endResize(null);
    }
    if (this._activeSortable?.container === node) {
      this._endSortable(null);
    }
    return this;
  }

  // PATCHED: was named destroy() — the framework only ever calls
  // beforeDestroy(), so this cleanup (removing the document-level
  // pointerdown listener, among other things) could never actually run.
  // If DragDropService is ever re-synced from the registry
  // (`slice sync --service`), re-check this rename survived.
  beforeDestroy() {
    document.removeEventListener('pointerdown', this._onPointerDown);
    if (this._activeDrag) this._endDrag(null);
    if (this._activeSortable) this._endSortable(null);
    this._removeDocListeners();   // also drops a touch hold still pending

    for (const node of this._resizables.keys()) {
      const handles = node.querySelector('.dnd-resize-handles');
      if (handles) handles.remove();
    }

    for (const [container, cfg] of this._sortables) {
      container.removeEventListener('pointerdown', cfg._onDown);
    }

    this._removeGhost();
    this._stopAutoScroll();
    this._draggables.clear();
    this._droppables.clear();
    this._resizables.clear();
    this._sortables.clear();

    document.body.classList.remove('dnd-dragging');
    this._removeDocListeners();
  }

  // ─── Internal: Pointer Dispatch ──────────────────────────────

  _onPointerDown(event) {
    if (event.button !== 0) return;

    for (const [node, cfg] of this._draggables) {
      if (!node.isConnected) continue;
      if (!node.contains(event.target)) continue;
      if (event.target.closest('.dnd-resize-handles')) continue;

      if (cfg.handle) {
        const handleEl = typeof cfg.handle === 'string'
          ? node.querySelector(cfg.handle)
          : cfg.handle;
        if (!handleEl || !handleEl.contains(event.target)) continue;
      }

      this._startDrag(event, node, cfg);
      return;
    }
  }

  _onPointerMove(event) {
    const t = this._touch;
    if (t && !t.armed) {
      // Still deciding: a real move during the hold is a scroll, not a drag.
      if (Math.hypot(event.clientX - t.x, event.clientY - t.y) > DragDropService._TOUCH_SLOP) this._cancelPendingTouch();
      return;
    }
    if (this._activeSortable) {
      this._onSortableMove(event);
      return;
    }
    if (this._activeResize) {
      this._onResizeMove(event);
      return;
    }
    if (this._activeDrag) {
      this._onDragMove(event);
    }
  }

  _onPointerUp(event) {
    if (this._touch && !this._touch.armed) {
      // Lifted before the hold elapsed: a tap, nothing to drag.
      this._cancelPendingTouch();
      return;
    }
    if (this._activeSortable) {
      this._endSortable(event);
      return;
    }
    if (this._activeResize) {
      this._endResize(event);
      return;
    }
    if (this._activeDrag) {
      this._endDrag(event);
    }
  }

  // The browser took the pointer (it started scrolling/zooming, or the touch
  // was interrupted): whatever was in flight ends WITHOUT a drop/reorder.
  _onPointerCancel(event) {
    if (this._touch && !this._touch.armed) {
      this._cancelPendingTouch();
      return;
    }
    if (this._activeSortable) {
      this._endSortable(event, { cancelled: true });
      return;
    }
    if (this._activeResize) {
      this._endResize(event);
      return;
    }
    if (this._activeDrag) {
      this._endDrag(event, { cancelled: true });
    }
  }

  _addDocListeners() {
    document.addEventListener('pointermove', this._onPointerMove);
    document.addEventListener('pointerup', this._onPointerUp);
    document.addEventListener('pointercancel', this._onPointerCancel);
  }

  // Every gesture ends here (drop, cancel, detach, destroy), so the touch
  // bookkeeping is cleared here too.
  _removeDocListeners() {
    document.removeEventListener('pointermove', this._onPointerMove);
    document.removeEventListener('pointerup', this._onPointerUp);
    document.removeEventListener('pointercancel', this._onPointerCancel);
    this._clearTouch();
  }

  // ─── Internal: Touch arming ──────────────────────────────────

  // Touch pointers defer `begin()` (what mouse/pen do at pointerdown) until
  // the finger has stayed put for `delay` ms. Until then the page is free to
  // scroll; a move beyond _TOUCH_SLOP or a lift cancels. Once armed, touchmove
  // is preventDefault()ed (the only way to stop the browser from panning and
  // firing pointercancel mid-drag) and the long-press context menu is
  // suppressed. Mouse/pen never come through here.
  _armForTouch(event, delay, begin) {
    const t = { armed: false, x: event.clientX, y: event.clientY, timer: null };
    t.onTouchMove = (e) => { if (t.armed) e.preventDefault(); };
    t.onContextMenu = (e) => e.preventDefault();
    document.addEventListener('touchmove', t.onTouchMove, { passive: false });
    document.addEventListener('contextmenu', t.onContextMenu);
    t.timer = setTimeout(() => {
      t.timer = null;
      t.armed = true;
      navigator.vibrate?.(10);
      begin();
    }, delay);
    this._touch = t;
  }

  _cancelPendingTouch() {
    this._removeDocListeners();   // also clears the touch bookkeeping
  }

  _clearTouch() {
    const t = this._touch;
    if (!t) return;
    if (t.timer != null) clearTimeout(t.timer);
    document.removeEventListener('touchmove', t.onTouchMove);
    document.removeEventListener('contextmenu', t.onContextMenu);
    this._touch = null;
  }

  // ─── Internal: Drag ──────────────────────────────────────────

  _startDrag(event, node, cfg) {
    if (this._activeDrag || this._touch) return;

    const begin = () => {
      // Detached during the touch hold (a repaint removed the node): nothing to drag.
      if (!this._draggables.has(node) || !node.isConnected) { this._removeDocListeners(); return; }
      this._activeDrag = {
        node, cfg,
        startPos: { x: event.clientX, y: event.clientY },
        currentPos: { x: event.clientX, y: event.clientY },
        startRect: node.getBoundingClientRect(),
        active: false,
        data: cfg.data,
      };
      // A touch drag arms with the finger still, so activate right away: the
      // ghost appearing under the finger is the "you're dragging" feedback.
      if (event.pointerType === 'touch') this._activateDrag(this._activeDrag, event);
    };

    if (event.pointerType === 'touch') this._armForTouch(event, cfg.touchDelay, begin);
    else begin();

    this._addDocListeners();
  }

  _activateDrag(d, event) {
    d.active = true;
    document.body.classList.add('dnd-dragging');
    if (d.cfg.ghost) this._createGhost(d.node, d.cfg);
    d.cfg.onDragStart?.(d.node, event, d.data);
    // Snapshot droppable rects once per drag instead of measuring every move
    // (a getBoundingClientRect per droppable per pointermove forces layout).
    // Scroll/resize during the drag re-snapshots so hit-testing stays correct.
    this._snapshotDroppables();
    window.addEventListener('scroll', this._onViewportChange, true);
    window.addEventListener('resize', this._onViewportChange);
  }

  _onDragMove(event) {
    const d = this._activeDrag;
    d.currentPos = { x: event.clientX, y: event.clientY };
    const dx = d.currentPos.x - d.startPos.x;
    const dy = d.currentPos.y - d.startPos.y;

    if (!d.active) {
      if (Math.sqrt(dx * dx + dy * dy) < d.cfg.threshold) return;
      this._activateDrag(d, event);
    }

    let moveX = dx;
    let moveY = dy;
    if (d.cfg.axis === 'x') moveY = 0;
    if (d.cfg.axis === 'y') moveX = 0;

    if (this._ghost) {
      this._ghost.style.transform = `translate(${moveX}px, ${moveY}px)`;
    } else if (d.cfg.freePosition) {
      // No ghost + freePosition → move the real element live so the container
      // follows the pointer directly. The offset is committed to left/top in
      // _endDrag, where the transform is cleared.
      d.node.style.transform = `translate(${moveX}px, ${moveY}px)`;
    }

    d.cfg.onDrag?.(d.node, event, d.data, { dx: moveX, dy: moveY });
    this._updateDroppableHover(event);
    if (d.cfg.autoScroll && this._dragCanScroll(d)) this._updateAutoScroll(event, d.node);
  }

  // Auto-scroll a draggable only when the drag has somewhere to go: it
  // repositions the element (freePosition) or there are drop targets it could
  // reach. A plain ghost-only drag with no droppables has nowhere to land, so
  // scrolling the page would just be surprising. (Sortable always qualifies.)
  _dragCanScroll(d) {
    return d.cfg.freePosition || this._droppables.size > 0;
  }

  // `cancelled` (pointercancel): the gesture ends where it is — no drop, no
  // free-position commit — but onDragEnd still fires so consumers can undo
  // their onDragStart state (e.g. a `.dragging` class).
  _endDrag(event, { cancelled = false } = {}) {
    const d = this._activeDrag;
    if (!d) return;

    document.body.classList.remove('dnd-dragging');
    this._removeDocListeners();
    window.removeEventListener('scroll', this._onViewportChange, true);
    window.removeEventListener('resize', this._onViewportChange);
    this._droppableRects = null;
    this._stopAutoScroll();
    this._removeGhost();

    if (cancelled && this._activeDrop) {
      this._activeDrop.cfg.onDragLeave?.(this._activeDrop.node, event, d.data);
      this._activeDrop = null;
    }

    if (d.active) {
      if (d.cfg.freePosition && cancelled) {
        d.node.style.transform = '';
      } else if (d.cfg.freePosition) {
        let dx = d.currentPos.x - d.startPos.x;
        let dy = d.currentPos.y - d.startPos.y;
        if (d.cfg.axis === 'x') dy = 0;
        if (d.cfg.axis === 'y') dx = 0;
        // Clear any live-move transform; the offset is committed to left/top.
        d.node.style.transform = '';
        if (dx !== 0 || dy !== 0) {
          // Free positioning works in viewport coordinates, so the element must
          // be `fixed`. For `relative`/`absolute` the left/top we compute below
          // are viewport pixels, which a non-fixed element would interpret as an
          // offset from its flow/containing-block position (the box jumps away).
          const cs = window.getComputedStyle(d.node);
          if (cs.position !== 'fixed') d.node.style.position = 'fixed';
          d.node.style.left = (d.startRect.left + dx) + 'px';
          d.node.style.top = (d.startRect.top + dy) + 'px';
          d.node.style.width = d.startRect.width + 'px';
          d.node.style.height = d.startRect.height + 'px';
        }
      }

      d.cfg.onDragEnd?.(d.node, event, d.data);

      if (this._activeDrop) {
        this._activeDrop.cfg.onDrop?.(this._activeDrop.node, event, d.data);
        this._activeDrop = null;
      }
    }

    this._activeDrag = null;
  }

  _snapshotDroppables() {
    this._droppableRects = [];
    for (const [node, cfg] of this._droppables) {
      if (!node.isConnected) continue;
      this._droppableRects.push({ node, cfg, rect: node.getBoundingClientRect() });
    }
  }

  _updateDroppableHover(event) {
    const x = event.clientX;
    const y = event.clientY;
    let hit = null;

    for (const { node, cfg, rect } of this._droppableRects || []) {
      if (!node.isConnected) continue;
      if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) {
        if (!cfg.accept || cfg.accept(this._activeDrag?.data)) {
          hit = { node, cfg };
          break;
        }
      }
    }

    if (this._activeDrop && this._activeDrop !== hit) {
      this._activeDrop.cfg.onDragLeave?.(this._activeDrop.node, event, this._activeDrag?.data);
    }

    if (hit && this._activeDrop !== hit) {
      hit.cfg.onDragEnter?.(hit.node, event, this._activeDrag?.data);
    }

    this._activeDrop = hit;
    hit?.cfg.onDragOver?.(hit.node, event, this._activeDrag?.data);
  }

  // ─── Internal: Ghost ─────────────────────────────────────────

  _createGhost(node, cfg) {
    this._removeGhost();
    const ghost = node.cloneNode(true);
    ghost.className = `dnd-ghost${cfg.ghostClass ? ' ' + cfg.ghostClass : ''}`;
    // Drop any resize-handle container copied from the source so the ghost has
    // no grips on it.
    ghost.querySelectorAll('.dnd-resize-handles').forEach((el) => el.remove());
    const rect = node.getBoundingClientRect();
    // Force fixed positioning INLINE. The source may carry an inline
    // position:relative/absolute that would win over the .dnd-ghost class rule
    // and drop the clone far down the page (top/left become flow offsets).
    ghost.style.position = 'fixed';
    ghost.style.margin = '0';
    ghost.style.transform = 'none';
    ghost.style.width = rect.width + 'px';
    ghost.style.height = rect.height + 'px';
    ghost.style.top = rect.top + 'px';
    ghost.style.left = rect.left + 'px';
    document.body.appendChild(ghost);
    this._ghost = ghost;
  }

  _removeGhost() {
    if (this._ghost && this._ghost.parentNode) {
      this._ghost.parentNode.removeChild(this._ghost);
    }
    this._ghost = null;
  }

  // ─── Internal: Auto-scroll ───────────────────────────────────
  // When the pointer nears an edge of the scroll container (or the viewport),
  // scroll it continuously so the user can drag past the visible region — the
  // missing piece for long pages and long lists. Velocity scales with how deep
  // the pointer is into the edge zone; a rAF loop keeps scrolling even when the
  // pointer is held still (no pointermove fires). Opt out with autoScroll:false.

  static _EDGE = 48;        // px from the edge where auto-scroll kicks in
  static _MAX_SPEED = 20;   // px per frame at the very edge

  // Every scrollable ancestor (including the node itself), nearest first,
  // with the viewport last. PATCHED: the registry version stopped at the
  // NEAREST one, so dragging out of a scrollable sidebar (the board's "Sin
  // asignar" list on a phone, where the squares sit below the fold) could
  // only ever scroll the sidebar itself — the page never moved and the drop
  // targets stayed out of reach. Now the first ancestor that can still
  // scroll toward the pointer's edge wins, so an exhausted sidebar hands
  // over to the page.
  _getScrollTargets(node) {
    const targets = [];
    let el = node;
    while (el && el !== document.body && el !== document.documentElement) {
      const s = window.getComputedStyle(el);
      const canY = (s.overflowY === 'auto' || s.overflowY === 'scroll') && el.scrollHeight > el.clientHeight;
      const canX = (s.overflowX === 'auto' || s.overflowX === 'scroll') && el.scrollWidth > el.clientWidth;
      if (canY || canX) targets.push(el);
      el = el.parentElement;
    }
    targets.push(document.scrollingElement || document.documentElement);
    return targets;
  }

  _isViewportTarget(target) {
    return target === document.scrollingElement || target === document.documentElement;
  }

  // Can `target` still move in the direction of velocity `v` along `axis`?
  _canScroll(target, axis, v) {
    if (!v) return false;
    const viewport = this._isViewportTarget(target);
    const root = document.documentElement;
    const pos = axis === 'y' ? (viewport ? window.scrollY : target.scrollTop) : (viewport ? window.scrollX : target.scrollLeft);
    const max = axis === 'y'
      ? (viewport ? root.scrollHeight - window.innerHeight : target.scrollHeight - target.clientHeight)
      : (viewport ? root.scrollWidth - window.innerWidth : target.scrollWidth - target.clientWidth);
    return v < 0 ? pos > 0 : pos < max - 1;
  }

  // Picks the target to scroll for the pointer at (x, y): nearest first, and
  // only one that is both in its edge zone and able to move that way.
  _pickScrollTarget(sc, x, y) {
    sc.target = null;
    sc.vx = 0;
    sc.vy = 0;
    for (const target of sc.targets) {
      if (!target.isConnected) continue;
      const { vx, vy } = this._edgeVelocity(target, x, y);
      const okX = this._canScroll(target, 'x', vx);
      const okY = this._canScroll(target, 'y', vy);
      if (okX || okY) {
        sc.target = target;
        sc.vx = okX ? vx : 0;
        sc.vy = okY ? vy : 0;
        return;
      }
    }
  }

  _edgeVelocity(target, x, y) {
    const EDGE = DragDropService._EDGE;
    const MAX = DragDropService._MAX_SPEED;
    const clamp01 = (v) => Math.max(0, Math.min(1, v));
    const rect = this._isViewportTarget(target)
      ? { left: 0, top: 0, right: window.innerWidth, bottom: window.innerHeight }
      : target.getBoundingClientRect();

    let vx = 0, vy = 0;
    const top = y - rect.top, bottom = rect.bottom - y;
    if (top < EDGE) vy = -MAX * clamp01((EDGE - top) / EDGE);
    else if (bottom < EDGE) vy = MAX * clamp01((EDGE - bottom) / EDGE);

    const left = x - rect.left, right = rect.right - x;
    if (left < EDGE) vx = -MAX * clamp01((EDGE - left) / EDGE);
    else if (right < EDGE) vx = MAX * clamp01((EDGE - right) / EDGE);

    return { vx: Math.round(vx), vy: Math.round(vy) };
  }

  _updateAutoScroll(event, node) {
    if (!this._scroll) {
      this._scroll = { targets: this._getScrollTargets(node), target: null, vx: 0, vy: 0, x: 0, y: 0, rafId: null };
    }
    const sc = this._scroll;
    sc.x = event.clientX;
    sc.y = event.clientY;
    this._pickScrollTarget(sc, sc.x, sc.y);
    if ((sc.vx || sc.vy) && sc.rafId == null) {
      sc.rafId = requestAnimationFrame(this._autoScrollTick);
    }
  }

  _autoScrollTick() {
    const sc = this._scroll;
    if (!sc) return;
    // Re-pick every frame from the last pointer position: a finger held still
    // at the edge fires no pointermove, and once the nearest container hits
    // its end the next one (ultimately the page) has to take over.
    this._pickScrollTarget(sc, sc.x, sc.y);
    if (!sc.target || (!sc.vx && !sc.vy)) { sc.rafId = null; return; }   // idle until the next move re-arms it
    if (this._isViewportTarget(sc.target)) {
      window.scrollBy(sc.vx, sc.vy);
    } else {
      sc.target.scrollLeft += sc.vx;
      sc.target.scrollTop += sc.vy;
    }
    sc.rafId = requestAnimationFrame(this._autoScrollTick);
  }

  _stopAutoScroll() {
    if (this._scroll?.rafId != null) cancelAnimationFrame(this._scroll.rafId);
    this._scroll = null;
  }

  // ─── Sortable ────────────────────────────────────────────────

  makeSortable(container, config = {}) {
    const cfg = {
      items: config.items || ':scope > *',
      axis: config.axis || 'y',
      ghostClass: config.ghostClass || '',
      autoScroll: config.autoScroll !== false,
      touchDelay: config.touchDelay ?? DragDropService._TOUCH_DELAY,
      onReorder: config.onReorder || null,
      accept: config.accept || null,
    };

    // One delegated listener on the CONTAINER instead of one per item. The item
    // is resolved at pointerdown time, so items added/removed after makeSortable
    // are handled automatically, and a list of N items costs 1 listener, not N.
    // We skip interactive elements (buttons, inputs, selects, textareas, links,
    // contenteditable, and elements with a data-act attribute) so sortable drag
    // doesn't interfere with the item's own controls.
    cfg._onDown = (event) => {
      const item = this._resolveSortableItem(container, event.target, cfg.items);
      if (item && !this._isInteractiveElement(event.target, item)) {
        this._onSortablePointerDown(event, item, container, cfg);
      }
    };
    container.addEventListener('pointerdown', cfg._onDown);

    this._sortables.set(container, cfg);
    return this;
  }

  // ─── Internal: Sortable ──────────────────────────────────────

  // Walks up from the event target to the direct child of `container` that
  // also matches the items selector. `:scope > *` (the default) matches any
  // direct child; a `:scope > ` prefix is stripped so `.matches()` accepts it.
  _resolveSortableItem(container, target, selector) {
    const sel = selector === ':scope > *' ? null : selector.replace(/^:scope\s*>\s*/, '');
    let node = target;
    while (node && node.parentNode !== container) {
      node = node.parentNode;
    }
    if (!node || node.parentNode !== container) return null;
    if (sel && !node.matches(sel)) return null;
    return node;
  }

  // Checks whether the pointerdown target (or any ancestor between it and the
  // sortable item) is an interactive element that should not start a drag.
  // We walk from `target` up to (but not including) `item` to handle nested
  // controls inside a sortable child (e.g. a button inside a card).
  _isInteractiveElement(target, item) {
    const sel = 'button, input, select, textarea, a, [contenteditable], [data-act], slice-select, slice-button, slice-checkbox, slice-input, slice-textarea';
    let node = target;
    while (node && node !== item) {
      if (node.matches && node.matches(sel)) return true;
      node = node.parentNode;
    }
    return false;
  }

  _onSortablePointerDown(event, item, container, cfg) {
    if (event.button !== 0) return;
    if (this._activeSortable || this._touch) return;
    event.stopPropagation();

    const begin = () => {
      if (!this._sortables.has(container) || !item.isConnected) { this._removeDocListeners(); return; }
      this._beginSortable(event, item, container, cfg);
    };
    if (event.pointerType === 'touch') {
      // No preventDefault here: the page must stay scrollable until the hold
      // arms the sort (see _armForTouch).
      this._armForTouch(event, cfg.touchDelay, begin);
    } else {
      event.preventDefault();
      begin();
    }

    this._addDocListeners();
  }

  // The DOM side of starting a sort: placeholder in, ghost out, item hidden.
  // Runs at pointerdown for mouse/pen and after the hold for touch.
  _beginSortable(event, item, container, cfg) {
    const fromIndex = [...container.children].indexOf(item);
    const rect = item.getBoundingClientRect();

    const placeholder = document.createElement('div');
    placeholder.className = 'dnd-sortable-ph' + (cfg.ghostClass ? ' ' + cfg.ghostClass : '');
    placeholder.style.cssText = `height:${rect.height}px;margin:0;background:rgba(59,130,246,.08);border:2px dashed #3b82f6;border-radius:6px;box-sizing:border-box`;
    container.insertBefore(placeholder, item);

    const ghost = item.cloneNode(true);
    ghost.className = 'dnd-ghost' + (cfg.ghostClass ? ' ' + cfg.ghostClass : '');
    // Drop any resize-handle container copied from the source so the ghost
    // has no grips on it — same cleanup _createGhost does for draggables.
    ghost.querySelectorAll('.dnd-resize-handles').forEach((el) => el.remove());
    // Force fixed positioning INLINE. The source may carry inline
    // position:relative that would drop the clone far down the page.
    ghost.style.position = 'fixed';
    ghost.style.margin = '0';
    ghost.style.willChange = 'transform';
    ghost.style.width = rect.width + 'px';
    ghost.style.height = rect.height + 'px';
    ghost.style.top = rect.top + 'px';
    ghost.style.left = rect.left + 'px';
    document.body.appendChild(ghost);

    // Hide the original with inline !important so it beats a component's own
    // CSS (e.g. slice-card sets `display:flex !important`); plain inline
    // display:none would lose to that and the item would look cloned.
    item.style.setProperty('display', 'none', 'important');

    this._activeSortable = {
      container, cfg, item, placeholder, ghost,
      fromIndex,
      startPos: { x: event.clientX, y: event.clientY },
      lastInsertIndex: fromIndex,
      items: [],
      mids: [],
    };

    // Measure the sibling midpoints once up front. We only re-measure when the
    // placeholder actually crosses into a new slot (see _onSortableMove), so a
    // typical move costs O(1) cache reads instead of a getBoundingClientRect per
    // item per pointermove — what makes long lists (hundreds+) feel sluggish.
    this._measureSortable(this._activeSortable);
    document.body.classList.add('dnd-dragging');
  }

  // Snapshots the current sibling items (excluding the dragged item and the
  // placeholder) and their midpoints along the sort axis. The item SET is stable
  // during a drag; only positions shift as the placeholder moves, so this is
  // recomputed exactly when the placeholder is reinserted.
  _measureSortable(s) {
    s.items = [...s.container.children].filter(c =>
      c !== s.item && c !== s.placeholder && c.style.display !== 'none'
    );
    s.mids = s.items.map(el => {
      const r = el.getBoundingClientRect();
      return s.cfg.axis === 'x' ? r.left + r.width / 2 : r.top + r.height / 2;
    });
  }

  _onSortableMove(event) {
    const s = this._activeSortable;
    const dx = event.clientX - s.startPos.x;
    const dy = event.clientY - s.startPos.y;

    s.ghost.style.transform = `translate(${dx}px, ${dy}px)`;

    const pos = s.cfg.axis === 'x' ? event.clientX : event.clientY;

    let insertIndex = s.mids.length;
    for (let i = 0; i < s.mids.length; i++) {
      if (pos < s.mids[i]) { insertIndex = i; break; }
    }

    if (insertIndex !== s.lastInsertIndex) {
      const beforeNode = s.items[insertIndex] || null;
      s.container.insertBefore(s.placeholder, beforeNode);
      s.lastInsertIndex = insertIndex;
      this._measureSortable(s);   // positions shifted — refresh the cached midpoints
    }

    if (s.cfg.autoScroll) this._updateAutoScroll(event, s.container);
  }

  // `cancelled` (pointercancel): the item goes back to where it started and
  // onReorder does not fire.
  _endSortable(event, { cancelled = false } = {}) {
    const s = this._activeSortable;
    if (!s) return;

    this._removeDocListeners();
    this._stopAutoScroll();
    document.body.classList.remove('dnd-dragging');

    if (s.ghost && s.ghost.parentNode) s.ghost.parentNode.removeChild(s.ghost);

    // Move the real item into the placeholder's slot, then drop the placeholder.
    // During the drag only the placeholder moves; the item stays hidden at its
    // original index. Without this reinsertion the list never actually reorders
    // and onReorder never fires (toIndex would always equal fromIndex).
    if (s.placeholder && s.placeholder.parentNode) {
      if (cancelled) {
        s.placeholder.parentNode.removeChild(s.placeholder);
        const siblings = [...s.container.children].filter((c) => c !== s.item);
        s.container.insertBefore(s.item, siblings[s.fromIndex] || null);
      } else {
        s.container.insertBefore(s.item, s.placeholder);
        s.placeholder.parentNode.removeChild(s.placeholder);
      }
    }

    s.item.style.removeProperty('display');

    const allChildren = [...s.container.children];
    const currentIdx = allChildren.indexOf(s.item);

    if (!cancelled && currentIdx !== s.fromIndex) {
      s.cfg.onReorder?.({
        fromIndex: s.fromIndex,
        toIndex: currentIdx,
        item: s.item,
        container: s.container,
      });
    }

    this._activeSortable = null;
  }

  // ─── Internal: Resize ────────────────────────────────────────

  _onHandlePointerDown(event, node, cfg, edges) {
    if (event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    this._startResize(event, node, cfg, edges);
  }

  _startResize(event, node, cfg, edges) {
    if (this._activeResize) return;
    event.preventDefault();

    const rect = node.getBoundingClientRect();

    this._activeResize = {
      node, cfg, edges,
      startPos: { x: event.clientX, y: event.clientY },
      startRect: { top: rect.top, left: rect.left, width: rect.width, height: rect.height },
    };

    cfg.onResizeStart?.(node, event, { ...rect });
    this._addDocListeners();
  }

  _onResizeMove(event) {
    const r = this._activeResize;
    const delta = {
      x: event.clientX - r.startPos.x,
      y: event.clientY - r.startPos.y,
    };

    const newRect = computeResizeRect(
      r.startRect, delta, r.edges,
      r.cfg.minWidth, r.cfg.minHeight,
      r.cfg.maxWidth, r.cfg.maxHeight
    );

    r.node.style.width = newRect.width + 'px';
    r.node.style.height = newRect.height + 'px';
    if (r.edges.includes('w')) r.node.style.left = newRect.left + 'px';
    if (r.edges.includes('n')) r.node.style.top = newRect.top + 'px';

    r.cfg.onResize?.(r.node, event, newRect);
  }

  _endResize(event) {
    const r = this._activeResize;
    if (!r) return;

    this._removeDocListeners();
    document.body.classList.remove('dnd-dragging');

    const rect = r.node.getBoundingClientRect();
    r.cfg.onResizeEnd?.(r.node, event, {
      top: rect.top, left: rect.left,
      width: rect.width, height: rect.height,
    });

    this._activeResize = null;
  }
}

if (typeof window !== 'undefined') {
  window.DragDropService = DragDropService;
}
