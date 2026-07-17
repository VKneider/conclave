import Chart from 'chart.js/auto';

export default class ChartService {
  isAvailable() {
    return !!Chart;
  }

  // Reads a CSS custom property's resolved value off <html> — Chart.js draws
  // on <canvas>, so it needs a literal color string, not a live var(--x)
  // reference the browser could otherwise swap on theme change.
  themeColor(varName) {
    return getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
  }

  create(canvas, config) {
    return new Chart(canvas, config);
  }

  destroy(chart) {
    chart?.destroy();
  }
}
