# RetailSQL — Retail Sales SQL Explorer

A full-stack web application for exploring and analysing retail sales data through an interactive SQL interface, built as part of the **Virtusa SQL Project**.

## Features

- **Live Dashboard** — KPI cards (revenue, transactions, customers, products), top products/stores/customers tables, and a monthly revenue bar chart — all driven by live SQL queries.
- **SQL Explorer** — Write and execute any SQL query against the retail SQLite database with instant tabular results, row count, and execution time.
- **Schema Viewer** — Visual overview of all four database tables with column types, keys, and an ER diagram.
- **SQL Tutorials** — 9 guided examples from basic SELECT to advanced window functions, each runnable with one click.
- **Reset DB** — Restore the database to the original seed data at any time.

## Tech Stack

| Layer    | Technology          |
|----------|---------------------|
| Backend  | Python 3 + Flask    |
| Database | SQLite 3            |
| Frontend | HTML5, CSS3, Vanilla JS |
| Fonts    | Inter + JetBrains Mono (Google Fonts) |

## Database Schema

```
stores       (store_id PK, location, manager_name)
customers    (customer_id PK, first_name, last_name, email, join_date)
products     (product_id PK, product_name, category, price, stock_quantity)
transactions (transaction_id PK, customer_id FK, store_id FK, product_id FK, quantity, transaction_date)
```

## Getting Started

### Prerequisites
- Python 3.8+
- pip

### Installation & Run

```bash
# 1. Clone the repo
git clone https://github.com/jaiviswesh/virtusa_sqlproj.git
cd virtusa_sqlproj

# 2. Install dependencies
pip install -r requirements.txt

# 3. Start the server
python server.py
```

Then open **http://localhost:3000** in your browser.

The database is automatically created and seeded on first run.

## Project Structure

```
RetailSalesProject/
├── server.py               # Flask backend & API routes
├── requirements.txt        # Python dependencies
├── database/
│   ├── schema.sql          # Table definitions
│   └── seed.sql            # Sample retail data (50 transactions)
└── public/
    ├── index.html          # Single-page app shell
    ├── style.css           # Dark-mode design system
    └── app.js              # Dashboard, SQL runner, tab logic
```

## API Endpoints

| Method | Endpoint      | Description                        |
|--------|---------------|------------------------------------|
| POST   | `/api/query`  | Execute a SQL query                |
| POST   | `/api/reset`  | Reset DB to original seed data     |

## Sample Queries

```sql
-- Total revenue per store
SELECT s.location, ROUND(SUM(t.quantity * p.price), 2) AS revenue
FROM transactions t
JOIN stores s ON t.store_id = s.store_id
JOIN products p ON t.product_id = p.product_id
GROUP BY s.store_id ORDER BY revenue DESC;

-- Monthly trend
SELECT strftime('%Y-%m', transaction_date) AS month,
       ROUND(SUM(t.quantity * p.price), 2) AS revenue
FROM transactions t
JOIN products p ON t.product_id = p.product_id
GROUP BY month ORDER BY month;
```

---

> Built for Virtusa SQL Project | Retail Sales Analytics
