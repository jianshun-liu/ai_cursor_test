# On-Demand Market Data Snapshot Tool

## 1. Background & Problem Statement

In capital markets applications (e.g. stress testing, pricing engines), calculations depend on **dynamic market data** stored in SQL Server. During investigations or defect replication, Business Analysts (BA) need the ability to:

* Capture a **static snapshot** of market data for a given *effective date*
* Re-run pricing or stress scenarios repeatedly against the same data
* Ensure results are reproducible and auditable

The requirement is to build an **on-demand snapshot tool** that copies large volumes of data from **SQL Server** into **Snowflake backup tables**.

Key constraints:

* The tool is **not scheduled daily**; it must be triggered manually
* Some tables are extremely large (multi‑million rows, 400+ columns)
* Performance, scalability, and governance are critical

Available technologies:

* Java, Python
* AWS (S3, Kubernetes)
* Snowflake
* SQL Server
* Potentially `bcp` (but not guaranteed in containers)

---

## 2. Core Non‑Negotiable Requirements (Industry Reality)

From capital‑markets / tier‑1 bank experience:

1. **BA laptops must not**

    * Pull massive datasets over VPN
    * Store or manage production DB credentials
    * Be responsible for retries or performance

2. **Snapshot executions must be**

    * Server‑side
    * Auditable (who, when, effective date, tables)
    * Reproducible and restart‑safe

3. **Performance must scale**

    * Parallel extraction
    * Minimal data movement through application memory
    * Optimized Snowflake loads

Any design violating these points will likely fail security, risk, or ops reviews.

---

## 3. How Should BA Run the Tool?

### ❌ Option A: BA runs tool locally (Java / Python / Docker)

**Model**

* BA installs Docker/Podman
* Tool runs on laptop and connects to SQL Server and Snowflake

**Why this fails in practice**

* VPN throughput bottleneck
* Laptop instability during long runs
* Credential leakage risk
* No centralized logging or audit
* No scalability

**Industry verdict**: ❌ Not accepted beyond small POCs

---

### ✅ Option B: BA triggers a REST API (FastAPI / Spring Boot) on Kubernetes

**Model**

* BA triggers snapshot via browser or REST call
* API launches a **server‑side batch job**

**Pros**

* Centralized credentials
* Server‑side performance
* Auditable and repeatable
* Scales with Kubernetes

**Verdict**: ✅ Common and accepted pattern

---

### ⭐⭐⭐ Option C: BA triggers a workflow (Airflow / Argo / Step Functions)

**Model**

* BA uses UI or internal portal
* Workflow orchestrates:

    1. Extract from SQL Server
    2. Stage files to S3
    3. Load to Snowflake
    4. Validate row counts
    5. Record snapshot metadata

**Pros**

* Retry, resume, lineage
* Clear audit trail
* Scales to very large tables

**Verdict**: ✅ Best practice in the industry

---

## 4. High‑Level Reference Architecture

```
[ BA Browser / UI ]
        |
        v
[ Snapshot API ]
(FastAPI / Spring Boot)
        |
        v
[ Workflow Orchestrator ]
(Argo / Airflow / Step Functions)
        |
        +--> SQL Server (Extract)
        |
        +--> S3 (Stage files)
        |
        +--> Snowflake COPY INTO
        |
        +--> Audit / Metadata Tables
```

---

## 5. Performance Principles (Critical)

### Avoid

* Row‑by‑row inserts
* JDBC batch inserts directly into Snowflake for huge tables
* Loading full tables into application memory

### Preferred pattern

1. **Extract** in parallel
2. **Stage** files in S3 (CSV or Parquet)
3. **Load** using Snowflake `COPY INTO`
4. **Partition** by effective date (and optionally hash)

This yields orders‑of‑magnitude performance improvement.

---

## 6. If `bcp` Is NOT Available in Kubernetes

This is common in Linux‑only, security‑restricted environments.

### Option 1 ⭐⭐⭐⭐⭐: Spark → Parquet → S3 → Snowflake (Best Replacement)

**How it works**

* Use Spark JDBC connector to read SQL Server
* Partition reads for parallelism
* Write Parquet files to S3
* Load via Snowflake `COPY INTO`

**Why this is preferred**

* Handles very wide and very large tables
* Columnar format = faster & smaller
* No SQL Server native tools required

**Verdict**: 🥇 Best alternative to `bcp`

---

### Option 2 ⭐⭐⭐: Python + Pandas / PyArrow (Chunked)

**When acceptable**

* Medium‑large tables
* Or large tables with clean partitioning

**Rules**

* Never load full tables into memory
* Always stream in chunks
* Write to Parquet or CSV incrementally

**Pros**

* Simple
* Container‑friendly

**Cons**

* Slower than Spark or bcp
* Memory tuning required

**Verdict**: 🥈 Acceptable fallback

---

### Option 3 ⭐⭐⭐⭐: SQL Server Push (SSIS / SQL Agent)

**Model**

* SQL Server exports data directly to S3
* Snowflake loads from S3

**Pros**

* Extraction stays close to data

**Cons**

* Requires SQL Server team coordination
* Less flexible for ad‑hoc BA requests

---

### Option 4 ⭐⭐: Direct JDBC Inserts into Snowflake

**Why discouraged**

* Network chatty
* Poor Snowflake performance for wide tables

**Only acceptable for**

* Small reference tables

---

### Option 5 ⭐⭐⭐⭐: CDC / Change Tracking (Advanced)

* Capture deltas in SQL Server
* Reconstruct snapshots in Snowflake
* Common in mature risk platforms
* Higher implementation cost

---

## 7. Decision Matrix

| Option           | Huge Tables | Wide Tables | Ops Friendly | Industry Score |
| ---------------- | ----------- | ----------- | ------------ | -------------- |
| Spark → Parquet  | ✅           | ✅           | Medium       | ⭐⭐⭐⭐⭐          |
| Python chunked   | ⚠️          | ⚠️          | Easy         | ⭐⭐⭐            |
| SQL Server push  | ✅           | ✅           | Hard         | ⭐⭐⭐⭐           |
| JDBC → Snowflake | ❌           | ❌           | Easy         | ⭐⭐             |
| CDC-based        | ✅           | ✅           | Complex      | ⭐⭐⭐⭐           |

---

## 8. Final Recommendation

**Industry best practice**:

> BA triggers an on‑demand snapshot via browser or REST API, which launches a **server‑side batch workflow** (Kubernetes + S3 + Snowflake COPY). The extraction uses **Spark or bcp‑equivalent bulk export**, not local tools.

**Key points**:

* No BA‑side execution
* No direct large inserts into Snowflake
* Strong audit & reproducibility
* Designed for very large, wide tables

---

## 9. Architectural Guardrails

* API pods only **trigger jobs**, they do not move data
* Extraction jobs run with:

    * Resource limits
    * Retries
    * Idempotent snapshot IDs
* Maintain snapshot metadata table:

    * effective_date
    * snapshot_id
    * row counts
    * timestamps
    * triggered_by

---

This design aligns with common patterns used in large capital‑markets risk and pricing platforms.
