// Sync Chart.js defaults with CSS theme variables and react to theme toggles
import { Chart as ChartJS } from 'chart.js';

function readVar(name, fallback) {
  const styles = getComputedStyle(document.documentElement);
  const val = styles.getPropertyValue(name).trim();
  return val || fallback;
}

export function applyChartTheme() {
  const text = readVar('--foreground', '#e5e7eb');
  const grid = readVar('--border', '#1f2937');
  const primary = readVar('--primary', '#22d3ee');

  ChartJS.defaults.color = text;
  ChartJS.defaults.borderColor = grid;
  ChartJS.defaults.scale.grid.color = grid + '66';
  ChartJS.defaults.plugins.legend.labels.color = text;
  ChartJS.defaults.plugins.title.color = text;

  // Provide a palette for datasets if not specified
  ChartJS.defaults.elements.arc.backgroundColor = [
    '#ef4444', '#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#06b6d4', '#84cc16', '#f97316'
  ];
  ChartJS.defaults.elements.bar.backgroundColor = primary + 'cc';
}

// Initialize now and on theme changes
export function initChartThemeObserver() {
  applyChartTheme();
  const observer = new MutationObserver(() => applyChartTheme());
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
}