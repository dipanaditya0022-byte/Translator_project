/* ============================================
   CHARTS MODULE - Usage Analytics
   Canvas-based charts without dependencies
   ============================================ */

class DashboardCharts {
  constructor() {
    this.charts = {};
    this.colors = {
      cyan:   { line: '#00f5ff', fill: 'rgba(0,245,255,0.08)' },
      blue:   { line: '#0080ff', fill: 'rgba(0,128,255,0.08)' },
      green:  { line: '#00ff88', fill: 'rgba(0,255,136,0.08)' },
      purple: { line: '#8b00ff', fill: 'rgba(139,0,255,0.08)' },
      gold:   { line: '#ffd700', fill: 'rgba(255,215,0,0.08)' },
    };
  }

  /* ── SPARKLINE ── */
  drawSparkline(canvasId, data, colorKey = 'cyan') {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const { line, fill } = this.colors[colorKey] || this.colors.cyan;

    const W = canvas.width  = canvas.offsetWidth;
    const H = canvas.height = canvas.offsetHeight;
    ctx.clearRect(0, 0, W, H);

    if (!data || data.length < 2) return;

    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;
    const pad = { top: 6, bottom: 6, left: 4, right: 4 };
    const iW = W - pad.left - pad.right;
    const iH = H - pad.top - pad.bottom;

    const getX = (i) => pad.left + (i / (data.length - 1)) * iW;
    const getY = (v) => pad.top + (1 - (v - min) / range) * iH;

    // Fill area
    ctx.beginPath();
    ctx.moveTo(getX(0), getY(data[0]));
    for (let i = 1; i < data.length; i++) {
      const x0 = getX(i - 1), y0 = getY(data[i - 1]);
      const x1 = getX(i),     y1 = getY(data[i]);
      const cpX = (x0 + x1) / 2;
      ctx.bezierCurveTo(cpX, y0, cpX, y1, x1, y1);
    }
    ctx.lineTo(getX(data.length - 1), H);
    ctx.lineTo(getX(0), H);
    ctx.closePath();

    const gradient = ctx.createLinearGradient(0, 0, 0, H);
    gradient.addColorStop(0, fill.replace('0.08', '0.25'));
    gradient.addColorStop(1, fill.replace('0.08', '0'));
    ctx.fillStyle = gradient;
    ctx.fill();

    // Line
    ctx.beginPath();
    ctx.moveTo(getX(0), getY(data[0]));
    for (let i = 1; i < data.length; i++) {
      const x0 = getX(i - 1), y0 = getY(data[i - 1]);
      const x1 = getX(i),     y1 = getY(data[i]);
      const cpX = (x0 + x1) / 2;
      ctx.bezierCurveTo(cpX, y0, cpX, y1, x1, y1);
    }
    ctx.strokeStyle = line;
    ctx.lineWidth = 1.5;
    ctx.shadowBlur = 6;
    ctx.shadowColor = line;
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Last point dot
    const lx = getX(data.length - 1);
    const ly = getY(data[data.length - 1]);
    ctx.beginPath();
    ctx.arc(lx, ly, 3, 0, Math.PI * 2);
    ctx.fillStyle = line;
    ctx.shadowBlur = 10;
    ctx.shadowColor = line;
    ctx.fill();
    ctx.shadowBlur = 0;

    this.charts[canvasId] = { data, colorKey };
  }

  /* ── DONUT CHART ── */
  drawDonut(canvasId, segments, title = '') {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width  = canvas.offsetWidth  || 180;
    const H = canvas.height = canvas.offsetHeight || 180;
    ctx.clearRect(0, 0, W, H);

    const cx = W / 2, cy = H / 2;
    const outerR = Math.min(W, H) / 2 - 10;
    const innerR = outerR * 0.62;

    const total = segments.reduce((s, seg) => s + seg.value, 0);
    let startAngle = -Math.PI / 2;
    const gap = 0.04;

    segments.forEach(seg => {
      const slice = (seg.value / total) * (Math.PI * 2 - gap * segments.length);

      // Shadow/glow
      ctx.shadowBlur = 12;
      ctx.shadowColor = seg.color;

      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, outerR, startAngle + gap/2, startAngle + slice + gap/2);
      ctx.closePath();
      ctx.fillStyle = seg.color;
      ctx.globalAlpha = 0.85;
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.shadowBlur = 0;

      startAngle += slice + gap;
    });

    // Donut hole
    ctx.beginPath();
    ctx.arc(cx, cy, innerR, 0, Math.PI * 2);
    ctx.fillStyle = '#040c14';
    ctx.fill();

    // Center text
    if (title) {
      ctx.fillStyle = '#00f5ff';
      ctx.font = `bold 13px 'Orbitron', monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowBlur = 8;
      ctx.shadowColor = '#00f5ff';
      ctx.fillText(title, cx, cy);
      ctx.shadowBlur = 0;
    }

    // Outer ring
    ctx.beginPath();
    ctx.arc(cx, cy, outerR + 2, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(0,245,255,0.1)';
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  /* ── BAR CHART ── */
  drawBarChart(canvasId, labels, values, colorKey = 'cyan') {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width  = canvas.offsetWidth;
    const H = canvas.height = canvas.offsetHeight;
    ctx.clearRect(0, 0, W, H);
    const { line } = this.colors[colorKey] || this.colors.cyan;

    const pad = { top: 10, bottom: 30, left: 10, right: 10 };
    const iW = W - pad.left - pad.right;
    const iH = H - pad.top - pad.bottom;
    const barW = (iW / values.length) * 0.6;
    const gap   = (iW / values.length) * 0.4;
    const max   = Math.max(...values) || 1;

    values.forEach((v, i) => {
      const barH = (v / max) * iH;
      const x = pad.left + i * (barW + gap) + gap / 2;
      const y = pad.top + iH - barH;

      // Bar gradient
      const grad = ctx.createLinearGradient(x, y, x, y + barH);
      grad.addColorStop(0, line);
      grad.addColorStop(1, line.replace('ff', '44').replace('00f5ff', '002a35'));

      ctx.fillStyle = grad;
      ctx.shadowBlur = 6;
      ctx.shadowColor = line;
      ctx.fillRect(x, y, barW, barH);
      ctx.shadowBlur = 0;

      // Label
      if (labels[i]) {
        ctx.fillStyle = 'rgba(122,184,212,0.7)';
        ctx.font = '9px Share Tech Mono, monospace';
        ctx.textAlign = 'center';
        ctx.fillText(labels[i], x + barW / 2, H - 8);
      }
    });

    // Baseline
    ctx.beginPath();
    ctx.moveTo(pad.left, pad.top + iH);
    ctx.lineTo(W - pad.right, pad.top + iH);
    ctx.strokeStyle = 'rgba(0,245,255,0.15)';
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  /* ── UPDATE SPARKLINE WITH ANIMATION ── */
  updateSparkline(canvasId, newValue, maxPoints = 20) {
    const chart = this.charts[canvasId];
    if (!chart) return;
    const newData = [...chart.data, newValue].slice(-maxPoints);
    this.drawSparkline(canvasId, newData, chart.colorKey);
  }
}

// Initialize
window.dashboardCharts = new DashboardCharts();

if (typeof module !== 'undefined') {
  module.exports = DashboardCharts;
}
