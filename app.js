/**
 * ============================================================
 * EXPERIMENT 2: HIERARCHICAL CLUSTERING & CUSTOMER PERSONAS
 * Enterprise Frontend Application Logic
 * Team 15 ML Seminar Platform
 * ============================================================
 */

document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initNavigation();
  initKaTeX();
  initMCQs();
  checkBackendHealth();
  triggerClustering();
});

// ── 1. Theme Management (Dark/Light) ──────────────────────────────────
function initTheme() {
  const toggleBtn = document.getElementById('theme-toggle-btn');
  const savedTheme = localStorage.getItem('theme') || 'dark';
  document.documentElement.setAttribute('data-theme', savedTheme);
  updateThemeButton(savedTheme);

  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      const current = document.documentElement.getAttribute('data-theme');
      const nextTheme = (current === 'dark') ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', nextTheme);
      localStorage.setItem('theme', nextTheme);
      updateThemeButton(nextTheme);

      // Re-render cluster plot if backend is active so colors match
      triggerClustering();
    });
  }
}

function updateThemeButton(theme) {
  const toggleBtn = document.getElementById('theme-toggle-btn');
  if (toggleBtn) {
    toggleBtn.textContent = (theme === 'dark') ? '🌙' : '☀️';
    toggleBtn.setAttribute('title', `Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`);
  }
}

// ── 2. Navigation & Tabs ──────────────────────────────────────────────
function initNavigation() {
  const tabs = document.querySelectorAll('.nav-tab-btn');
  const panels = document.querySelectorAll('.tab-content-panel');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const target = tab.getAttribute('data-tab');

      tabs.forEach(t => {
        t.classList.remove('active');
        t.setAttribute('aria-selected', 'false');
      });
      panels.forEach(p => p.classList.remove('active'));

      tab.classList.add('active');
      tab.setAttribute('aria-selected', 'true');

      const targetPanel = document.getElementById(`panel-${target}`);
      if (targetPanel) {
        targetPanel.classList.add('active');
        initKaTeX();
      }
    });
  });
}

// ── 3. KaTeX Mathematics Auto-Renderer ─────────────────────────────────
function initKaTeX() {
  if (window.renderMathInElement) {
    try {
      renderMathInElement(document.body, {
        delimiters: [
          { left: '$$', right: '$$', display: true },
          { left: '\\[', right: '\\]', display: true },
          { left: '\\(', right: '\\)', display: false }
        ],
        throwOnError: false
      });
    } catch (err) {
      console.warn("KaTeX render notice:", err);
    }
  }
}

// ── 4. Backend Health Check ───────────────────────────────────────────
let isBackendOnline = false;

async function checkBackendHealth() {
  const statusIndicator = document.getElementById('api-status-indicator');
  const statusLabel = document.getElementById('api-status-label');

  try {
    const res = await fetch('/api/health');
    if (res.ok) {
      const data = await res.json();
      isBackendOnline = true;
      if (statusIndicator) statusIndicator.className = 'status-indicator online';
      if (statusLabel) statusLabel.textContent = `Backend Online (Port ${data.port || 8002})`;
    } else {
      throw new Error();
    }
  } catch {
    isBackendOnline = false;
    if (statusIndicator) statusIndicator.className = 'status-indicator static';
    if (statusLabel) statusLabel.textContent = 'Static / Vercel Mode';
  }
}

