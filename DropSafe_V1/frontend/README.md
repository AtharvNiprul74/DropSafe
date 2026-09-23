# DropSafe V1 — Backend

## Overview

The DropSafe backend is the central application server responsible for business logic, authentication, database access, APIs, and communication between the frontend, ML service, and chatbot/counseling modules.

The backend is implemented as a modular monolith for V1.

## Owner

**Team Member:** Om Sutar  
**Branch:** `feature/backend`

## Technology Stack

- Node.js
- Express.js
- TypeScript
- PostgreSQL
- Prisma ORM
- JWT Authentication
- Zod
- CORS
- Helmet

## Responsibilities

The backend handles:

- Authentication
- JWT-based authorization
- Role-based access control
- Organization management
- User management
- Student management
- Academic data
- Attendance records
- Assessment records
- Student risk data
- Prediction API integration
- Intervention management
- Counseling session APIs
- Database operations
- API validation
- Backend integration between modules
- Audit and access logging

## Architecture

```text
Frontend
   |
   v
Express API
   |
   +--> Authentication
   |
   +--> Controllers
   |
   +--> Services
   |
   +--> Prisma
   |
   v
PostgreSQL

Express API
   |
   +--> ML Service
   |
   +--> Chatbot Service
   |
   +--> Intervention/Counseling
