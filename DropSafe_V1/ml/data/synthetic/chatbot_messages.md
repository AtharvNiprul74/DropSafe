# Chatbot Messages Synthetic Dataset

## 1. Dataset Identification

- **Dataset:** `chatbot_messages.csv`
- **Dataset type:** Synthetic development dataset
- **Generated records:** 21126
- **Random seed:** 51
- **Parent dataset:** `chatbot_conversations.csv`

> Synthetic data only. Raw messages are highly sensitive and access-controlled (PRD §11, §17).

---

## 2. Dataset Structure

| Column | Data Type | Required | Description |
|---|---|---|---|
| `id` | UUID | Yes | Message identifier |
| `organization_id` | UUID | Yes | Owning organization |
| `conversation_id` | UUID | Yes | Parent conversation |
| `sender_type` | Enum | Yes | STUDENT / BOT / SYSTEM |
| `message_text` | String | Yes | Raw message content |
| `message_timestamp` | Timestamp | Yes | Ordering timestamp |
| `created_at` | Timestamp | Yes | Creation timestamp (equals message timestamp; append-only) |
| `updated_at` | Timestamp | Yes | Last update timestamp |
| `created_by` | UUID | No | Creating user |
| `updated_by` | UUID | No | Updating user |

---

## 3. Sender Distribution

{'STUDENT': 10502, 'BOT': 9665, 'SYSTEM': 959}

---

## 4. PRD Compliance Notes

- Every conversation contains one or more messages (PRD §11).
- Message text is never empty (PRD §11).
- Ordering within a conversation is determined by `message_timestamp`; timestamps are strictly increasing (PRD §11).
- Messages are append-only; original content is never modified (PRD §11).
- No sentiment, stress, engagement, behaviour scores, risk predictions, or AI summaries are stored in this table (PRD §11).
- BOT templates avoid revealing predictions, internal AI decisions, or mentor actions (PRD §31).

---

## 5. Validation

```text
{'rows': 21126, 'duplicate_ids': 0, 'empty_ids': 0, 'empty_conversation_ids': 0, 'invalid_conversation_references': 0, 'conversations_without_messages': 0, 'invalid_sender_types': 0, 'empty_message_texts': 0, 'invalid_message_timestamps': 0, 'non_monotonic_message_order': 0, 'messages_before_conversation_start': 0, 'messages_after_conversation_end': 0, 'conversation_organization_mismatches': 0, 'invalid_created_timestamps': 0, 'invalid_updated_timestamps': 0, 'updated_before_created': 0, 'forbidden_columns_present': 0, 'validation_passed': True}
```

### Overall: **PASS**

---

## 6. Model Training

**No model training was performed.**