// ── 5. Mathematical Formulation Cards ─────────────────────────────────
const linkageMathData = {
  ward: {
    formula: "$$\\Delta \\text{ESS}_{AB} = \\frac{|A||B|}{|A|+|B|} \\|\\boldsymbol{\\mu}_A - \\boldsymbol{\\mu}_B\\|^2$$",
    desc: "<strong>Ward's Minimum Variance:</strong> Merges the pair \\((A, B)\\) that minimizes the increase in Total Within-Cluster Sum of Squares (Error Sum of Squares \\(\\text{ESS}\\)). Produces compact, spherical, balanced segments."
  },
  complete: {
    formula: "$$D(A, B) = \\max_{\\mathbf{u} \\in A, \\mathbf{v} \\in B} \\|\\mathbf{u} - \\mathbf{v}\\|_2$$",
    desc: "<strong>Complete Linkage (Maximum Distance):</strong> Measures the maximum Euclidean distance between any point in cluster \\(A\\) and any point in cluster \\(B\\). Avoids chaining and enforces tight clusters."
  },
  average: {
    formula: "$$D(A, B) = \\frac{1}{|A||B|} \\sum_{\\mathbf{u} \\in A} \\sum_{\\mathbf{v} \\in B} \\|\\mathbf{u} - \\mathbf{v}\\|_2$$",
    desc: "<strong>Average Linkage (UPGMA):</strong> Calculates the average distance between all pairs of points across clusters. Serves as a robust compromise between single and complete linkage."
  },
  single: {
    formula: "$$D(A, B) = \\min_{\\mathbf{u} \\in A, \\mathbf{v} \\in B} \\|\\mathbf{u} - \\mathbf{v}\\|_2$$",
    desc: "<strong>Single Linkage (Minimum Distance):</strong> Defines distance as the minimum pairwise distance between any single point in \\(A\\) and \\(B\\). Prone to the <em>Chaining Effect</em> (long, straggly clusters)."
  }
};

function handleLinkageChange(method) {
  const data = linkageMathData[method] || linkageMathData.ward;
  const formulaBox = document.getElementById('math-formula-box');
  const descBox = document.getElementById('math-desc-box');
  const hintEl = document.getElementById('linkage-hint');

  if (formulaBox) formulaBox.innerHTML = data.formula;
  if (descBox) descBox.innerHTML = data.desc;

  if (hintEl) {
    if (method === 'ward') hintEl.textContent = "Ward linkage minimizes intra-cluster variance, generating compact, balanced customer clusters.";
    else if (method === 'complete') hintEl.textContent = "Complete linkage finds maximum distances, forcing clusters to be tightly bounded.";
    else if (method === 'average') hintEl.textContent = "Average linkage averages all pairwise point distances, producing moderate diameter clusters.";
    else if (method === 'single') hintEl.textContent = "Single linkage uses nearest neighbors; sensitive to noise and prone to chaining.";
  }

  initKaTeX();
  triggerClustering();
}

function handleSliderChange(param, value) {
  const badge = document.getElementById(`display-${param}`);
  if (badge) badge.textContent = value;
}

function resetDefaults() {
  const inputK = document.getElementById('input-k');
  const inputLinkage = document.getElementById('input-linkage');
  const inputSeed = document.getElementById('input-seed');

  if (inputK) inputK.value = 5;
  if (inputLinkage) inputLinkage.value = 'ward';
  if (inputSeed) inputSeed.value = 42;

  handleSliderChange('k', 5);
  handleSliderChange('seed', 42);
  handleLinkageChange('ward');
}

// ── 6. Clustering Orchestration ───────────────────────────────────────
async function triggerClustering() {
  const btn = document.getElementById('btn-recluster');
  if (btn) btn.classList.add('loading');

  const k = parseInt(document.getElementById('input-k').value, 10) || 5;
  const linkageMethod = document.getElementById('input-linkage').value || 'ward';
  const seed = parseInt(document.getElementById('input-seed').value, 10) || 42;
  const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';

  const payload = {
    n_clusters: k,
    linkage_method: linkageMethod,
    random_state: seed,
    theme: currentTheme
  };

  try {
    const res = await fetch('/api/run-clustering', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      const data = await res.json();
      if (data.status === 'success') {
        renderServerResults(data, k);
        return;
      }
    }
    throw new Error("Server error or static mode");
  } catch {
    // Graceful client-side fallback for static Vercel deployment
    renderClientSideClustering(k, linkageMethod, seed, currentTheme);
  } finally {
    if (btn) btn.classList.remove('loading');
  }
}

function renderServerResults(data, k) {
  const plotImg = document.getElementById('live-plot-image');
  const canvas = document.getElementById('client-fallback-canvas');
  const cutHeightEl = document.getElementById('val-cut-height');
  const tagEl = document.getElementById('live-exec-tag');

  if (canvas) canvas.style.display = 'none';
  if (plotImg) {
    plotImg.style.display = 'block';
    plotImg.src = data.chart;
  }

  if (cutHeightEl && data.threshold) {
    cutHeightEl.textContent = data.threshold;
  }

  if (tagEl) {
    tagEl.textContent = `Server (Port 8002) • ${data.linkage_method.toUpperCase()} • k=${k}`;
  }

  renderPersonaCards(data.clusters, k);
}

