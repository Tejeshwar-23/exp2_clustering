# Experiment 2: Agglomerative Hierarchical Clustering & Customer Segmentation

An interactive, enterprise-grade business intelligence dashboard demonstrating **Agglomerative Hierarchical Clustering**, **Dendrogram Interpretation**, and **Customer Persona Segmentation** on standardized consumer features.

---

## 🚀 Quick Launch (Local Port 8002)

### Option 1: One-Click Windows Launcher
Double-click `start_exp2.bat` in this directory to start the backend server and open the dashboard in your default browser.

### Option 2: Command Line
```bash
# 1. Navigate to experiment directory
cd exp2_clustering

# 2. Install dependencies
pip install -r requirements.txt

# 3. Generate high-resolution visual assets (optional, pre-generated)
python 02_hierarchical_clustering.py

# 4. Start Python backend server on Port 8002
python local_server.py
```
Open **[http://localhost:8002](http://localhost:8002)** in your browser.

---

## 🌐 Deploy to Vercel (Serverless / Static)

This project includes a pre-configured `vercel.json` and `pyproject.toml` ready for 1-click deployment on Vercel.

1. Push this folder to a GitHub repository.
2. In [Vercel](https://vercel.com), import the repository and deploy with default settings.
3. The serverless Python backend runs live Scipy & Scikit-Learn computations, while the client-side JavaScript engine provides seamless fallbacks, interactive parameter adjustments, cut threshold calculations, persona cards, and the 5-question Viva Voce assessment!

---

## 📐 Architecture & Feature Overview

### 1. 🎛️ Interactive Laboratory
- **Parameter Controls:** Target cluster count ($k$: 2 to 8), Linkage method dropdown (Ward, Complete, Average, Single), and Random Seed ($N$: 1 to 100).
- **Dual-Panel Visualizer:** Synchronized display with hierarchical dendrogram tree cut on the left and 2D customer feature space on the right with centroid crosshairs ($\times$).
- **Customer Persona Cards:** Real-time breakdown showing customer counts, percentage share, mean annual income, mean spending score, and business strategy recommendations.
- **Dynamic KaTeX Formulation Card:** Real-time mathematical equation updates based on the selected linkage criterion.

### 2. 💻 Code Walkthrough
- Syntax-highlighted, step-by-step annotated Python implementation:
  1. Synthetic customer dataset generation
  2. `StandardScaler` feature normalization
  3. SciPy `linkage(method='ward')` matrix computation
  4. Matplotlib dendrogram tree slicing
  5. Scikit-Learn `AgglomerativeClustering` label extraction & persona profiling

### 3. 📝 Viva Voce MCQ Assessment
- 5 comprehensive multiple-choice questions testing core clustering fundamentals:
  - Agglomerative bottom-up merge process
  - Ward linkage variance minimization objective
  - Dendrogram vertical height interpretation
  - Feature standardization requirements
  - Single Linkage chaining effect
- Real-time scoring, instant color-coded feedback, and detailed academic explanations with KaTeX formulas.

---

## 👥 Customer Archetypes Discovered
1. **Frugal Caretakers:** Low Income, Average/Low Spending (Value-conscious staple shoppers).
2. **Impulsive Trendsetters:** Low Income, High Spending (Youthful, responsive to trends and discounts).
3. **Pragmatic Middle:** Moderate Income, Moderate Spending (Core broad-market shoppers).
4. **Affluent Savers:** High Income, Low Spending (High wealth potential, conservative spenders).
5. **VIP High-Rollers:** High Income, High Spending (Primary targets for luxury concierge programs).
