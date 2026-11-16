// TourService's normalization and cancellable async work; no DOM required.
export function normalizeStep(step = {}, options = {}) {
   step = step && typeof step === 'object' ? step : {};
   const n = (v, fallback) => Number.isFinite(Number(v)) && Number(v) >= 0 ? Number(v) : fallback;
   return {
      ...step, title: String(step.title || ''),
      placement: ['top', 'bottom', 'left', 'right', 'auto'].includes(step.placement) ? step.placement : 'auto',
      fallback: step.fallback === 'center' ? 'center' : 'skip',
      padding: n(step.padding ?? options.padding, 8),
      timeout: n(step.timeout, 5000),
      interactive: step.interactive === true,
      spotlight: step.spotlight ?? options.spotlight ?? true,
      texts: { ...options.texts, ...step.texts },
   };
}

// Always release the abort listener and timer, including when app code never settles.
export function cancellable(work, signal, timeout) {
   return new Promise((resolve, reject) => {
      let timer;
      const finish = (fn, value) => {
         clearTimeout(timer);
         signal.removeEventListener('abort', abort);
         fn(value);
      };
      const abort = () => finish(reject, new DOMException('Tour cancelled', 'AbortError'));
      if (signal.aborted) return abort();
      signal.addEventListener('abort', abort, { once: true });
      if (timeout != null) timer = setTimeout(() => finish(reject, new Error('Tour step timed out')), timeout);
      Promise.resolve().then(() => {
         if (signal.aborted) throw new DOMException('Tour cancelled', 'AbortError');
         return work();
      }).then(value => finish(resolve, value), error => finish(reject, error));
   });
}
