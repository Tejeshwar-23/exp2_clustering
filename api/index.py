"""
Unified Vercel Serverless Entrypoint for Experiment 2: Hierarchical Clustering
Supports:
  - Static Asset Serving: `/`, `/index.html`, `/styles.css`, `/app.js`
  - Vercel WSGI / ASGI Function entrypoint: `app` and `application`
  - Vercel BaseHTTPRequestHandler: `handler`
Endpoints:
  - GET  /                   -> Serves interactive web dashboard
  - GET  /api/health         -> Backend health and capability status
  - POST /api/run-clustering -> Compute Hierarchical Clustering, dendrogram, customer personas, and dual-panel visualization
"""

import os
import io
import json
import base64
import mimetypes
import urllib.parse
from http.server import BaseHTTPRequestHandler

import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import numpy as np

from scipy.cluster.hierarchy import dendrogram, linkage
from sklearn.preprocessing import StandardScaler
from sklearn.cluster import AgglomerativeClustering

ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def get_static_file(rel_path):
    """Safely resolve and read static files from the repository root."""
    if not rel_path or rel_path == '/':
        rel_path = 'index.html'
    rel_path = rel_path.lstrip('/')
    file_path = os.path.join(ROOT_DIR, rel_path)
    
    if os.path.isfile(file_path) and os.path.abspath(file_path).startswith(ROOT_DIR):
        mime_type, _ = mimetypes.guess_type(file_path)
        if mime_type is None:
            mime_type = 'text/html' if file_path.endswith('.html') else 'application/octet-stream'
        if mime_type.startswith('text/') or mime_type in ['application/javascript', 'application/json']:
            mime_type += '; charset=utf-8'
        try:
            with open(file_path, 'rb') as f:
                return f.read(), mime_type
        except Exception:
            return None, None
    return None, None


def fig_to_base64(fig, dpi=160):
    buf = io.BytesIO()
    fig.savefig(buf, format='png', dpi=dpi, bbox_inches='tight', facecolor=fig.get_facecolor(), edgecolor='none')
    buf.seek(0)
    img_b64 = base64.b64encode(buf.read()).decode('utf-8')
    plt.close(fig)
    return f"data:image/png;base64,{img_b64}"


def assign_persona(avg_inc, avg_sp, k, c_idx):
    """Assigns business persona and strategic recommendation based on feature means."""
    if avg_inc < 35 and avg_sp < 60:
        return {
            'persona': "Frugal Caretakers",
            'badge': "Value-Conscious",
            'strategy': "Promote essential staples, loyalty points, and bulk discount bundles."
        }
    elif avg_inc < 35 and avg_sp >= 60:
        return {
            'persona': "Impulsive Trendsetters",
            'badge': "High Engagement",
            'strategy': "Target with flash sales, trending youth fashion, and gamified promotions."
        }
    elif 35 <= avg_inc <= 68 and 35 <= avg_sp <= 65:
        return {
            'persona': "Pragmatic Middle",
            'badge': "Core Market",
            'strategy': "Offer balanced value propositions, reliable quality, and seasonal catalog deals."
        }
    elif avg_inc > 68 and avg_sp < 50:
        return {
            'persona': "Affluent Savers",
            'badge': "High Potential",
            'strategy': "Attract with wealth management incentives, luxury utility, and private sales."
        }
    elif avg_inc > 68 and avg_sp >= 50:
        return {
            'persona': "VIP High-Rollers",
            'badge': "Top Tier",
            'strategy': "Deliver bespoke VIP concierge, exclusive early-access perks, and luxury exclusives."
        }
    elif avg_inc < 45:
        return {
            'persona': f"Emerging Segment {c_idx+1}",
            'badge': "Growth Target",
            'strategy': "Tailor accessible pricing and engagement campaigns."
        }
    else:
        return {
            'persona': f"Upper Segment {c_idx+1}",
            'badge': "Premium Target",
            'strategy': "Curate premium experiences and tailored recommendations."
        }


