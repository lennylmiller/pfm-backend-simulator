# Alert Notification System - Sequence Diagrams

This document provides detailed sequence diagrams for key workflows in the alert notification system.

---

## 1. Periodic Alert Evaluation Flow

```
┌────────┐      ┌──────────┐      ┌───────────┐      ┌──────────┐      ┌──────────┐
│ Cron   │      │   Job    │      │  Worker   │      │ Database │      │ Delivery │
│ Trigger│      │  Queue   │      │  Process  │      │          │      │ Service  │
└────┬───┘      └────┬─────┘      └─────┬─────┘      └────┬─────┘      └────┬─────┘
     │               │                   │                 │                 │
     │ Every 5 min   │                   │                 │                 │
     ├──────────────>│                   │                 │                 │
     │ Enqueue job   │                   │                 │                 │
     │               │                   │                 │                 │
     │               │ Job available     │                 │                 │
     │               ├──────────────────>│                 │                 │
     │               │                   │                 │                 │
     │               │                   │ Fetch active    │                 │
     │               │                   │ alerts (batch)  │                 │
     │               │                   ├────────────────>│                 │
     │               │                   │                 │                 │
     │               │                   │ Return alerts   │                 │
     │               │                   │<────────────────┤                 │
     │               │                   │                 │                 │
     │               │                   │ Fetch context   │                 │
     │               │                   │ (accounts, etc) │                 │
     │               │                   ├────────────────>│                 │
     │               │                   │                 │                 │
     │               │                   │ Return data     │                 │
     │               │                   │<────────────────┤                 │
     │               │                   │                 │                 │
     │               │                   │ For each alert: │                 │
     │               │                   │ ┌─────────────┐ │                 │
     │               │                   │ │ Evaluate    │ │                 │
     │               │                   │ │ conditions  │ │                 │
     │               │                   │ └─────────────┘ │                 │
     │               │                   │                 │                 │
     │               │                   │ If triggered:   │                 │
     │               │                   │ Create          │                 │
     │               │                   │ notification    │                 │
     │               │                   ├────────────────>│                 │
     │               │                   │                 │                 │
     │               │                   │ Update alert    │                 │
     │               │                   │ lastTriggered   │                 │
     │               │                   ├────────────────>│                 │
     │               │                   │                 │                 │
     │               │                   │ Enqueue         │                 │
     │               │                   │ delivery job    │                 │
     │               │                   ├─────────────────┼────────────────>│
     │               │                   │                 │                 │
     │               │ Job complete      │                 │                 │
     │               │<──────────────────┤                 │                 │
     │               │                   │                 │                 │
```

---

## 2. Real-Time Transaction Alert Flow

```
┌─────────┐    ┌───────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│ API POST│    │Transaction│    │   Job    │    │  Worker  │    │ Delivery │
│  /txns  │    │  Service  │    │  Queue   │    │          │    │          │
└────┬────┘    └─────┬─────┘    └────┬─────┘    └────┬─────┘    └────┬─────┘
     │               │               │               │               │
     │ Create txn    │               │               │               │
     ├──────────────>│               │               │               │
     │               │               │               │               │
     │               │ Save to DB    │               │               │
     │               │ (transaction) │               │               │
     │               │               │               │               │
     │               │ Enqueue       │               │               │
     │               │ realtime      │               │               │
     │               │ alert check   │               │               │
     │               ├──────────────>│               │               │
     │               │ (high priority)               │               │
     │               │               │               │               │
     │ 201 Created   │               │               │               │
     │<──────────────┤               │               │               │
     │               │               │               │               │
     │               │               │ Process job   │               │
     │               │               ├──────────────>│               │
     │               │               │               │               │
     │               │               │ Fetch user    │               │
     │               │               │ alerts:       │               │
     │               │               │ - transaction_│               │
     │               │               │   limit       │               │
     │               │               │ - merchant_   │               │
     │               │               │   name        │               │
     │               │               │               │               │
     │               │               │ Evaluate each │               │
     │               │               │ alert         │               │
     │               │               │               │               │
     │               │               │ If triggered: │               │
     │               │               │ ┌───────────┐ │               │
     │               │               │ │Create     │ │               │
     │               │               │ │notification│               │
     │               │               │ └───────────┘ │               │
     │               │               │               │               │
     │               │               │ Trigger       │               │
     │               │               │ delivery      │               │
     │               │               ├───────────────┼──────────────>│
     │               │               │               │               │
     │               │               │               │ Deliver via   │
     │               │               │               │ all channels  │
     │               │               │               │               │
```

---

## 3. Multi-Channel Notification Delivery Flow