// ── 7. Persona Cards Renderer ─────────────────────────────────────────
const canonicalPersonas = [
  {
    persona: "Frugal Caretakers",
    badge: "Value-Conscious",
    strategy: "Promote essential staples, loyalty points, and bulk discount bundles.",
    color: "#0284C7",
    inc: 13.9, sp: 38.8, count: 40, pct: "25.0%"
  },
  {
    persona: "Impulsive Trendsetters",
    badge: "High Engagement",
    strategy: "Target with flash sales, trending youth fashion, and gamified promotions.",
    color: "#059669",
    inc: 14.3, sp: 81.3, count: 25, pct: "15.6%"
  },
  {
    persona: "Pragmatic Middle",
    badge: "Core Market",
    strategy: "Offer balanced value propositions, reliable quality, and seasonal catalog deals.",
    color: "#D97706",
    inc: 50.2, sp: 51.1, count: 36, pct: "22.5%"
  },
  {
    persona: "VIP High-Rollers",
    badge: "Top Tier",
    strategy: "Deliver bespoke VIP concierge, exclusive early-access perks, and luxury exclusives.",
    color: "#7C3AED",
    inc: 84.5, sp: 83.6, count: 29, pct: "18.1%"
  },
  {
    persona: "Affluent Savers",
    badge: "High Potential",
    strategy: "Attract with wealth management incentives, luxury utility, and private sales.",
    color: "#DC2626",
    inc: 86.5, sp: 20.6, count: 30, pct: "18.8%"
  },
  {
    persona: "Emerging Spender",
    badge: "Growth Target",
    strategy: "Tailor accessible pricing and engagement campaigns.",
    color: "#B45309",
    inc: 32.0, sp: 65.0, count: 18, pct: "11.3%"
  },
  {
    persona: "Niche Shopper",
    badge: "Specialty Target",
    strategy: "Curate tailored collections and niche product marketing.",
    color: "#0D9488",
    inc: 68.0, sp: 52.0, count: 12, pct: "7.5%"
  },
  {
    persona: "Ultra Conservative",
    badge: "Cautious Target",
    strategy: "Focus on capital preservation and high-utility reliability.",
    color: "#4F46E5",
    inc: 110.0, sp: 12.0, count: 8, pct: "5.0%"
  }
];

function renderPersonaCards(clusters, k) {
  const container = document.getElementById('personas-container');
  const countEl = document.getElementById('persona-k-count');
  if (countEl) countEl.textContent = k;
  if (!container) return;

  const palette = ['#0284C7', '#059669', '#D97706', '#7C3AED', '#DC2626', '#B45309', '#0D9488', '#4F46E5'];

  container.innerHTML = clusters.map((c, i) => {
    const borderColor = palette[i % palette.length];
    return `
      <div class="persona-card" style="border-top-color: ${borderColor};">
        <div class="persona-header">
          <div>
            <div class="persona-name">Cluster ${c.cluster_id}: ${c.persona}</div>
          </div>
          <span class="persona-tag">${c.badge || 'Segment'}</span>
        </div>
        <div class="persona-share">
          ${c.percent}%
          <span class="persona-count">(${c.size} customers)</span>
        </div>
        <div class="persona-stats-row">
          <div>Mean Income: <b>$${c.avg_income}k</b></div>
          <div>Spending Score: <b>${c.avg_spending} / 100</b></div>
        </div>
        <div class="persona-strategy">
          ${c.strategy}
        </div>
      </div>
    `;
  }).join('');
}

