# DropSafe V1 — Frontend

## Overview

The DropSafe frontend is the web application used by authorized users to interact with the DropSafe Student Dropout Prediction & Counseling System.

The frontend provides the user interface for authentication, dashboards, student information, academic information, risk visualization, predictions, and intervention management.

The frontend communicates with the DropSafe backend through APIs.

---

## Owner

**Team:** Frontend  
**Branch:** `feature/frontend`

---

## Technology Stack

- React
- TypeScript
- Vite
- HTML5
- CSS3
- Axios
- React Router

Additional libraries may be added when required by the project.

---

## Responsibilities

The frontend is responsible for:

- Application UI
- Login and authentication screens
- Protected routes
- Dashboard
- Student list
- Student details
- Academic information
- Attendance information
- Assessment information
- Dropout-risk visualization
- Prediction results
- Intervention management
- Counseling information
- API communication
- Loading states
- Error handling
- Form validation
- Responsive UI

The frontend must not directly communicate with PostgreSQL.

```text
Frontend → Backend API → PostgreSQL
