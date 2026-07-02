// Encapsulates the vendored Chart.js UMD bundle (src/libs/chartjs) so
// consumers never import the library directly — same shape as
// SanitizeService wrapping DOMPurify. The UMD build's only job here is to
// register `window.Chart` as a side effect; we grab it once at module load
// and hand out a small, Chart.js-shaped-but-swappable API instead.
import '../../../libs/chartjs/chart.umd.js';

const ChartLib = typeof window !== 'undefined' ? window.Chart : null;

export default class ChartService {
  isAvailable() {
    return !!ChartLib;
  }

  // Reads a CSS custom property's resolved value off <html> — Chart.js draws
  // on <canvas>, so it needs a literal color string, not a live var(--x)
  // reference the browser could otherwise swap on theme change.
  themeColor(varName) {
    return getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
  }

  create(canvas, config) {
    if (!ChartLib) {
      slice.logger?.logWarn?.('ChartService', 'Chart.js failed to load — chart not created.');
      return null;
    }
    return new ChartLib(canvas, config);
  }

  destroy(chart) {
    chart?.destroy();
  }
}