// ── 8. Client-Side Fallback Engine (for Static / Vercel Deployments) ────
function renderClientSideClustering(k, linkageMethod, seed, theme) {
  const plotImg = document.getElementById('live-plot-image');
  const canvas = document.getElementById('client-fallback-canvas');
  const cutHeightEl = document.getElementById('val-cut-height');
  const tagEl = document.getElementById('live-exec-tag');

  if (plotImg) plotImg.style.display = 'none';
  if (canvas) canvas.style.display = 'block';
  if (tagEl) tagEl.textContent = `Static Client Engine • ${linkageMethod.toUpperCase()} • k=${k}`;

  // Approximate realistic cut threshold based on k
  const approxCut = (k === 5) ? 6.95 : (k === 2 ? 14.80 : (k === 3 ? 10.45 : (k === 4 ? 8.30 : (k === 6 ? 5.80 : (k === 7 ? 4.90 : 4.10)))));
  if (cutHeightEl) cutHeightEl.textContent = approxCut.toFixed(2);

  // Generate k dynamic persona entries from canonical template
  const activePersonas = canonicalPersonas.slice(0, k).map((p, idx) => ({
    cluster_id: idx + 1,
    persona: p.persona,
    badge: p.badge,
    strategy: p.strategy,
    size: p.count,
    percent: (p.count / 160 * 100).toFixed(1),
    avg_income: p.inc,
    avg_spending: p.sp
  }));

  renderPersonaCards(activePersonas, k);
  drawFallbackCanvas(canvas, k, linkageMethod, seed, theme, approxCut, activePersonas);
}

