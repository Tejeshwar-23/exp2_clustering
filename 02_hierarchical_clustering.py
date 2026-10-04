"""
============================================================
EXPERIMENT 2 — CUSTOMER HIERARCHICAL CLUSTERING
Team 15 ML Seminar
============================================================
Goal: Demonstrate end-to-end unsupervised customer segmentation:
      Customers -> Similarity Matrix -> Linkage Hierarchy -> Dendrogram Slicing -> 5 Customer Personas

Dataset:    Mall Customers Synthetic Dataset (Reproducible)
Features:   Annual Income ($k) vs Spending Score (1–100)
Scaling:    StandardScaler (Zero-mean, Unit-variance)
Algorithm:  Agglomerative Hierarchical Clustering
Linkage:    Ward's Minimum Variance (Euclidean Distance)
Visuals:    High-Resolution (300 DPI) Dendrogram & 2D Cluster Space
============================================================
"""

import os
import sys
if hasattr(sys.stdout, 'reconfigure'):
    try:
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    except Exception:
        pass

import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from scipy.cluster.hierarchy import dendrogram, linkage, fcluster
from sklearn.preprocessing import StandardScaler
from sklearn.cluster import AgglomerativeClustering

# ── Configuration ────────────────────────────────────────────────────
RANDOM_STATE = 42
OUTPUT_DIR = os.path.join('outputs', 'clustering')
os.makedirs(OUTPUT_DIR, exist_ok=True)

print("=" * 65)
print("  EXPERIMENT 2: AGGLOMERATIVE HIERARCHICAL CLUSTERING")
print("  Customer Segmentation & Dendrogram Interpretation")
print("=" * 65)

# ── 1. Create Customer Dataset ──────────────────────────────────────
# Five natural customer segments in (Annual Income $k, Spending Score 1-100)
np.random.seed(RANDOM_STATE)

cluster_specs = [
    {'center': [15, 39], 'std': [5, 8],  'n': 40, 'persona': 'Frugal Caretakers'},
    {'center': [15, 80], 'std': [5, 7],  'n': 25, 'persona': 'Impulsive Trendsetters'},
    {'center': [50, 50], 'std': [8, 8],  'n': 35, 'persona': 'Pragmatic Middle'},
    {'center': [85, 20], 'std': [6, 7],  'n': 30, 'persona': 'Affluent Savers'},
    {'center': [85, 82], 'std': [6, 6],  'n': 30, 'persona': 'VIP High-Rollers'},
]

income_all = []
spending_all = []
canonical_labels = []

for i, spec in enumerate(cluster_specs):
    inc = np.random.normal(spec['center'][0], spec['std'][0], spec['n'])
    sp = np.random.normal(spec['center'][1], spec['std'][1], spec['n'])
    # Clip to realistic bounds
    inc = np.clip(inc, 1, 130)
    sp = np.clip(sp, 1, 99)
    income_all.append(inc)
    spending_all.append(sp)
    canonical_labels.extend([i] * spec['n'])

income = np.concatenate(income_all)
spending = np.concatenate(spending_all)
X = np.column_stack([income, spending])
n_customers = len(X)

print(f"\n[1] Synthetic Customer Dataset Generated:")
print(f"    - Total Observations: {n_customers} customers")
print(f"    - Features:           Annual Income ($k), Spending Score (1-100)")
print(f"    - Natural Archetypes: 5 Clusters")

print("\n    Sample Records:")
print(f"    {'Customer ID':<14} {'Income ($k)':>14} {'Spending Score':>16}")
print(f"    {'-'*46}")
for idx in range(5):
    print(f"    CUST-{idx+1:03d}         {income[idx]:>10.1f} $k {spending[idx]:>14.1f} / 100")
print(f"    {'...':>14}")

