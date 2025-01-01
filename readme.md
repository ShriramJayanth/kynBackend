# Backend Service Documentation

This document serves as a guide to understanding, using, and deploying the backend service for your application.

---

## Overview

This backend service provides routes to handle user activity logs and moderates text. It is built with Node.js and utilizes PostgreSQL as the database. The service is designed for seamless integration with frontend applications.

---

## Features

- Fetch user activity logs
- Moderate text
- JSON-based REST API endpoints
- PostgreSQL database integration

---

## Prerequisites

1. Node.js (v18 or later)
2. PostgreSQL (v14 or later)
3. npm or yarn (for dependency management)

---

## Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd <repository-folder>
   ```

2. Install dependencies:
   ```bash
   npm install
   # or
   yarn install
   ```

3. Set up the `.env` file:
   Create a `.env` file in the root directory with the following variables:
   ```env
   PORT=3003
   DATABASE_URL=postgresql://<username>:<password>@<host>:<port>/<database>?schema=public
   ```

4. Run database migrations:
   ```bash
   npx prisma migrate dev --name init
   ```

---

## Running the Service

### Locally

1. Start the server:
   ```bash
   npm run dev
   ```

2. Access the server at `http://localhost:3003`.

### Using PM2

1. Install PM2 globally if not already installed:
   ```bash
   npm install -g pm2
   ```

2. Start the server using PM2:
   ```bash
   pm2 start npm --name "backend-service" -- run dev
   ```

3. Check the status of the service:
   ```bash
   pm2 status
   ```

---

## Deployment

### On EC2

1. SSH into the EC2 instance.
2. Install Node.js and PostgreSQL if not already installed.
3. Follow the "Installation" and "Running the Service" steps above.

---

## API Endpoints

### Base URL

- Local: `http://localhost:3003`
- Cloud: `http://<host>:3003`

### Endpoints

#### Logs

1. **Fetch All Logs**
   ```
   GET /logs
   ```
   Response:
   ```json
   [
     {
       "id": 1,
       "userId": "user123",
       "activity": "Logged in",
       "timestamp": "2025-01-01T12:00:00Z"
     }
   ]
   ```

2. **Add a Log**
   ```
   POST /logs
   ```
   Request Body:
   ```json
   {
     "userId": "user123",
     "activity": "user flagged for inappropriate content"
   }
   ```
   Response:
   ```json
   {
     "message": "Log added successfully."
   }
   ```

#### Text Moderation

1. **Moderate Text**
   ```
   POST /moderate
   ```
   Request Body:
   ```json
   {
     "text": "This is a test message."
   }
   ```
   Response:
   ```json
   {
     "flagged": true,
     "reason": "no harm"
   }
   ```

---

## Environment Variables

| Variable        | Description                     |
|-----------------|---------------------------------|
| `PORT`          | Port on which the server runs.  |
| `DATABASE_URL`  | Connection string for PostgreSQL. |

---

## Troubleshooting

1. **Server not starting?**
   - Check if `.env` is correctly configured.
   - Ensure PostgreSQL is running and accessible.

2. **Database connection issues?**
   - Verify the `DATABASE_URL` in `.env`.
   - Check network/firewall settings if hosted on a remote server.

---

## Contributing

1. Fork the repository.
2. Create a new branch:
   ```bash
   git checkout -b feature-name
   ```
3. Make your changes and commit them:
   ```bash
   git commit -m "Add a new feature"
   ```
4. Push to your branch:
   ```bash
   git push origin feature-name
   ```
5. Open a pull request on GitHub.

---

## License

This project is yet to be licensed