function drawFallbackCanvas(canvas, k, linkageMethod, seed, theme, approxCut, personas) {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const rect = canvas.getBoundingClientRect();
  const width = rect.width > 200 ? rect.width : 920;
  const height = 350;
  const dpr = window.devicePixelRatio || 1;

  canvas.width = width * dpr;
  canvas.height = height * dpr;
  ctx.scale(dpr, dpr);

  const isDark = (theme === 'dark');
  const bgColor = isDark ? '#0B1120' : '#FFFFFF';
  const cardBg = isDark ? '#0F172A' : '#F8FAFC';
  const textColor = isDark ? '#F8FAFC' : '#0F172A';
  const mutedColor = isDark ? '#94A3B8' : '#64748B';
  const gridColor = isDark ? '#334155' : '#E2E8F0';
  const spineColor = isDark ? '#334155' : '#CBD5E1';
  const cutColor = isDark ? '#F43F5E' : '#DC2626';

  const palette = isDark
    ? ['#38BDF8', '#34D399', '#FB923C', '#A78BFA', '#F43F5E', '#FBBF24', '#2DD4BF', '#E879F9']
    : ['#0284C7', '#059669', '#D97706', '#7C3AED', '#DC2626', '#B45309', '#0D9488', '#4F46E5'];

  // Clear Background
  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, width, height);

  const margin = 10;
  const panelW = (width - margin * 3) / 2;
  const panelH = height - margin * 2;

  // ── LEFT PANEL: Dendrogram Tree ──
  const p1X = margin;
  const p1Y = margin;
  ctx.fillStyle = cardBg;
  ctx.fillRect(p1X, p1Y, panelW, panelH);
  ctx.strokeStyle = spineColor;
  ctx.lineWidth = 1;
  ctx.strokeRect(p1X, p1Y, panelW, panelH);

  ctx.fillStyle = textColor;
  ctx.font = 'bold 12px "Plus Jakarta Sans", sans-serif';
  ctx.fillText(`A. Hierarchical Dendrogram (${linkageMethod.charAt(0).toUpperCase() + linkageMethod.slice(1)} Linkage)`, p1X + 16, p1Y + 22);

  ctx.fillStyle = mutedColor;
  ctx.font = 'bold 9.5px "JetBrains Mono", monospace';
  ctx.fillText('Euclidean Distance', p1X + 16, p1Y + 40);

  const plotLeft = p1X + 42;
  const plotRight = p1X + panelW - 16;
  const plotTop = p1Y + 52;
  const plotBottom = p1Y + panelH - 26;
  const plotH = plotBottom - plotTop;
  const plotW = plotRight - plotLeft;

  // Distance Grid Lines
  ctx.strokeStyle = gridColor;
  ctx.lineWidth = 0.8;
  ctx.setLineDash([3, 3]);
  for (let i = 0; i <= 4; i++) {
    const yVal = plotTop + (plotH / 4) * i;
    ctx.beginPath();
    ctx.moveTo(plotLeft, yVal);
    ctx.lineTo(plotRight, yVal);
    ctx.stroke();

    const distLabel = ((4 - i) * 4.5).toFixed(1);
    ctx.fillStyle = mutedColor;
    ctx.font = '8.5px "JetBrains Mono", monospace';
    ctx.fillText(distLabel, p1X + 12, yVal + 3);
  }
  ctx.setLineDash([]);

  // ── True Agglomerative Dendrogram Geometry Engine ──
  // 1. Synthesize 24 customer representative cluster leaves across k groups
  const nLeaves = 24;
  const leafClusters = [];
  for (let i = 0; i < nLeaves; i++) {
    const assignedCluster = Math.min(k - 1, Math.floor((i / nLeaves) * k));
    // Base height within leaf
    const h = 0.4 + (((i * 13 + seed * 7) % 19) / 19) * 0.7;
    leafClusters.push({
      id: i,
      cluster: assignedCluster,
      x: plotLeft + (i / (nLeaves - 1)) * plotW,
      h: h,
      left: null,
      right: null
    });
  }

  // 2. Perform greedy agglomerative hierarchical merges to construct a real binary tree
  let nodes = [...leafClusters];
  let nextId = nLeaves;
  const mergeHistory = [];

  // Merge nodes within same cluster first, then across clusters
  while (nodes.length > 1) {
    let bestDist = Infinity;
    let bestA = 0;
    let bestB = 1;

    for (let a = 0; a < nodes.length; a++) {
      for (let b = a + 1; b < nodes.length; b++) {
        const sameCluster = (nodes[a].cluster === nodes[b].cluster);
        const spatialDist = Math.abs(nodes[a].x - nodes[b].x);
        // Prioritize merging adjacent leaves within the same cluster
        const penalty = sameCluster ? 1.0 : 18.0;
        const dist = (spatialDist + Math.max(nodes[a].h, nodes[b].h)) * penalty;

        if (dist < bestDist) {
          bestDist = dist;
          bestA = a;
          bestB = b;
        }
      }
    }

    const nA = nodes[bestA];
    const nB = nodes[bestB];
    const mergeCluster = (nA.cluster === nB.cluster) ? nA.cluster : -1;
    // Euclidean distance increases monotonically up the tree
    const parentH = Math.max(nA.h, nB.h) + (mergeCluster === -1 ? 1.8 + (mergeHistory.length * 0.35) : 0.6);

    const parentNode = {
      id: nextId++,
      cluster: mergeCluster,
      x: (nA.x + nB.x) / 2,
      h: parentH,
      left: nA,
      right: nB
    };

    mergeHistory.push(parentNode);
    nodes.splice(bestB, 1);
    nodes.splice(bestA, 1);
    nodes.push(parentNode);
  }

  const rootNode = nodes[0];
  const maxTreeH = Math.max(16, rootNode.h * 1.15);

  // Helper to map distance height to canvas Y
  function hToY(dist) {
    return plotBottom - (dist / maxTreeH) * plotH;
  }

  // 3. Render the binary dendrogram branches recursively
  function drawBranch(node) {
    if (!node || (!node.left && !node.right)) return;

    const childL = node.left;
    const childR = node.right;

    const yMerge = hToY(node.h);
    const yChildL = hToY(childL.h);
    const yChildR = hToY(childR.h);

    // Branch color: cluster palette if strictly below cut and within single cluster, else muted gray
    const isAboveCut = (node.h >= approxCut);
    const branchColor = (isAboveCut || node.cluster === -1)
      ? mutedColor
      : palette[node.cluster % palette.length];

    ctx.strokeStyle = branchColor;
    ctx.lineWidth = 1.6;

    // Left vertical segment from child merge point up to current merge level
    ctx.beginPath();
    ctx.moveTo(childL.x, yChildL);
    ctx.lineTo(childL.x, yMerge);
    // Horizontal crossbar connecting left child to right child
    ctx.lineTo(childR.x, yMerge);
    // Right vertical segment down to right child merge level
    ctx.lineTo(childR.x, yChildR);
    ctx.stroke();

    // Recurse into children
    drawBranch(childL);
    drawBranch(childR);
  }

  // Draw leaves to baseline
  leafClusters.forEach(leaf => {
    const leafY = hToY(leaf.h);
    const leafColor = (leaf.h >= approxCut) ? mutedColor : palette[leaf.cluster % palette.length];
    ctx.strokeStyle = leafColor;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(leaf.x, plotBottom);
    ctx.lineTo(leaf.x, leafY);
    ctx.stroke();
  });

  // Draw tree branches
  drawBranch(rootNode);

  // 4. Red Dashed Cut Height Line
  const cutY = hToY(approxCut);
  ctx.strokeStyle = cutColor;
  ctx.lineWidth = 2.0;
  ctx.setLineDash([6, 4]);
  ctx.beginPath();
  ctx.moveTo(plotLeft - 4, cutY);
  ctx.lineTo(plotRight + 4, cutY);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.fillStyle = cutColor;
  ctx.font = 'bold 9px "JetBrains Mono", monospace';
  ctx.fillText(`Cut @ ${approxCut.toFixed(2)}  k=${k}`, plotRight - 110, cutY - 6);

  // ── RIGHT PANEL: Customer Feature Space ──
  const p2X = p1X + panelW + margin;
  const p2Y = margin;
  ctx.fillStyle = cardBg;
  ctx.fillRect(p2X, p2Y, panelW, panelH);
  ctx.strokeStyle = spineColor;
  ctx.lineWidth = 1;
  ctx.strokeRect(p2X, p2Y, panelW, panelH);

  ctx.fillStyle = textColor;
  ctx.font = 'bold 12px "Plus Jakarta Sans", sans-serif';
  ctx.fillText(`B. Customer Personas in Feature Space (k=${k})`, p2X + 16, p2Y + 22);

  const spLeft = p2X + 42;
  const spRight = p2X + panelW - 16;
  const spTop = p2Y + 45;
  const spBottom = p2Y + panelH - 28;
  const spW = spRight - spLeft;
  const spH = spBottom - spTop;

  // Grid
  ctx.strokeStyle = gridColor;
  ctx.lineWidth = 0.8;
  ctx.setLineDash([3, 3]);
  for (let i = 0; i <= 4; i++) {
    const gy = spTop + (spH / 4) * i;
    ctx.beginPath();
    ctx.moveTo(spLeft, gy);
    ctx.lineTo(spRight, gy);
    ctx.stroke();

    const gx = spLeft + (spW / 4) * i;
    ctx.beginPath();
    ctx.moveTo(gx, spTop);
    ctx.lineTo(gx, spBottom);
    ctx.stroke();

    ctx.fillStyle = mutedColor;
    ctx.font = '8.5px "JetBrains Mono", monospace';
    ctx.fillText((100 - i * 25).toString(), p2X + 12, gy + 3);
    ctx.fillText((i * 30).toString(), gx - 6, spBottom + 14);
  }
  ctx.setLineDash([]);

  // Axis Labels
  ctx.fillStyle = mutedColor;
  ctx.font = 'bold 9px "Plus Jakarta Sans", sans-serif';
  ctx.fillText('Annual Income ($k)', spLeft + spW / 2 - 40, spBottom + 24);

  // Scatter Clouds
  personas.forEach((p, idx) => {
    const cColor = palette[idx % palette.length];
    const centerX = spLeft + (p.avg_income / 130) * spW;
    const centerY = spBottom - (p.avg_spending / 100) * spH;

    const count = p.size || 25;
    for (let pt = 0; pt < count; pt++) {
      const angle = (pt * 137.5 * Math.PI) / 180;
      const rad = Math.sqrt(pt / count) * 24 + ((pt * 7 + seed) % 5) - 2.5;
      const px = centerX + Math.cos(angle) * rad * (spW / 280);
      const py = centerY + Math.sin(angle) * rad * (spH / 200);

      ctx.fillStyle = cColor;
      ctx.beginPath();
      ctx.arc(px, py, 3.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = isDark ? '#0F172A' : '#FFFFFF';
      ctx.lineWidth = 0.6;
      ctx.stroke();
    }

    // Centroid Cross
    ctx.strokeStyle = isDark ? '#FFFFFF' : '#0F172A';
    ctx.lineWidth = 2.4;
    const cs = 5.5;
    ctx.beginPath();
    ctx.moveTo(centerX - cs, centerY - cs);
    ctx.lineTo(centerX + cs, centerY + cs);
    ctx.moveTo(centerX + cs, centerY - cs);
    ctx.lineTo(centerX - cs, centerY + cs);
    ctx.stroke();

    ctx.strokeStyle = cColor;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(centerX - cs, centerY - cs);
    ctx.lineTo(centerX + cs, centerY + cs);
    ctx.moveTo(centerX + cs, centerY - cs);
    ctx.lineTo(centerX - cs, centerY + cs);
    ctx.stroke();
  });
}

