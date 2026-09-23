# DropSafe V1

AI-Powered Student Dropout Prediction & Counseling System.

DropSafe is a modular system designed to identify students who may be at risk of dropping out and support mentors through academic risk prediction, behavioral insights, counseling workflows, and intervention management.

---

## Project Objective

DropSafe aims to provide:

- Early identification of students at risk of dropping out
- Centralized student and academic data
- AI/ML-based dropout risk prediction
- Behavioral and engagement analysis
- Student counseling support
- WhatsApp-based chatbot interaction
- Mentor intervention management
- Role-based access to student information

---

# Architecture

DropSafe V1 uses a modular architecture.

```text
                         DropSafe V1
                              |
          +-------------------+-------------------+
          |                   |                   |
          v                   v                   v
      Frontend             Backend                ML
      React                Node.js              Python
      TypeScript           Express              ML Service
          |                   |                   |
          |                   +--------+----------+
          |                            |
          |                            v
          |                        PostgreSQL
          |                            |
          +----------------------------+
                       |
                       v
                Chatbot / Counseling
                  WhatsApp
