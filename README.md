# Operations Performance Dashboard: full-stack practice project

A runnable teaching example demonstrating **Python data preparation → SQLite/SQL → Java Spring Boot REST APIs → React/TypeScript dashboard**. All data are synthetic. This is NOT a reproduction of proprietary employer code or a claim about work completed at a previous company.

## What you'll build
- A Python ETL script that checks and loads request records into SQLite.
- SQL queries that aggregate totals, completed requests, completion rate, average effort and weekly/category trends.
- Spring Boot aggregate endpoints returning JSON: `/api/summary`, `/api/by-category`, `/api/by-week`.
- A React + TypeScript dashboard showing KPI cards and two charts.
- A Spring Boot controller test and a repository SQL integration test.

## Prerequisites
- Java 21, Maven 3.9+ (available at https://maven.apache.org/install.html)
- Python 3.9+
- Node.js 20.19+ or 22.12+

## Step 1: prepare database
Run from the project root:

```bash
python3 etl/load_data.py
```

This reads `data/requests.csv`, validates records and creates `data/dashboard.db`. Rerunning it refreshes the table from the CSV.

## Step 2: test the Java API
Open another terminal:

```bash
cd backend
mvn test
mvn spring-boot:run
```

From another terminal:

```bash
curl http://localhost:8080/api/summary
curl http://localhost:8080/api/by-category
curl http://localhost:8080/api/by-week
```

Expected summary with supplied example rows: a JSON response containing `total`, `completed`, `completionRate`, `averageHours`.

## Step 3: start the frontend
In another terminal:

```bash
cd frontend
npm install
npm run dev
```

Visit the local URL printed by Vite (usually http://localhost:5173). Vite forwards `/api` requests to the Java server on `localhost:8080`.

## Review a reporting week

Choose **2026-10-19**. The sample contains five requests, three completed and two open. The previous calendar week has four completed out of five, so completion is down 20 percentage points. Click **Open requests** to inspect requests #12 and #14. The cards, chart, category breakdown, and links use the selected reporting week. **All weeks** restores the full dataset.

Use **Copy weekly brief** for a handover with the counts, comparison and links to the records. Open category links retain the week, status and category in the URL. Links use the current dashboard host. A localhost link requires the recipient to run Relay with the same data. Relay measures the current status of requests grouped by their reporting week. Historical backlog would require status history.

**Optional AI summary:** With Ollama running and a model installed, start the backend with `RELAY_OLLAMA_MODEL=qwen2.5:7b mvn spring-boot:run`. Select a week and click **Draft management summary**. Review the editable draft against the figures before copying. The backend sends weekly aggregates to Ollama on loopback. The standard brief works without a model.

Request detail API: `GET /api/requests?week=2026-10-19&status=Open&category=Reporting`. Each filter is optional. Summary and category endpoints also accept an optional ISO reporting week.

## Troubleshooting
- `mvn: command not found`: install Maven; Maven is separate from Java.
- `SQLITE_ERROR no such table`: run the ETL from the project root, then start Spring Boot from `backend/`.
- `Connection refused` on frontend: run Spring Boot first on port 8080.
- Browser charts show no data: verify `curl http://localhost:8080/api/summary` and the database path.
- Using a different working directory for Spring Boot: set `DASHBOARD_DB_PATH` to an absolute path to `data/dashboard.db` before running Maven.
- To refresh data, edit `data/requests.csv`, run the Python ETL again, and refresh the browser.

## Architecture
CSV --(Python validation and loading)--> SQLite database --(SQL/JDBC)--> Spring Boot REST API --(HTTP/JSON)--> React/TypeScript + Recharts.

## Explain it in an interview
> I built a small operations dashboard. Python validates and loads raw records into SQLite. Java Spring Boot uses SQL to aggregate KPIs and exposes typed JSON through REST endpoints. React and TypeScript fetch those endpoints and visualize the results. I added unit-style controller checks plus a real SQL repository integration test to catch regressions.

## Suggested extensions
1. Track status changes over time to support historical backlog reporting.
2. Add automated validation tests for malformed CSV files.
3. Migrate SQLite to PostgreSQL, add secrets via environment variables, and deploy the app.
4. Add authentication and authorization for real customer data.
5. Add a scheduled ETL task and record refresh dates in the UI.