# ── 2. Scale Features ───────────────────────────────────────────────
scaler = StandardScaler()
X_scaled = scaler.fit_transform(X)
print(f"\n[2] Feature Standardization (StandardScaler):")
print(f"    - Mean Income:        ${income.mean():.2f}k -> Scaled Mean: {X_scaled[:, 0].mean():.2e}")
print(f"    - Mean Spending:      {spending.mean():.2f}/100 -> Scaled Mean: {X_scaled[:, 1].mean():.2e}")
print(f"    - Standard Deviation: Income={income.std():.2f}, Spending={spending.std():.2f} -> Scaled Std=[1.0, 1.0]")

# ── 3. Compute Linkage Matrix ───────────────────────────────────────
Z = linkage(X_scaled, method='ward', metric='euclidean')
print(f"\n[3] Hierarchical Linkage Matrix (SciPy):")
print(f"    - Criterion:          Ward's Minimum Variance")
print(f"    - Distance Metric:    Euclidean (L2)")
print(f"    - Total Merge Steps:  {len(Z)}")

# ── 4. Dendrogram Plot (300 DPI) ────────────────────────────────────
fig1, ax1 = plt.subplots(figsize=(12, 6), dpi=300)
max_d = 0.7 * max(Z[:, 2])

dendro_res = dendrogram(
    Z,
    ax=ax1,
    truncate_mode='lastp',
    p=30,
    leaf_rotation=90,
    leaf_font_size=9,
    color_threshold=max_d,
    above_threshold_color='#64748B'
)

ax1.axhline(y=max_d, color='#DC2626', linestyle='--', linewidth=2.2,
            label=f'Optimal Cluster Cut Threshold (h = {max_d:.2f}, k = 5)')

ax1.set_title('Hierarchical Clustering Dendrogram (Ward Linkage)\nMall Customer Segmentation Tree',
              fontsize=14, fontweight='bold', pad=12, color='#0F172A')
ax1.set_xlabel('Customer Sub-clusters / Merged Nodes', fontsize=11, fontweight='600', labelpad=8, color='#334155')
ax1.set_ylabel('Euclidean Ward Distance', fontsize=11, fontweight='600', labelpad=8, color='#334155')
ax1.grid(axis='y', alpha=0.3, linestyle=':')
ax1.legend(loc='upper right', frameon=True, facecolor='white', edgecolor='#CBD5E1', fontsize=10)
ax1.tick_params(colors='#334155', labelsize=9)
for spine in ax1.spines.values():
    spine.set_color('#CBD5E1')

plt.tight_layout()
fig1_path = os.path.join(OUTPUT_DIR, 'dendrogram.png')
fig1.savefig(fig1_path, dpi=300, bbox_inches='tight', facecolor='white')
plt.close(fig1)
print(f"\n[4] Saved High-Res Dendrogram: {fig1_path}")

# ── 5. Fit Agglomerative Clustering (k=5) ───────────────────────────
N_CLUSTERS = 5
model = AgglomerativeClustering(n_clusters=N_CLUSTERS, linkage='ward')
cluster_labels = model.fit_predict(X_scaled)

# Helper function to assign persona name based on center
def get_persona_name(avg_inc, avg_sp):
    if avg_inc < 35 and avg_sp < 60:
        return "Frugal Caretakers"
    elif avg_inc < 35 and avg_sp >= 60:
        return "Impulsive Trendsetters"
    elif 35 <= avg_inc <= 68:
        return "Pragmatic Middle"
    elif avg_inc > 68 and avg_sp < 50:
        return "Affluent Savers"
    else:
        return "VIP High-Rollers"

cluster_info = []
for c in range(N_CLUSTERS):
    mask = (cluster_labels == c)
    count = int(mask.sum())
    avg_inc = float(income[mask].mean())
    avg_sp = float(spending[mask].mean())
    persona = get_persona_name(avg_inc, avg_sp)
    cluster_info.append({
        'id': c,
        'persona': persona,
        'count': count,
        'pct': (count / n_customers) * 100,
        'avg_income': avg_inc,
        'avg_spending': avg_sp
    })

# Sort clusters by persona archetype for neat presentation
cluster_info.sort(key=lambda x: (x['avg_income'], x['avg_spending']))