```
┌──────────┐   ┌──────────┐   ┌────────┐   ┌─────────┐   ┌─────────┐
│Delivery  │   │  User    │   │ Email  │   │   SMS   │   │ In-App  │
│Orchestr. │   │  Prefs   │   │Channel │   │ Channel │   │ Channel │
└────┬─────┘   └────┬─────┘   └───┬────┘   └────┬────┘   └────┬────┘
     │              │              │             │             │
     │ Deliver      │              │             │             │
     │ notification │              │             │             │
     │              │              │             │             │
     │ Get delivery │              │             │             │
     │ preferences  │              │             │             │
     ├─────────────>│              │             │             │
     │              │              │             │             │
     │ Return prefs │              │             │             │
     │ {email: true │              │             │             │
     │  sms: true   │              │             │             │
     │  inApp: true}│              │             │             │
     │<─────────────┤              │             │             │
     │              │              │             │             │
     │ Check rate   │              │             │             │
     │ limits       │              │             │             │
     │ ✓ OK         │              │             │             │
     │              │              │             │             │
     │ Check quiet  │              │             │             │
     │ hours        │              │             │             │
     │ ✓ OK         │              │             │             │
     │              │              │             │             │
     │ Parallel delivery:          │             │             │
     ├──────────────┼──────────────>│             │             │
     │ Send email   │              │             │             │
     │              │              │ Render      │             │
     │              │              │ template    │             │
     │              │              │             │             │
     │              │              │ Call        │             │
     │              │              │ SendGrid    │             │
     │              │              │ API         │             │
     │              │              │             │             │
     ├──────────────┼──────────────┼─────────────>│             │
     │ Send SMS     │              │             │ Truncate    │
     │              │              │             │ message     │
     │              │              │             │             │
     │              │              │             │ Call Twilio │
     │              │              │             │ API         │
     │              │              │             │             │
     ├──────────────┼──────────────┼─────────────┼────────────>│
     │ In-app notify│              │             │             │ Store in DB
     │              │              │             │             │
     │              │              │             │             │ Try WebSocket
     │              │              │             │             │ push
     │              │              │             │             │
     │              │              │ Success     │             │
     │              │              │<────────────┤             │
     │<─────────────┼──────────────┤             │             │
     │              │              │             │             │
     │              │              │             │ Success     │
     │              │              │             │<────────────┤
     │<─────────────┼──────────────┼─────────────┤             │
     │              │              │             │             │
     │              │              │             │             │ Success
     │<─────────────┼──────────────┼─────────────┼─────────────┤
     │              │              │             │             │
     │ Update       │              │             │             │
     │ delivery     │              │             │             │
     │ records      │              │             │             │
     │              │              │             │             │
```

---

## 4. Email Delivery with Retry Flow

```
┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐
│  Email   │   │  Retry   │   │ SendGrid │   │ Database │   │  Dead    │
│ Channel  │   │ Handler  │   │   API    │   │          │   │ Letter Q │
└────┬─────┘   └────┬─────┘   └────┬─────┘   └────┬─────┘   └────┬─────┘
     │              │              │             │             │
     │ Send email   │              │             │             │
     │              │              │             │             │
     │ Create       │              │             │             │
     │ delivery     │              │             │             │
     │ record       │              │             │             │
     ├──────────────┼──────────────┼────────────>│             │
     │              │              │             │             │
     │              │              │             │ Record      │
     │              │              │             │ created     │
     │              │              │             │ (pending)   │
     │              │              │             │             │
     │ Execute with │              │             │             │
     │ retry        │              │             │             │
     ├─────────────>│              │             │             │
     │              │              │             │             │
     │              │ Attempt 1    │             │             │
     │              ├─────────────>│             │             │
     │              │              │             │             │
     │              │              │ 500 Error   │             │
     │              │<─────────────┤             │             │
     │              │              │             │             │
     │              │ Wait 2s      │             │             │
     │              │ (exponential │             │             │
     │              │  backoff)    │             │             │
     │              │              │             │             │
     │              │ Attempt 2    │             │             │
     │              ├─────────────>│             │             │
     │              │              │             │             │
     │              │              │ 500 Error   │             │
     │              │<─────────────┤             │             │
     │              │              │             │             │
     │              │ Wait 6s      │             │             │
     │              │              │             │             │
     │              │ Attempt 3    │             │             │
     │              ├─────────────>│             │             │
     │              │              │             │             │
     │              │              │ 200 Success │             │
     │              │<─────────────┤             │             │
     │              │ (msg_id:     │             │             │
     │              │  SG.xxxxx)   │             │             │
     │              │              │             │             │
     │ Success      │              │             │             │
     │<─────────────┤              │             │             │
     │              │              │             │             │
     │ Update       │              │             │             │
     │ delivery     │              │             │             │
     │ record       │              │             │             │
     ├──────────────┼──────────────┼────────────>│             │
     │ {status:sent │              │             │             │
     │  sentAt: now │              │             │             │
     │  providerId: │              │             │             │
     │  SG.xxxxx}   │              │             │             │
     │              │              │             │             │


--- Alternative: All Retries Failed ---

     │              │ Attempt 5    │             │             │
     │              ├─────────────>│             │             │
     │              │              │ 503 Error   │             │
     │              │<─────────────┤             │             │
     │              │              │             │             │
     │              │ Max attempts │             │             │
     │              │ exhausted    │             │             │
     │              │              │             │             │
     │ Failed       │              │             │             │
     │<─────────────┤              │             │             │
     │              │              │             │             │
     │ Update       │              │             │             │
     │ delivery     │              │             │             │
     │ record       │              │             │             │
     ├──────────────┼──────────────┼────────────>│             │
     │ {status:     │              │             │             │
     │  failed}     │              │             │             │
     │              │              │             │             │
     │ Move to      │              │             │             │
     │ dead letter  │              │             │             │
     │ queue        │              │             │             │
     ├──────────────┼──────────────┼─────────────┼────────────>│
     │              │              │             │             │
```