def run_clustering(params):
    n_clusters = int(params.get('n_clusters', 5))
    n_clusters = max(2, min(8, n_clusters))
    linkage_method = params.get('linkage_method', 'ward').lower()
    if linkage_method not in ['ward', 'complete', 'average', 'single']:
        linkage_method = 'ward'
    random_state = int(params.get('random_state', 42))
    theme = params.get('theme', 'dark').lower()

    # 1. Synthesize Mall Customer Data
    np.random.seed(random_state)
    cluster_specs = [
        {'center': [15, 39], 'std': [5, 8],  'n': 40},
        {'center': [15, 80], 'std': [5, 7],  'n': 25},
        {'center': [50, 50], 'std': [8, 8],  'n': 35},
        {'center': [85, 20], 'std': [6, 7],  'n': 30},
        {'center': [85, 82], 'std': [6, 6],  'n': 30},
    ]

    income_list, spending_list = [], []
    for spec in cluster_specs:
        inc = np.clip(np.random.normal(spec['center'][0], spec['std'][0], spec['n']), 1, 130)
        sp = np.clip(np.random.normal(spec['center'][1], spec['std'][1], spec['n']), 1, 99)
        income_list.append(inc)
        spending_list.append(sp)

    income = np.concatenate(income_list)
    spending = np.concatenate(spending_list)
    X = np.column_stack([income, spending])
    n_samples = len(X)

    # 2. Standardization
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    # 3. Linkage Computation
    Z = linkage(X_scaled, method=linkage_method, metric='euclidean')

    # 4. Fit Agglomerative Model
    model = AgglomerativeClustering(n_clusters=n_clusters, linkage=linkage_method)
    labels = model.fit_predict(X_scaled)

    # 5. Extract Cluster Personas & Stats
    raw_clusters = []
    for c in range(n_clusters):
        mask = (labels == c)
        count = int(mask.sum())
        avg_inc = float(income[mask].mean()) if count > 0 else 0.0
        avg_sp = float(spending[mask].mean()) if count > 0 else 0.0
        pct = round((count / n_samples) * 100, 1)
        raw_clusters.append({
            'raw_id': c,
            'size': count,
            'avg_income': round(avg_inc, 1),
            'avg_spending': round(avg_sp, 1),
            'percent': pct
        })

    # Sort clusters naturally by income & spending for consistent visual mapping
    raw_clusters.sort(key=lambda item: (item['avg_income'], item['avg_spending']))
    
    cluster_stats = []
    cluster_id_mapping = {}
    for new_idx, item in enumerate(raw_clusters):
        p_info = assign_persona(item['avg_income'], item['avg_spending'], n_clusters, new_idx)
        cluster_id_mapping[item['raw_id']] = new_idx + 1
        cluster_stats.append({
            'cluster_id': new_idx + 1,
            'raw_id': item['raw_id'],
            'persona': p_info['persona'],
            'badge': p_info['badge'],
            'strategy': p_info['strategy'],
            'size': item['size'],
            'avg_income': item['avg_income'],
            'avg_spending': item['avg_spending'],
            'percent': item['percent']
        })

    # 6. Calculate Cut Height
    if len(Z) >= n_clusters:
        if n_clusters == 1:
            cut_height = float(Z[-1, 2] * 1.1)
        else:
            h_current = Z[-(n_clusters - 1), 2]
            h_prev = Z[-n_clusters, 2] if len(Z) >= n_clusters else 0
            cut_height = float((h_current + h_prev) / 2.0)
    else:
        cut_height = float(0.7 * max(Z[:, 2]))

    # 7. Render High-Contrast Dual Panel Plot
    is_dark = (theme == 'dark')
    bg_color = '#0B1120' if is_dark else '#FFFFFF'
    card_bg = '#0F172A' if is_dark else '#F8FAFC'
    text_color = '#F8FAFC' if is_dark else '#0F172A'
    muted_color = '#94A3B8' if is_dark else '#64748B'
    grid_color = '#334155' if is_dark else '#E2E8F0'
    spine_color = '#334155' if is_dark else '#CBD5E1'
    cut_line_color = '#F43F5E' if is_dark else '#DC2626'

    palette = [
        '#38BDF8', '#34D399', '#FB923C', '#A78BFA',
        '#F43F5E', '#FBBF24', '#2DD4BF', '#E879F9'
    ] if is_dark else [
        '#0284C7', '#059669', '#D97706', '#7C3AED',
        '#DC2626', '#B45309', '#0D9488', '#4F46E5'
    ]

    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(15.5, 5.8), facecolor=bg_color, dpi=160)

    # ── Left: Dendrogram ──
    ax1.set_facecolor(card_bg)
    dendrogram(
        Z,
        ax=ax1,
        truncate_mode='lastp',
        p=28,
        leaf_rotation=90,
        leaf_font_size=8,
        color_threshold=cut_height,
        above_threshold_color=muted_color
    )
    ax1.axhline(
        y=cut_height,
        color=cut_line_color,
        linestyle='--',
        linewidth=2.0,
        label=f'Cut Height = {cut_height:.2f} (k={n_clusters})'
    )
    ax1.set_title(
        f'A. Hierarchical Dendrogram ({linkage_method.capitalize()} Linkage)',
        fontsize=12, fontweight='bold', color=text_color, pad=10
    )
    ax1.set_xlabel('Merged Customer Nodes', fontsize=9.5, fontweight='bold', color=muted_color, labelpad=6)
    ax1.set_ylabel('Euclidean Distance', fontsize=9.5, fontweight='bold', color=muted_color, labelpad=6)
    ax1.tick_params(colors=muted_color, labelsize=8.5)
    ax1.grid(axis='y', alpha=0.3, color=grid_color, linestyle=':')
    ax1.legend(
        loc='upper right',
        facecolor=bg_color,
        edgecolor=spine_color,
        labelcolor=text_color,
        fontsize=8.5,
        framealpha=0.9
    )
    for spine in ax1.spines.values():
        spine.set_color(spine_color)

    # ── Right: 2D Customer Feature Space ──
    ax2.set_facecolor(card_bg)
    for i, c_data in enumerate(cluster_stats):
        raw_c = c_data['raw_id']
        mask = (labels == raw_c)
        c_color = palette[i % len(palette)]
        
        ax2.scatter(
            income[mask], spending[mask],
            color=c_color,
            label=f"C{c_data['cluster_id']}: {c_data['persona']} ({c_data['size']})",
            s=48, alpha=0.85,
            edgecolors='#0F172A' if is_dark else '#FFFFFF',
            linewidths=0.7,
            zorder=3
        )
        if mask.sum() > 0:
            cx, cy = income[mask].mean(), spending[mask].mean()
            ax2.scatter(
                cx, cy,
                color=c_color, s=170, marker='X',
                edgecolors='#FFFFFF' if is_dark else '#0F172A',
                linewidths=1.6, zorder=6
            )

    ax2.set_title(
        f'B. Customer Personas in Feature Space (k={n_clusters})',
        fontsize=12, fontweight='bold', color=text_color, pad=10
    )
    ax2.set_xlabel('Annual Income ($k)', fontsize=9.5, fontweight='bold', color=muted_color, labelpad=6)
    ax2.set_ylabel('Spending Score (1–100)', fontsize=9.5, fontweight='bold', color=muted_color, labelpad=6)
    ax2.tick_params(colors=muted_color, labelsize=8.5)
    ax2.grid(alpha=0.3, color=grid_color, linestyle=':')
    ax2.legend(
        loc='best',
        facecolor=bg_color,
        edgecolor=spine_color,
        labelcolor=text_color,
        fontsize=8.5,
        framealpha=0.9
    )
    for spine in ax2.spines.values():
        spine.set_color(spine_color)

    plt.tight_layout()
    chart_img = fig_to_base64(fig)

    return {
        'status': 'success',
        'n_clusters': n_clusters,
        'linkage_method': linkage_method,
        'random_state': random_state,
        'threshold': round(cut_height, 2),
        'clusters': cluster_stats,
        'chart': chart_img,
        'summary': f"Segmented {n_samples} customers into {n_clusters} clusters using {linkage_method.capitalize()} linkage with tree slice at distance {cut_height:.2f}.",
        'environment': 'Vercel Serverless Function'
    }