print(f"\n[5] Agglomerative Clustering Personas (k={N_CLUSTERS}):")
print(f"    {'Cluster':<10} {'Persona Archetype':<24} {'Size':>6} {'Pct (%)':>8} {'Avg Inc ($k)':>14} {'Avg Spending':>14}")
print(f"    {'-'*80}")
for c in cluster_info:
    print(f"    Cluster {c['id']+1:<2} {c['persona']:<24} {c['count']:>6} {c['pct']:>7.1f}% {c['avg_income']:>13.1f} {c['avg_spending']:>13.1f}")

# ── 6. 2D Cluster Scatter Plot (300 DPI) ────────────────────────────
fig2, ax2 = plt.subplots(figsize=(10, 7), dpi=300)
palette = ['#0284C7', '#059669', '#D97706', '#7C3AED', '#DC2626', '#0D9488', '#DB2777', '#4F46E5']

for i, c in enumerate(cluster_info):
    c_id = c['id']
    mask = (cluster_labels == c_id)
    color = palette[i % len(palette)]
    
    ax2.scatter(
        income[mask], spending[mask],
        c=color,
        label=f"C{c_id+1}: {c['persona']} (n={c['count']})",
        s=65, alpha=0.85, edgecolors='white', linewidths=0.9, zorder=3
    )
    
    # Plot Centroid
    cx, cy = c['avg_income'], c['avg_spending']
    ax2.scatter(cx, cy, c=color, s=220, marker='X', edgecolors='#0F172A', linewidths=1.8, zorder=5)
    ax2.annotate(
        f"Centroid C{c_id+1}\n(${cx:.0f}k, {cy:.0f})",
        xy=(cx, cy), xytext=(cx + 2.5, cy + 2.5),
        fontsize=8.5, fontweight='bold', color='#1E293B',
        bbox=dict(boxstyle="round,pad=0.25", facecolor='white', edgecolor=color, alpha=0.9),
        zorder=6
    )

ax2.set_title('Customer Segmentation — Hierarchical Clusters (k=5)\nAnnual Income vs. Spending Score',
              fontsize=14, fontweight='bold', pad=12, color='#0F172A')
ax2.set_xlabel('Annual Income ($k)', fontsize=11, fontweight='600', labelpad=8, color='#334155')
ax2.set_ylabel('Spending Score (1–100)', fontsize=11, fontweight='600', labelpad=8, color='#334155')
ax2.grid(alpha=0.35, linestyle=':')
ax2.legend(loc='best', frameon=True, facecolor='white', edgecolor='#CBD5E1', fontsize=9.5)
ax2.tick_params(colors='#334155')
for spine in ax2.spines.values():
    spine.set_color('#CBD5E1')

plt.tight_layout()
fig2_path = os.path.join(OUTPUT_DIR, 'customer_clusters.png')
fig2.savefig(fig2_path, dpi=300, bbox_inches='tight', facecolor='white')
plt.close(fig2)
print(f"[6] Saved High-Res Customer Clusters Plot: {fig2_path}")

# ── 7. Combined Dual-Panel Plot (300 DPI) ───────────────────────────
fig3, (ax3a, ax3b) = plt.subplots(1, 2, figsize=(18, 6.5), dpi=300)

# Left: Dendrogram
dendro_res2 = dendrogram(
    Z,
    ax=ax3a,
    truncate_mode='lastp',
    p=30,
    leaf_rotation=90,
    leaf_font_size=8,
    color_threshold=max_d,
    above_threshold_color='#64748B'
)
ax3a.axhline(y=max_d, color='#DC2626', linestyle='--', linewidth=2,
             label=f'Cut Height (h={max_d:.2f}) -> k=5')
