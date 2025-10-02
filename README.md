# 📧 ESP Integration Backend (Mailchimp & GetResponse)

A **NestJS + Prisma + PostgreSQL** REST API for integrating with **Mailchimp** and **GetResponse**.  
This backend allows storing and validating ESP (Email Service Provider) API keys and retrieving audience/lists data.

---

## ✨ Features

- **Integration Endpoints**
  - `POST /api/integrations/esp` → Store and validate Mailchimp or GetResponse API key.
  - Automatically verifies connection against Mailchimp/GetResponse APIs.
- **Data Retrieval Endpoints**
  - `GET /api/integrations/esp/lists` → Fetch all lists/segments from connected account.
- **Error Handling**
  - Graceful error responses for invalid credentials, rate limits, and network failures.
- **Persistence**
  - API keys stored securely using **Prisma ORM** with **PostgreSQL**.

---

## ⚙️ Requirements

- Node.js **v18+**
- PostgreSQL database
- npm or yarn package manager
- Mailchimp & GetResponse API keys (for testing)

---

## 🚀 Quickstart (Local Setup)

### 1. Clone the repository

```bash
git clone <your-repo-url>
cd esp-integration
2. Install dependencies
bash
Copy code
npm install
# or
yarn install
3. Setup environment variables
Create a .env file in the root directory and add:

env
Copy code
DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/esp_integration"
MAILCHIMP_API_KEY="your-mailchimp-api-key"
GETRESPONSE_API_KEY="your-getresponse-api-key"
⚠️ Replace values with your actual PostgreSQL credentials and API keys.

4. Run database migrations
bash
Copy code
npx prisma migrate dev
5. Start the server
bash
Copy code
npm run start:dev
API will be running at:
👉 http://localhost:3000/api

📡 API Endpoints
Store & Validate ESP Key
http
Copy code
POST /api/integrations/esp
Body Example:

json
Copy code
{
  "provider": "mailchimp",
  "apiKey": "your-api-key"
}
Fetch Lists
http
Copy code
GET /api/integrations/esp/lists
🛠 Tech Stack
NestJS – Progressive Node.js framework

Prisma ORM – Database ORM for PostgreSQL

PostgreSQL – Relational database

Axios – HTTP client for API calls

Dotenv – Environment variable management

🧪 Testing
bash
Copy code
# Run unit tests
npm run test

# Run e2e tests
npm run test:e2e
📂 Project Structure
bash
Copy code
esp-integration/
│── prisma/            # Prisma schema & migrations
│── src/
│   ├── integrations/  # ESP integration module
│   ├── app.module.ts
│   └── main.ts
│── .env               # Environment variables
│── README.md          # Project documentation
│── package.json
📜 License
MIT License © 2025
```
