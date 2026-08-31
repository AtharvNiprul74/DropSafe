# DropSafe - Behaviour Schema

**Version:** 1.0

**Status:** DRAFT

**Depends On**

- Academic Schema
- AI Schema
- Import Schema
- Data Architecture

---

# Purpose

The Behaviour Schema stores raw behavioural evidence collected from student interactions.

Unlike the AI Schema, this schema stores only business data.

It does not store AI-generated insights.

Behaviour data serves as one of the primary inputs for feature engineering and prediction generation.

---

# Scope

This schema stores

- Chatbot Conversations

This schema does NOT store

- Behaviour Summaries
- Sentiment Scores
- Behaviour Scores
- Engagement Scores
- Predictions

Those belong to the AI Schema.

---

# Behaviour Philosophy

DropSafe separates behavioural evidence from behavioural intelligence.

Business data remains the source of truth.

AI derives behavioural insights without modifying the original conversations.

---

# Data Flow

Student

↓

Chatbot Conversation

↓

Student Snapshot

↓

Behaviour Summary

↓

Prediction

---

# Design Principles

Raw Conversations

↓

Feature Engineering

↓

Behaviour Summary

↓

Prediction

---

# Notes

Behaviour data is immutable.

AI models always read behavioural evidence.

AI never modifies chatbot conversations.

---

End of Document