// ── 9. Code Walkthrough Switcher & Copy Utility ───────────────────────
const codeTitles = {
  1: "Step 1: Customer Dataset Synthesis",
  2: "Step 2: StandardScaler Normalization",
  3: "Step 3: SciPy Linkage Matrix Computation",
  4: "Step 4: Dendrogram Plotting & Tree Slice",
  5: "Step 5: Label Extraction & Persona Profiling"
};

function activateCodeStep(stepNum) {
  const buttons = document.querySelectorAll('.code-nav-btn');
  buttons.forEach((btn, idx) => {
    btn.classList.toggle('active', idx === (stepNum - 1));
  });

  for (let i = 1; i <= 5; i++) {
    const pane = document.getElementById(`snippet-pane-${i}`);
    if (pane) pane.style.display = (i === stepNum) ? 'block' : 'none';
  }

  const titleEl = document.getElementById('code-step-title');
  if (titleEl && codeTitles[stepNum]) {
    titleEl.textContent = codeTitles[stepNum];
  }
}

function copyActiveCodeSnippet() {
  const activePane = document.querySelector('.code-snippet-pane[style*="display: block"]') || document.getElementById('snippet-pane-1');
  if (activePane) {
    const code = activePane.querySelector('code').innerText;
    navigator.clipboard.writeText(code).then(() => {
      alert("Python code snippet copied to clipboard!");
    }).catch(() => {});
  }
}