---

## 5. Circuit Breaker Flow

```
┌──────────┐   ┌──────────┐   ┌──────────┐
│ Delivery │   │ Circuit  │   │ SendGrid │
│ Service  │   │ Breaker  │   │   API    │
└────┬─────┘   └────┬─────┘   └────┬─────┘
     │              │              │
     │ Send email   │              │
     ├─────────────>│              │
     │              │ State:       │
     │              │ CLOSED       │
     │              │              │
     │              │ Execute      │
     │              ├─────────────>│
     │              │              │
     │              │ 500 Error    │
     │              │<─────────────┤
     │              │              │
     │              │ Failure #1   │
     │              │              │
     │ Error        │              │
     │<─────────────┤              │
     │              │              │
     │ Send email   │              │
     ├─────────────>│              │
     │              │              │
     │              │ Execute      │
     │              ├─────────────>│
     │              │              │
     │              │ 503 Error    │
     │              │<─────────────┤
     │              │              │
     │              │ Failure #2   │
     │              │              │
     │ ... (failures #3, #4, #5) │
     │              │              │
     │              │ Threshold    │
     │              │ reached!     │
     │              │              │
     │              │ State:       │
     │              │ OPEN         │
     │              │ NextAttempt: │
     │              │ now + 60s    │
     │              │              │
     │ Send email   │              │
     ├─────────────>│              │
     │              │              │
     │              │ State: OPEN  │
     │              │ Time < next  │
     │              │              │
     │ Error:       │              │
     │ Circuit OPEN │              │
     │<─────────────┤              │
     │              │              │
     │              │              │
     │ ... 60 seconds later ...    │
     │              │              │
     │ Send email   │              │
     ├─────────────>│              │
     │              │              │
     │              │ State: OPEN  │
     │              │ Time >= next │
     │              │              │
     │              │ Transition:  │
     │              │ HALF_OPEN    │
     │              │              │
     │              │ Execute      │
     │              ├─────────────>│
     │              │              │
     │              │ 200 Success  │
     │              │<─────────────┤
     │              │              │
     │              │ Success #1   │
     │              │              │
     │ Success      │              │
     │<─────────────┤              │
     │              │              │
     │ Send email   │              │
     ├─────────────>│              │
     │              │              │
     │              │ Execute      │
     │              ├─────────────>│
     │              │              │
     │              │ 200 Success  │
     │              │<─────────────┤
     │              │              │
     │              │ Success #2   │
     │              │              │
     │              │ Threshold    │
     │              │ reached!     │
     │              │              │
     │              │ State:       │
     │              │ CLOSED       │
     │              │              │
     │ Success      │              │
     │<─────────────┤              │
     │              │              │
```

---

## 6. Deduplication Flow

