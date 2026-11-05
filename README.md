# Candidate Communication Platform

A full-stack recruitment communication platform designed for talent acquisition teams to manage candidate pipelines, dispatch targeted WhatsApp notifications individually or in bulk, track live delivery status progressions, and handle message delivery retries.

> 📄 **Architecture & Interviewer Summary**: For a complete visual presentation, design trade-offs, and evaluation criteria, see [docs/Candidate_Communication_Platform_Summary.pdf](docs/Candidate_Communication_Platform_Summary.pdf).

---

## 1. System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                       Frontend (React)                      │
│   Candidate Management • Bulk Actions • Real-Time Badges    │
│            Communication History Drawer & Retries           │
└──────────────────────────────┬──────────────────────────────┘
                               │ HTTP / REST API (Axios)
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                 Backend (Django REST Framework)             │
│  Candidate API • Messaging Engine • Failure Classification  │
│          Status Synchronization • Webhook Listener          │
└──────────────┬───────────────────────────────┬──────────────┘
               │                               │
               ▼                               ▼
┌──────────────────────────────┐ ┌─────────────────────────────┐
│      Database (Storage)      │ │   External Gateway Provider │
│ Candidates • Messages • Logs │ │    Green API (WhatsApp Web) │
└──────────────────────────────┘ └─────────────────────────────┘
```

### Technology Stack
- **Backend**: Python 3.12+, Django 6.1+, Django REST Framework (DRF), Requests, Python-dotenv
- **Frontend**: React, Vite, Axios, Pure CSS design system (fully modular, responsive, no bloated UI kits)
- **Database**: PostgreSQL (Production) / SQLite3 (Development)
- **Communication Provider**: Green API (WhatsApp Gateway)

---

## 2. Key Features

- **Candidate Management**: Full CRUD operations with instant search, filtering, and responsive pagination.
- **Individual & Bulk Messaging**: Send personalized messages to single candidates or batch broadcast to multiple candidates simultaneously.
- **Real-Time Status Tracking**: Live tracking of WhatsApp message progression:
  - `Pending` &rarr; `Sent` (single checkmark) &rarr; `Delivered` (double checkmark) &rarr; `Read` (blue checkmark).
- **Smart Failure Classification**:
  - **Retryable Failures** (`Temporary Failure`): Network timeouts, rate limits, or gateway service drops can be retried up to 3 times with an attempt counter.
  - **Permanent Failures** (`Permanent Failure`): Invalid numbers, unregistered recipients, or exceeded attempts are locked to prevent repeated quota waste.
- **Provider Outage Alerts**: Direct visual warnings to recruiters if the communication gateway becomes unreachable.
- **Audit & History Drawer**: Comprehensive communication history for every candidate showing timestamps, message content, delivery receipts, and error logs.

---

## 3. Setup & Installation Instructions

### Prerequisites
- **Python**: Version 3.10 or higher
- **Node.js**: Version 18.0 or higher with npm
- **Git**

---

### Backend Setup

1. **Navigate to the backend directory**:
   ```bash
   cd backend
   ```

2. **Create and activate a virtual environment**:
   ```bash
   # Windows (PowerShell)
   python -m venv venv
   .\venv\Scripts\Activate.ps1

   # macOS / Linux
   python3 -m venv venv
   source venv/bin/activate
   ```

3. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

4. **Configure environment variables**:
   Create a `.env` file in the `backend/` directory based on `.env.example`:
   ```env
   SECRET_KEY=your_django_secret_key_here
   DEBUG=True

   # Green API WhatsApp Gateway
   GREEN_API_INSTANCE_ID=your_instance_id
   GREEN_API_TOKEN=your_api_token
   GREEN_API_HOST=https://api.green-api.com

   # Database Configuration (PostgreSQL or local DB)
   DB_NAME=candidate_communication_db
   DB_USER=postgres
   DB_PASSWORD=your_password
   DB_HOST=localhost
   DB_PORT=5432
   ```

5. **Run database migrations**:
   ```bash
   python manage.py migrate
   ```

6. **Start the backend server**:
   ```bash
   python manage.py runserver 8000
   ```
   Backend will be accessible at: `http://localhost:8000/`

---

### Frontend Setup

1. **Navigate to the frontend directory**:
   ```bash
   cd frontend
   ```

2. **Install Node dependencies**:
   ```bash
   npm install
   ```

3. **Start the Vite development server**:
   ```bash
   npm run dev
   ```
   Frontend will be accessible at: `http://localhost:5173/`

4. **Production Build** (optional):
   ```bash
   npm run build
   ```

---

## 4. Architecture Decisions

### 1. Decoupled Service Layer (`messaging/services.py`)
Message sending, provider communication, and status synchronization logic are separated into a dedicated service layer rather than being coupled inside API views. This adheres to Clean Architecture and makes future provider switches or multi-provider routing straightforward.

### 2. Status Progression Monotonicity
Message status follows a strict priority hierarchy:
$$\text{Pending (0)} < \text{Sent (1)} < \text{Delivered (2)} < \text{Read (3)}$$
Status updates are strictly monotonic—a webhook or sync operation can never downgrade a `read` message back to `delivered` or `sent`.

### 3. Separation of Concerns in UI (`Candidate.jsx` & `Candidate.css`)
All styling is extracted into a dedicated, clean stylesheet (`Candidate.css`), keeping `Candidate.jsx` focused strictly on component state, API interactions, and business logic. No external CSS-in-JS runtime or styling framework dependencies are required.

### 4. Resilient Synchronization Strategy
To keep delivery statuses accurate without depending solely on webhooks:
- **Active Polling Sync**: Statuses update automatically when fetching candidate lists and history drawers.
- **Provider Queue Draining**: Background draining of provider notification queues with immediate deletion of processed receipt IDs to prevent queue bottlenecks.
- **Idempotent Webhooks**: Handled via `WebhookEvent` unique constraint tables to ignore duplicate deliveries safely.

### 5. Credential & Data Sanitization
Raw network exceptions from third-party APIs often contain secret tokens inside endpoint URLs. The backend interceptor sanitizes all error messages, ensuring that external URLs and API keys are never stored in the database or exposed to the client UI.

---

## 5. Assumptions Made

1. **Phone Number Formatting**:
   Recipient phone numbers entered with 10 digits are assumed to belong to the Indian telecom numbering plan and are automatically normalized with country code `91` (`91XXXXXXXXXX@c.us`) for WhatsApp compatibility. International numbers with explicit country codes are respected.

2. **Single Primary WhatsApp Instance**:
   The current implementation routes WhatsApp outbound messaging through a designated Green API instance. Free developer accounts on Green API are restricted to communicating with up to 3 registered test numbers per month; production instances remove this restriction.

3. **Status Derivation**:
   A candidate's current status badge in the main table reflects the status of their latest outbound communication.

4. **WhatsApp Read Receipts**:
   The transition from `delivered` (double checkmark) to `read` (blue checkmark) depends on whether the recipient has read receipts enabled in their WhatsApp client privacy settings.

5. **Safe Retry Threshold**:
   Failed messages can be retried up to 3 times before being automatically converted into permanent failures to prevent infinite retry loops and runaway API costs.