// ── 10. Viva Voce MCQ Engine ──────────────────────────────────────────
const vivaQuestions = [
  {
    id: 1,
    question: "How does the Agglomerative Hierarchical Clustering algorithm operate during cluster construction?",
    options: [
      "Top-down: Starts with 1 master cluster containing all samples and recursively bifurcates it.",
      "Bottom-up: Starts with N single-point clusters and iteratively merges the most similar cluster pairs.",
      "Centroid-based: Randomly seeds k points and minimizes squared distances to means.",
      "Density-based: Grows clusters along continuous regions of spatial sample density."
    ],
    answer: 1,
    explanation: "Agglomerative clustering is a strictly bottom-up approach. Each of the \\(N\\) observations starts in its own cluster. At each of the \\(N-1\\) sequential steps, the algorithm merges the two closest clusters according to the specified linkage metric."
  },
  {
    id: 2,
    question: "What is the primary optimization objective of Ward's linkage criterion during cluster merging?",
    options: [
      "Minimizing the maximum Euclidean distance between any two observations in the merged cluster.",
      "Minimizing the total increase in within-cluster sum of squares (variance / ESS).",
      "Maximizing the geometric margin between boundary support vectors.",
      "Minimizing the mean pairwise distance between all member points."
    ],
    answer: 1,
    explanation: "Ward's criterion calculates \\(\\Delta \\text{ESS}_{AB} = \\frac{|A||B|}{|A|+|B|} \\|\\boldsymbol{\\mu}_A - \\boldsymbol{\\mu}_B\\|^2\\). It merges the pair of clusters that adds the minimal within-cluster variance, leading to compact, equal-variance clusters."
  },
  {
    id: 3,
    question: "In a hierarchical dendrogram tree, what does the vertical height of an inverted 'U' bar represent?",
    options: [
      "The sample count of observations contained inside that sub-cluster.",
      "The statistical p-value confidence of cluster separation.",
      "The dissimilarity (distance) threshold at which the two sub-clusters were merged.",
      "The computational execution time (milliseconds) taken by that iteration."
    ],
    answer: 2,
    explanation: "The vertical axis of the dendrogram measures distance/dissimilarity. A taller vertical bar signifies that the algorithm had to bridge a large distance gap to merge the two groups."
  },
  {
    id: 4,
    question: "Why is Feature Standardization (e.g., StandardScaler) mandatory before computing distance matrices for customer segmentation?",
    options: [
      "To prevent high-magnitude features (e.g., Income $80,000) from dominating distance calculations over smaller scale features (e.g., Spending Score 1–100).",
      "Because SciPy distance matrices cannot process negative numbers.",
      "To map the 2D feature space into an infinite-dimensional Hilbert space.",
      "To force the dataset into an exact uniform distribution."
    ],
    answer: 0,
    explanation: "Euclidean distance is scale-dependent. Without \\(z\\)-score normalization (\\(z = \\frac{x-\\mu}{\\sigma}\\)), an income difference of $10,000 would overpower a spending score difference of 50 by 200x, effectively ignoring spending habits."
  },
  {
    id: 5,
    question: "Which linkage criterion is notoriously vulnerable to the 'Chaining Effect' (forming long, un-isolated, straggly clusters)?",
    options: [
      "Complete Linkage (Max Pairwise Distance)",
      "Ward's Minimum Variance Linkage",
      "Single Linkage (Minimum Pairwise Distance)",
      "Average Linkage (Mean Pairwise Distance)"
    ],
    answer: 2,
    explanation: "Single Linkage defines distance as \\(D(A, B) = \\min d(\\mathbf{u}, \\mathbf{v})\\). If a thin bridge of intermediate noise points connects two distinct clusters, single linkage will merge them together into an extended chain."
  }
];