# ── WSGI Application Entrypoint (for Vercel tool.vercel.entrypoint) ───────────
def app(environ, start_response):
    path = environ.get('PATH_INFO', '') or '/'
    method = environ.get('REQUEST_METHOD', 'GET').upper()

    cors_headers = [
        ('Access-Control-Allow-Origin', '*'),
        ('Access-Control-Allow-Methods', 'GET, POST, OPTIONS'),
        ('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    ]

    if method == 'OPTIONS':
        start_response('200 OK', cors_headers + [('Content-Type', 'text/plain')])
        return [b'']

    # Route: Health Check
    if path in ['/api/health', '/health', '/api/health/', '/health/'] and method == 'GET':
        start_response('200 OK', cors_headers + [('Content-Type', 'application/json')])
        res = {
            'status': 'online',
            'experiment': 'Hierarchical Clustering',
            'platform': 'Vercel Serverless',
            'frameworks': ['SciPy', 'Scikit-Learn', 'Matplotlib']
        }
        return [json.dumps(res).encode('utf-8')]

    # Route: Run Clustering API
    if path in ['/api/run-clustering', '/run-clustering', '/api/run-clustering/', '/run-clustering/'] or (method == 'POST' and 'clustering' in path):
        try:
            content_length = int(environ.get('CONTENT_LENGTH', 0) or 0)
        except (ValueError, TypeError):
            content_length = 0

        post_data = environ['wsgi.input'].read(content_length).decode('utf-8') if content_length > 0 else "{}"
        try:
            params = json.loads(post_data) if post_data else {}
        except Exception:
            params = {}

        try:
            res = run_clustering(params)
            start_response('200 OK', cors_headers + [('Content-Type', 'application/json')])
            return [json.dumps(res).encode('utf-8')]
        except Exception as e:
            start_response('500 Internal Server Error', cors_headers + [('Content-Type', 'application/json')])
            return [json.dumps({'status': 'error', 'error': str(e)}).encode('utf-8')]

    # Route: Static Assets (HTML, CSS, JS, etc.)
    if method == 'GET':
        content, mime_type = get_static_file(path)
        if content is not None:
            start_response('200 OK', cors_headers + [('Content-Type', mime_type)])
            return [content]

    # Fallback
    start_response('404 Not Found', cors_headers + [('Content-Type', 'application/json')])
    return [json.dumps({'status': 'error', 'message': f'Route {path} not found'}).encode('utf-8')]


# Alias application to app for full WSGI compatibility
application = app


# ── BaseHTTPRequestHandler Entrypoint (for Vercel serverless functions) ──────
class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        parsed_path = urllib.parse.urlparse(self.path)
        path = parsed_path.path

        if path in ['/api/health', '/health']:
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps({
                'status': 'online',
                'experiment': 'Hierarchical Clustering',
                'platform': 'Vercel Serverless',
                'frameworks': ['SciPy', 'Scikit-Learn', 'Matplotlib']
            }).encode('utf-8'))
            return

        content, mime_type = get_static_file(path)
        if content is not None:
            self.send_response(200)
            self.send_header('Content-Type', mime_type)
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(content)
            return

        self.send_response(404)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(json.dumps({'status': 'error', 'message': f'Route {path} not found'}).encode('utf-8'))

    def do_POST(self):
        content_length = int(self.headers.get('Content-Length', 0))
        post_data = self.rfile.read(content_length).decode('utf-8') if content_length > 0 else "{}"
        try:
            params = json.loads(post_data) if post_data else {}
        except Exception:
            params = {}

        try:
            res = run_clustering(params)
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps(res).encode('utf-8'))
        except Exception as e:
            self.send_response(500)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps({'status': 'error', 'error': str(e)}).encode('utf-8'))

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        self.end_headers()
