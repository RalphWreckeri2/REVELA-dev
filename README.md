# REVELA — Development Repository
### A Geospatial Business Intelligence System for Compliance Monitoring and Non-Registered Business Detection
**Batangas State University — The National Engineering University, Lipa Campus**
College of Informatics and Computing Sciences

> Anoya, R. F. · Levita, R. A. · Samonte, R. M. A. | BSIT Capstone | 2026

---

## What is REVELA?

REVELA is a geospatial Business Intelligence system developed for the Business Permits and Licensing Office (BPLO) of the Municipality of Mataasnakahoy, Batangas. It cross-references public Google Maps data against the official municipal business registry to automatically detect unregistered commercial establishments, generate compliance intelligence reports, and optimize the deployment of field inspectors through data-driven prioritization.

The system produces three tiers of Business Intelligence output:
- **Descriptive Analytics** — real-time compliance monitoring dashboard
- **Diagnostic Analytics** — DBSCAN-powered Barangay Risk Heatmap
- **Prescriptive Analytics** — Weighted Linear Combination (WLC) Operational Priority Score (OPS) for inspector dispatch

---

## Repository Structure

```
revela-backend/          ← Flask REST API + Analytics Engine
revela-web/              ← React.js Admin Web Dashboard
revela-mobile/           ← Flutter Field Inspection Mobile App
```

> This is the **development repository**. It contains all source code, migration scripts, and tooling for local development. See the [Production README](./README-production.md) for deployment instructions.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend API | Python 3.13.3 + Flask |
| Web Frontend | React.js (Glassmorphism UI) |
| Mobile App | Flutter (Android 10.0+) |
| Database | MySQL 8.x |
| Spatial Analytics | scikit-learn (DBSCAN), geopy, shapely, scipy |
| Data Processing | pandas, numpy |
| Authentication | JWT (flask-jwt-extended) + OTP via SMS/Email Gateway |
| Mapping | Google Maps Platform API (Places, Geocoding, Maps JS, Maps SDK Android) |
| ORM / DB Driver | PyMySQL |

---

## Prerequisites

Make sure you have all of the following installed before proceeding:

