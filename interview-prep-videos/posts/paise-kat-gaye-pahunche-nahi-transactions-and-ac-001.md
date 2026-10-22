# EP 13 · Transactions & ACID Explained: Money Debited but Never Credited (SQL Interview Question)

| | |
|---|---|
| Category | Databases & SQL |
| Duration | 106.7 s |
| Video | [paise-kat-gaye-pahunche-nahi-transactions-and-ac-001.mp4](https://raw.githubusercontent.com/PunithVT/career-ops/main/interview-prep-videos/videos/paise-kat-gaye-pahunche-nahi-transactions-and-ac-001.mp4) |
| Cover / thumbnail | [paise-kat-gaye-pahunche-nahi-transactions-and-ac-001.jpg](https://raw.githubusercontent.com/PunithVT/career-ops/main/interview-prep-videos/covers/paise-kat-gaye-pahunche-nahi-transactions-and-ac-001.jpg) |
| Subtitles | [paise-kat-gaye-pahunche-nahi-transactions-and-ac-001.srt](https://raw.githubusercontent.com/PunithVT/career-ops/main/interview-prep-videos/subtitles/paise-kat-gaye-pahunche-nahi-transactions-and-ac-001.srt) |

![cover](https://raw.githubusercontent.com/PunithVT/career-ops/main/interview-prep-videos/covers/paise-kat-gaye-pahunche-nahi-transactions-and-ac-001.jpg)

## Instagram caption
```
EP 13 · Rs 500 debited. Never credited. Where did the money go?

The server crashed between the debit and the credit. Most candidates say 'run both UPDATEs' or 'refund it in a try-catch'. Both fail: a catch-block refund dies with the process. One transaction gives you all-or-nothing, and the WAL makes every COMMIT survive a crash.

The twist: what if Rahul is in SBI and Priya in HDFC? No bank holds locks waiting for another bank, so 2PC is out. You need a durable, saga-style flow: pending state first, idempotent IDs, settle or reverse.

Save this for your next backend interview, and comment your answer to the follow-up: how do you stop Priya getting paid twice on a retry?

Follow @interviewtrap.ai for daily interview traps.

Animated emoji: Noto Emoji Animation by Google, CC BY 4.0 (creativecommons.org/licenses/by/4.0). Modified (resized/re-timed).

#SQL #ACID #DatabaseTransactions #SystemDesign #UPI #BackendInterview #TechInterview #InterviewTrapAI
```

## YouTube Shorts
**Title:** EP 13 · Transactions & ACID Explained: Money Debited but Never Credited #Shorts

**Description:**
```
EP 13 · Rs 500 debited. Never credited. Where did the money go?

The server crashed between the debit and the credit. Most candidates say 'run both UPDATEs' or 'refund it in a try-catch'. Both fail: a catch-block refund dies with the process. One transaction gives you all-or-nothing, and the WAL makes every COMMIT survive a crash.

The twist: what if Rahul is in SBI and Priya in HDFC? No bank holds locks waiting for another bank, so 2PC is out. You need a durable, saga-style flow: pending state first, idempotent IDs, settle or reverse.

Save this for your next backend interview, and comment your answer to the follow-up: how do you stop Priya getting paid twice on a retry?

Follow @interviewtrap.ai for daily interview traps.

Animated emoji: Noto Emoji Animation by Google, CC BY 4.0 (creativecommons.org/licenses/by/4.0). Modified (resized/re-timed).

#SQL #ACID #DatabaseTransactions #SystemDesign #UPI #BackendInterview #TechInterview #InterviewTrapAI #Shorts
```
**Tags:** SQL, ACID, DatabaseTransactions, SystemDesign, UPI, BackendInterview, TechInterview, InterviewTrapAI, interview preparation, tech interview, Shorts
**Category:** Education · **AI voice disclosed:** yes · **Made for kids:** no

## Cover text
DEBITED, NEVER CREDITED