ax3a.set_title('A. Hierarchical Linkage Dendrogram', fontsize=13, fontweight='bold', color='#0F172A')
ax3a.set_xlabel('Merged Customer Nodes', fontsize=10.5, fontweight='600', color='#334155')
ax3a.set_ylabel('Ward Distance', fontsize=10.5, fontweight='600', color='#334155')
ax3a.grid(axis='y', alpha=0.3, linestyle=':')
ax3a.legend(loc='upper right', frameon=True, facecolor='white', edgecolor='#CBD5E1', fontsize=9)
ax3a.tick_params(colors='#334155')
for spine in ax3a.spines.values():
    spine.set_color('#CBD5E1')

# Right: 2D Feature Space
for i, c in enumerate(cluster_info):
    c_id = c['id']
    mask = (cluster_labels == c_id)
    color = palette[i % len(palette)]
    
    ax3b.scatter(
        income[mask], spending[mask],
        c=color, label=f"C{c_id+1}: {c['persona']}",
        s=50, alpha=0.85, edgecolors='white', linewidths=0.7, zorder=3
    )
    cx, cy = c['avg_income'], c['avg_spending']
    ax3b.scatter(cx, cy, c=color, s=160, marker='X', edgecolors='#0F172A', linewidths=1.5, zorder=5)

ax3b.set_title('B. Customer Persona Clusters (k=5)', fontsize=13, fontweight='bold', color='#0F172A')
ax3b.set_xlabel('Annual Income ($k)', fontsize=10.5, fontweight='600', color='#334155')
ax3b.set_ylabel('Spending Score (1–100)', fontsize=10.5, fontweight='600', color='#334155')
ax3b.grid(alpha=0.35, linestyle=':')
ax3b.legend(loc='best', frameon=True, facecolor='white', edgecolor='#CBD5E1', fontsize=9)
ax3b.tick_params(colors='#334155')
for spine in ax3b.spines.values():
    spine.set_color('#CBD5E1')

fig3.suptitle('Agglomerative Hierarchical Clustering — From Tree Hierarchy to Customer Personas',
              fontsize=15, fontweight='bold', y=0.98, color='#0F172A')

plt.tight_layout()
fig3_path = os.path.join(OUTPUT_DIR, 'clustering_combined.png')
fig3.savefig(fig3_path, dpi=300, bbox_inches='tight', facecolor='white')
plt.close(fig3)
print(f"[7] Saved High-Res Combined Dual-Panel Plot: {fig3_path}")

# ── 8. Save Detailed Results Report ─────────────────────────────────
report_path = os.path.join(OUTPUT_DIR, 'clustering_results.txt')
with open(report_path, 'w', encoding='utf-8') as f:
    f.write("=" * 70 + "\n")
    f.write("EXPERIMENT 2: CUSTOMER HIERARCHICAL CLUSTERING RESULTS REPORT\n")
    f.write("=" * 70 + "\n\n")
    f.write(f"Dataset:            Synthetic Mall Customers Benchmark\n")
    f.write(f"Total Observations: {n_customers} customer profiles\n")
    f.write(f"Features:           Annual Income ($k), Spending Score (1-100)\n")
    f.write(f"Preprocessing:      StandardScaler (Zero-mean, Unit-variance)\n")
    f.write(f"Linkage Criterion:  Ward's Minimum Variance (Euclidean Distance)\n")
    f.write(f"Target Clusters:    k = {N_CLUSTERS}\n")
    f.write(f"Dendrogram Cut:     Height = {max_d:.4f}\n\n")
    f.write(f"{'Cluster':<10} {'Persona Archetype':<24} {'Size':>6} {'Share':>8} {'Avg Inc ($k)':>14} {'Avg Spending':>14}\n")
    f.write("-" * 78 + "\n")
    for c in cluster_info:
        f.write(f"Cluster {c['id']+1:<2} {c['persona']:<24} {c['count']:>6} {c['pct']:>7.1f}% {c['avg_income']:>13.1f} {c['avg_spending']:>13.1f}\n")
    f.write("\n" + "=" * 70 + "\n")

print(f"[8] Saved Summary Report: {report_path}")
print("\n" + "=" * 65)
print("  EXPERIMENT 2 EXECUTION COMPLETE")
print("=" * 65)