- **Python 3.13.3** — [python.org](https://www.python.org/downloads/)
- **Node.js 20 LTS** — [nodejs.org](https://nodejs.org/)
- **Flutter SDK (stable)** — [flutter.dev](https://flutter.dev/docs/get-started/install)
- **Android Studio** + Android SDK Platform 33+
- **MySQL 8.x** — [dev.mysql.com](https://dev.mysql.com/downloads/)
- **Git** — [git-scm.com](https://git-scm.com/)
- **VS Code** (recommended) with extensions: Python, Flutter, MySQL (by cweijan)

---

## Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/YOUR_USERNAME/revela-backend.git
cd revela-backend
```

### 2. Create and activate the virtual environment

```bash
# Create
python -m venv venv

# Activate — Windows Command Prompt
venv\Scripts\activate

# Activate — Windows PowerShell
venv\Scripts\Activate.ps1
```

> Your terminal prompt should now show `(venv)` at the start. If PowerShell blocks activation, run `Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser` once as Administrator.

### 3. Install all Python dependencies

```bash
pip install -r requirements.txt
```

> If you install a new package, always run `pip freeze > requirements.txt` afterward and commit the updated file.

### 4. Set up your environment variables

```bash
# Windows
copy .env.example .env
```

Open `.env` and fill in your values:

```env
FLASK_APP=app.py
FLASK_ENV=development
FLASK_DEBUG=1

DB_HOST=localhost
DB_PORT=3306
DB_NAME=revela_db
DB_USER=revela_user
DB_PASSWORD=your_mysql_password_here

JWT_SECRET_KEY=generate_with_command_below

GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here

SMS_GATEWAY_API_KEY=your_gateway_key_here
SMS_GATEWAY_SENDER=REVELA
```

**Generate a secure JWT secret key:**
```bash
python -c "import secrets; print(secrets.token_hex(32))"
```

> ⚠️ Never commit `.env` to Git. It is already listed in `.gitignore`.

### 5. Set up the MySQL database

Open MySQL Workbench or the VS Code MySQL extension and run the following in order:

```sql
CREATE DATABASE revela_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

```sql
CREATE USER 'revela_user'@'localhost' IDENTIFIED BY 'your_mysql_password_here';
```

```sql
GRANT ALL PRIVILEGES ON revela_db.* TO 'revela_user'@'localhost';
FLUSH PRIVILEGES;
```

Then run migration scripts in this order (foreign key dependency order):

```
1. BARANGAYS
2. USERS
3. USER_PASSWORD_RESETS     (references USERS)
4. OFFICIAL_REGISTRY        (references BARANGAYS)
5. GEOSPATIAL_LOGS          (references BARANGAYS + OFFICIAL_REGISTRY)
6. INSPECTION_REPORTS       (references GEOSPATIAL_LOGS + USERS)
```

### 6. Run the Flask development server

```bash
flask run
```

Verify the backend and database are connected by visiting:

```
http://127.0.0.1:5000/ping
```

Expected response:
```json
{ "status": "ok", "db": "connected" }
```

---

## Testing Dataset

REVELA uses the official 740-business BPLO registry of Mataasnakahoy as its dataset, split as follows for the flagging engine evaluation:

| Partition | Records | Purpose |
|-----------|---------|---------|
| Training (70%) | 518 | Seeded into DB as Green Flags (baseline) |
| Test (30%) | 222 | Withheld, re-introduced as simulated Red Flag inputs |

Pre-split CSV files are located in `/data/`. Do not modify these files — they are fixed for reproducibility of the 70/30 Controlled Functional Verification test.

---

## Evaluation Metrics

| Component | Metric |
|-----------|--------|
| Flagging Engine | Precision, Recall, F1-Score, Accuracy (≥ 85% benchmark) |
| DBSCAN Heatmap | Silhouette Score |
| WLC / OPS Model | AHP Consistency Ratio + Sensitivity Analysis |
| Geospatial Accuracy | Mean Positional Error (MPE ≤ 15m), False Negative Rate (FNR) |
| System Responsiveness | API response < 3s, map render < 5s, mobile sync < 2s |
| Usability | ISO/IEC 25010 (5-point Likert Scale) |

---

## Day-to-Day Git Workflow

```bash
# Before starting work — always pull first
git pull origin main

# After making changes
git add .
git commit -m "descriptive message of what you changed"
git push origin main

# After installing a new package
pip freeze > requirements.txt
git add requirements.txt
git commit -m "update requirements.txt"
git push origin main
```

> ⚠️ Never commit directly to `main` for team features. Create a feature branch: `git checkout -b feature/your-feature-name`

---

## Common Errors

| Error | Cause | Fix |
|-------|-------|-----|
| `python: command not recognized` | Python not on PATH | Re-run Python installer, check "Add to PATH" |
| `Access denied for user 'revela_user'` | Password mismatch between `.env` and MySQL | Run `ALTER USER 'revela_user'@'localhost' IDENTIFIED BY 'newpass';` then update `.env` |
| `ModuleNotFoundError` | venv not activated or pip install incomplete | Activate venv, run `pip install -r requirements.txt` again |
| PowerShell execution error | Script execution policy | Run `Set-ExecutionPolicy RemoteSigned -Scope CurrentUser` as Admin |
| `Can't connect to MySQL server` | MySQL service not running | Win+R → `services.msc` → start MySQL80 |

---

## Team

| Name | Role |
|------|------|
| Anoya, R. F. | Frontend / API Integration |
| Levita, R. A. | Database / Mobile |
| Samonte, R. M. A. | Backend / Analytics Engine |

**Thesis Adviser:** Dr. Francis Gutierrez Balazon
**Institution:** Batangas State University — The National Engineering University, Lipa Campus
**Program:** Bachelor of Science in Information Technology
