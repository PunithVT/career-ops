# EP 12 · Idempotency Keys Explained: Why a Retry Charged Rs 1500 Instead of Rs 500 (System Design Interview)

| | |
|---|---|
| Category | System Design & Scaling |
| Duration | 78.8 s |
| Video | [paid-twice-idempotency-keys-001.mp4](https://raw.githubusercontent.com/PunithVT/career-ops/main/interview-prep-videos/videos/paid-twice-idempotency-keys-001.mp4) |
| Cover / thumbnail | [paid-twice-idempotency-keys-001.jpg](https://raw.githubusercontent.com/PunithVT/career-ops/main/interview-prep-videos/covers/paid-twice-idempotency-keys-001.jpg) |
| Subtitles | [paid-twice-idempotency-keys-001.srt](https://raw.githubusercontent.com/PunithVT/career-ops/main/interview-prep-videos/subtitles/paid-twice-idempotency-keys-001.srt) |

![cover](https://raw.githubusercontent.com/PunithVT/career-ops/main/interview-prep-videos/covers/paid-twice-idempotency-keys-001.jpg)

## Instagram caption
```
EP 12 · Rs 500 paid, Rs 1500 charged: the payment call timed out and the app retried twice.

A timeout doesn't mean the payment failed. It means "I don't know". 'Just don't retry' fails too, because the user taps Pay again. The fix: the app creates an idempotency key once per payment and sends the same key with every retry. The server replays the saved result, or answers 409 if the first attempt is still in progress.

The trap: 'check, then insert if not found' is itself a race. Two retries can both see 'not found'. Put a UNIQUE constraint on the key. Retries plus idempotent processing give you effectively-once, not truly exactly-once. The twist: the same key with a different amount should be rejected (422 in the IETF draft), and keys must outlive your client's retry window (Stripe: at least 24 hours).

Send this to a friend who has a backend or system design interview coming up.

Follow @interviewtrap.ai for daily interview traps.

Animated emoji: Noto Emoji Animation by Google, CC BY 4.0 (creativecommons.org/licenses/by/4.0). Modified (resized/re-timed).

#SystemDesign #Idempotency #BackendDevelopment #TechInterview #PaymentGateway #PlacementPrep #InterviewTrapAI
```

## YouTube Shorts
**Title:** EP 12 · Idempotency Keys Explained: Why a Retry Charged Rs 1500 Instead of Rs 500 #Shorts

**Description:**
```
EP 12 · Rs 500 paid, Rs 1500 charged: the payment call timed out and the app retried twice.

A timeout doesn't mean the payment failed. It means "I don't know". 'Just don't retry' fails too, because the user taps Pay again. The fix: the app creates an idempotency key once per payment and sends the same key with every retry. The server replays the saved result, or answers 409 if the first attempt is still in progress.

The trap: 'check, then insert if not found' is itself a race. Two retries can both see 'not found'. Put a UNIQUE constraint on the key. Retries plus idempotent processing give you effectively-once, not truly exactly-once. The twist: the same key with a different amount should be rejected (422 in the IETF draft), and keys must outlive your client's retry window (Stripe: at least 24 hours).

Send this to a friend who has a backend or system design interview coming up.

Follow @interviewtrap.ai for daily interview traps.

Animated emoji: Noto Emoji Animation by Google, CC BY 4.0 (creativecommons.org/licenses/by/4.0). Modified (resized/re-timed).

#SystemDesign #Idempotency #BackendDevelopment #TechInterview #PaymentGateway #PlacementPrep #InterviewTrapAI #Shorts
```
**Tags:** SystemDesign, Idempotency, BackendDevelopment, TechInterview, PaymentGateway, PlacementPrep, InterviewTrapAI, interview preparation, tech interview, Shorts
**Category:** Education · **AI voice disclosed:** yes · **Made for kids:** no

## Cover text
CHARGED 3 TIMES?