```
┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐
│  Alert   │   │  Dedup   │   │   Cache  │   │ Database │
│Evaluator │   │ Service  │   │  (Redis) │   │          │
└────┬─────┘   └────┬─────┘   └────┬─────┘   └────┬─────┘
     │              │              │             │
     │ Alert        │              │             │
     │ triggered    │              │             │
     │              │              │             │
     │ Check if     │              │             │
     │ should send  │              │             │
     ├─────────────>│              │             │
     │              │              │             │
     │              │ Check DB     │             │
     │              │ lastTriggered│             │
     │              ├──────────────┼────────────>│
     │              │              │             │
     │              │ Return:      │             │
     │              │ 2025-10-04   │             │
     │              │ 08:00:00     │             │
     │              │<─────────────┼─────────────┤
     │              │              │             │
     │              │ Calculate    │             │
     │              │ hours since: │             │
     │              │ 2 hours      │             │
     │              │              │             │
     │              │ < 6 hour     │             │
     │              │ cooldown     │             │
     │              │              │             │
     │ Don't send   │              │             │
     │ (cooldown)   │              │             │
     │<─────────────┤              │             │
     │              │              │             │
     │              │              │             │
--- 7 hours later ---              │             │
     │              │              │             │
     │ Alert        │              │             │
     │ triggered    │              │             │
     │ again        │              │             │
     │              │              │             │
     │ Check if     │              │             │
     │ should send  │              │             │
     ├─────────────>│              │             │
     │              │              │             │
     │              │ Check DB     │             │
     │              │ lastTriggered│             │
     │              ├──────────────┼────────────>│
     │              │              │             │
     │              │ Return:      │             │
     │              │ 2025-10-04   │             │
     │              │ 08:00:00     │             │
     │              │<─────────────┼─────────────┤
     │              │              │             │
     │              │ Calculate    │             │
     │              │ hours since: │             │
     │              │ 7 hours      │             │
     │              │              │             │
     │              │ > 6 hour     │             │
     │              │ cooldown ✓   │             │
     │              │              │             │
     │              │ Generate     │             │
     │              │ fingerprint  │             │
     │              │ (MD5 hash)   │             │
     │              │              │             │
     │              │ Check cache  │             │
     │              ├─────────────>│             │
     │              │              │             │
     │              │ Miss         │             │
     │              │<─────────────┤             │
     │              │              │             │
     │              │ Set cache    │             │
     │              ├─────────────>│             │
     │              │ TTL: 30 min  │             │
     │              │              │             │
     │ Send ✓       │              │             │
     │<─────────────┤              │             │
     │              │              │             │
```

---

## 7. Rate Limiting Flow

```
┌──────────┐   ┌──────────┐   ┌──────────┐
│ Delivery │   │   Rate   │   │  Redis   │
│Orchestr. │   │ Limiter  │   │  Cache   │
└────┬─────┘   └────┬─────┘   └────┬─────┘
     │              │              │
     │ Deliver      │              │
     │ notification │              │
     │              │              │
     │ Check rate   │              │
     │ limit        │              │
     ├─────────────>│              │
     │ userId: 123  │              │
     │ channel:email│              │
     │              │              │
     │              │ Get hourly   │
     │              │ count        │
     │              ├─────────────>│
     │              │ Key:         │
     │              │ ratelimit:   │
     │              │ 123:email:   │
     │              │ 2025-10-04T10│
     │              │              │
     │              │ Return: 8    │
     │              │<─────────────┤
     │              │              │
     │              │ 8 < 10 ✓     │
     │              │              │
     │              │ Get daily    │
     │              │ count        │
     │              ├─────────────>│
     │              │ Key:         │
     │              │ ratelimit:   │
     │              │ 123:email:   │
     │              │ 2025-10-04   │
     │              │              │
     │              │ Return: 45   │
     │              │<─────────────┤
     │              │              │
     │              │ 45 < 50 ✓    │
     │              │              │
     │ OK to send   │              │
     │<─────────────┤              │
     │              │              │
     │ Deliver      │              │
     │ notification │              │
     │ ...          │              │
     │              │              │
     │ Increment    │              │
     │ counter      │              │
     ├─────────────>│              │
     │              │              │
     │              │ INCR hourly  │
     │              ├─────────────>│
     │              │              │
     │              │ Set TTL 1hr  │
     │              ├─────────────>│
     │              │              │
     │              │ INCR daily   │
     │              ├─────────────>│
     │              │              │
     │              │ Set TTL 24hr │
     │              ├─────────────>│
     │              │              │
     │ Done         │              │
     │<─────────────┤              │
     │              │              │


--- Hour later: 11th email attempt ---

     │ Deliver      │              │
     │ notification │              │
     │              │              │
     │ Check rate   │              │
     │ limit        │              │
     ├─────────────>│              │
     │              │              │
     │              │ Get hourly   │
     │              │ count        │
     │              ├─────────────>│
     │              │              │
     │              │ Return: 10   │
     │              │<─────────────┤
     │              │              │
     │              │ 10 >= 10 ✗   │
     │              │ LIMIT        │
     │              │ EXCEEDED     │
     │              │              │
     │ Rate limit   │              │
     │ exceeded     │              │
     │<─────────────┤              │
     │              │              │
     │ Don't deliver│              │
     │ Log warning  │              │
     │              │              │
```

---

## Summary

These sequence diagrams illustrate:

1. **Periodic Evaluation**: How cron triggers batch alert evaluation
2. **Real-Time Alerts**: Immediate processing on transaction events
3. **Multi-Channel Delivery**: Parallel delivery to email/SMS/in-app
4. **Retry Logic**: Exponential backoff with dead letter queue
5. **Circuit Breaker**: Automatic fault protection for external services
6. **Deduplication**: Cooldown and fingerprinting to prevent duplicates
7. **Rate Limiting**: Hourly and daily limits per user per channel

All flows work together to create a reliable, scalable notification system.
