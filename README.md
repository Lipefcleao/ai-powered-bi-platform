# 📊 AI-Powered BI & Analytics Platform

[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-5.x-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-339933?logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-4.x-000000?logo=express&logoColor=white)](https://expressjs.com/)
[![MySQL](https://img.shields.io/badge/MySQL-8.0-4479A1?logo=mysql&logoColor=white)](https://www.mysql.com/)
[![Google Gemini AI](https://img.shields.io/badge/AI-Google_Gemini-4285F4?logo=googlegemini&logoColor=white)](https://ai.google.dev/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

An enterprise-grade **Business Intelligence (BI) and Data Analytics Platform powered by Conversational AI (Text-to-SQL)**. The system enables executives, project managers, and financial analysts to explore complex operational metrics, visualize interactive dashboards, and execute natural language queries over relational enterprise databases.

---

## 📸 System Showcase & Visual Interface

### 1. Main BI Dashboard & Analytical Playground
![Financial and Project Dashboard Overview](docs/screenshots/dashboard-overview.png)
*Consolidated view of financial Key Performance Indicators (KPIs), project tracking, and resource utilization metrics.*

---

### 2. Conversational AI Assistant (Text-to-SQL Engine)
![AI Conversational Chat](docs/screenshots/ai-chat-text-to-sql.png)
*Natural language querying translated into structured analytical responses, dynamic SQL generation, and instant dashboard creation.*

---

### 3. Productivity & Resource Allocation Tracking
![Hours Allocation Report](docs/screenshots/hours-utilization.png)
*Granular tracking of estimated vs. reported effort across project tasks, delivery milestones, and team members.*

---

### 4. Pre-built Domain Analytics Dashboards
![Pre-built Analytics Dashboards](docs/screenshots/prebuilt-dashboards.png)
*Pre-configured domain-specific analytical modules providing instant reporting for key operational areas, including Hours Allocation (Estimated vs. Actual), Financial Margins, Sales Pipelines, and Supplier Expenditure.*

---

### 5. Enterprise Admin Dashboard & Token Cache Telemetry
![Admin Dashboard and Resource Monitoring](docs/screenshots/admin-dashboard.png)
*Real-time administrative telemetry monitoring system costs, request audits, and **LLM Token Caching**. Context Caching reuses pre-tokenized database schema metadata (DDL) and prompt context across queries, reducing response latency by up to 80% and drastically minimizing API token costs.*

---

## ✨ Key Capabilities

- 💬 **Text-to-SQL RAG Virtual Assistant**: Query enterprise data in natural language (e.g., *"What is the financial result, revenue, and profit margin for each project in 2024?"*) to receive instant analytical summaries generated via Large Language Models (Google Gemini).
- 📈 **Financial & Project Dashboards**:
  - **Financial Results**: Accrual balance, executed cash flow, revenues, and detailed OpEx.
  - **Profitability & Margins**: Net profit margin per project and real-time accounts receivable tracking.
  - **Hours Allocation**: Estimated vs. reported time per task, stage, and collaborator.
  - **Personnel Expenditure**: Hourly rate breakdown, base salary, payroll taxes, and total burden costs.
  - **Task Productivity**: Schedule variance tracking and operational efficiency rates.
- ⚡ **LLM Context Caching Engine**: Automatic caching of database schema definitions (DDL) and system prompts, reducing token consumption costs and delivering sub-second response times.
- 🎭 **Standalone Demonstration Engine**: Built-in synthetic data fallback allowing zero-config deployment and demonstration without external database dependencies.
- 🛡️ **Enterprise Security & Data Governance**:
  - Strict dynamic SQL sanitization engine preventing SQL Injection attacks.
  - Fail-closed security policies blocking unauthorized access to sensitive columns (e.g., passwords or confidential salary details).

---

## 🏗️ Architecture Overview

```mermaid
graph TD
    User([👤 Executive / Manager]) <--> |Reactive Interface| ReactApp[📱 Frontend: React 18 + Recharts]
    ReactApp <--> |REST API / JSON| ExpressServer[⚙️ Backend: Node.js + Express]
    
    subgraph Core Backend & Security
        ExpressServer --> Auth[🔐 Auth & Context Middleware]
        ExpressServer --> PolicyEngine[🛡️ Query Policy & Sanitizer]
        PolicyEngine --> RAGService[🤖 Text-to-SQL RAG Engine]
        RAGService --> TokenCache[⚡ Token Cache Manager]
    end
    
    TokenCache <--> |Cached Schema Context| GeminiAPI[☁️ Google Gemini AI API]
    
    subgraph Data Layer
        ExpressServer --> |Production Mode| MySQLDB[(🗄️ MySQL Database)]
        ExpressServer --> |Demo Mode| SyntheticData[(📁 Synthetic Data Resolver)]
    end
```

---

## 🛠️ Technology Stack

* **Frontend Framework:** React 18, Vite, Recharts (charting engine), Lucide React (icons), Tailwind CSS.
* **Backend Infrastructure:** Node.js, Express, MySQL2 driver, Dotenv environment configuration.
* **Artificial Intelligence & LLM:** Google Gemini AI SDK, Prompt Engineering with Token Caching for optimized Text-to-SQL translation.
* **Governance & Tooling:** Concurrently, ESLint, Fail-Closed Security Policy Engine.

---

## 🛡️ Security & Data Privacy

This platform adheres to enterprise information security standards:
- **Zero Secrets in Repository:** Strict exclusion of hardcoded credentials, master passwords, or API keys.
- **Data Anonymization:** Synthetic demonstration modes utilize anonymized sample datasets with dummy corporate entities (*Acme Corp*, *Globex*, *Stark Industries*).

---

## 📄 License

This project is licensed under the MIT License. See the `LICENSE` file for details.