let vivaUserAnswers = {};

function initMCQs() {
  const container = document.getElementById('mcq-container');
  if (!container) return;

  container.innerHTML = vivaQuestions.map((q) => `
    <div class="mcq-question-card" id="mcq-card-${q.id}">
      <div class="mcq-header">
        <span class="q-badge">Question ${q.id}</span>
        <div class="q-text">${q.question}</div>
      </div>
      <div class="mcq-options-list">
        ${q.options.map((opt, oIdx) => `
          <button class="mcq-opt-btn" onclick="submitMCQAnswer(${q.id}, ${oIdx})">
            <span class="opt-prefix">${String.fromCharCode(65 + oIdx)}</span>
            <span>${opt}</span>
          </button>
        `).join('')}
      </div>
      <div class="mcq-feedback-box" id="feedback-box-${q.id}">
        <div class="feedback-status" id="feedback-status-${q.id}"></div>
        <div class="feedback-explanation" id="feedback-exp-${q.id}"></div>
      </div>
    </div>
  `).join('');

  initKaTeX();
}

function submitMCQAnswer(qId, selectedIdx) {
  const qObj = vivaQuestions.find(q => q.id === qId);
  if (!qObj) return;

  vivaUserAnswers[qId] = selectedIdx;
  const card = document.getElementById(`mcq-card-${qId}`);
  const buttons = card.querySelectorAll('.mcq-opt-btn');
  const feedbackBox = document.getElementById(`feedback-box-${qId}`);
  const statusEl = document.getElementById(`feedback-status-${qId}`);
  const expEl = document.getElementById(`feedback-exp-${qId}`);

  buttons.forEach((btn, idx) => {
    btn.disabled = true;
    btn.classList.remove('correct', 'incorrect');
    if (idx === qObj.answer) {
      btn.classList.add('correct');
    }
    if (idx === selectedIdx && selectedIdx !== qObj.answer) {
      btn.classList.add('incorrect');
    }
  });

  const isCorrect = (selectedIdx === qObj.answer);
  feedbackBox.style.display = 'block';
  statusEl.className = `feedback-status ${isCorrect ? 'pass' : 'fail'}`;
  statusEl.textContent = isCorrect ? '✅ Correct Answer!' : '❌ Incorrect Selection';
  expEl.innerHTML = qObj.explanation;

  initKaTeX();
  updateScoreCounter();
}

function updateScoreCounter() {
  let score = 0;
  vivaQuestions.forEach(q => {
    if (vivaUserAnswers[q.id] === q.answer) score++;
  });

  const scoreEl = document.getElementById('viva-score-val');
  if (scoreEl) scoreEl.textContent = score;
}

function resetQuiz() {
  vivaUserAnswers = {};
  const scoreEl = document.getElementById('viva-score-val');
  if (scoreEl) scoreEl.textContent = '0';
  initMCQs();
}

// ── 11. Lightbox Zoom Modal ───────────────────────────────────────────
function openLightbox(src) {
  const modal = document.getElementById('image-lightbox-modal');
  const img = document.getElementById('lightbox-img');
  if (modal && img) {
    img.src = src;
    modal.classList.add('active');
  }
}

function closeLightbox() {
  const modal = document.getElementById('image-lightbox-modal');
  if (modal) modal.classList.remove('active');
}
