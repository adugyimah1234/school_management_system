# Nwoma Backend API

Professional SaaS School Management System Backend. This application is built with Node.js, MySQL, and Redis, following industry-standard architectural patterns.

## 🚀 Quick Start Setup

### 1. Prerequisites
- **Node.js**: v18 or higher
- **MySQL**: v8.0 or higher
- **Docker Desktop**: For running Redis (standard for SaaS session management)

### 2. Environment Configuration
Create a `.env` file in the root directory and configure the following variables:
```env
# Database Configuration
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=school_db_saas
DB_PORT=3306

# Security
JWT_SECRET=your_ultra_secure_long_random_string
JWT_EXPIRES_IN=1d

# Redis (Session & Logout Management)
REDIS_URL=redis://localhost:6379

# Server
SERVER_PORT=5000
NODE_ENV=development
```

### 3. Redis Setup (Docker)
This backend uses Redis for professional features like **Persistent Logout** (token blacklisting) and **Smart Rate Limiting**.

To start Redis locally using Docker, run:
```bash
docker run --name nwoma-redis -p 6379:6379 -d redis
```

*Note: If you are setting up on a new machine and get an "authentication required" error from Docker, run `docker login` first.*

### 4. Database Setup
1. Create the database in MySQL: `CREATE DATABASE school_db_saas;`
2. Run the migration script to set up the professional UUID-based schema:
   ```bash
   node scripts/migrate_to_saas_uuid.js
   ```
3. (Optional) Run the audit logs setup:
   ```bash
   node scripts/setup_audit_logs.js
   ```

### 5. Running the Application
```bash
npm install
npm run dev
```
The server will start on `http://localhost:5000`.

---

## 📖 API Documentation (Swagger)
The project includes automated documentation. Once the server is running, visit:
`http://localhost:5000/api-docs`

Use this interactive UI to:
- Explore all available endpoints.
- View required request bodies and response schemas.
- Test API calls directly from your browser.

---

## 🧪 Verification & Testing
We have provided three professional test scripts to verify the system integrity on a new machine:

1. **Registrations Test**: `node scripts/test_registration.js`
2. **Students Test**: `node scripts/test_students.js`
3. **Financials Test**: `node scripts/test_financials.js`

---

## 🛠 Architectural Highlights
- **Service Layer Pattern**: Business logic is separated from controllers for reusability and testability.
- **Global Error Handler**: Prevents database leakage and ensures consistent JSON error responses.
- **Winston Logging**: Structured logging with severity levels stored in `logs/`.
- **Smart Rate Limiting**: Intelligent limiting that whitelists office IPs while protecting against bot attacks.
- **Audit Trails**: Automatic logging of all sensitive database modifications for accountability.
