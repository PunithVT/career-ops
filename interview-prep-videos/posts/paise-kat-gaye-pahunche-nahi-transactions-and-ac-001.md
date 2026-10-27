# EP 13 · Transactions & ACID Explained: Money Debited but Never Credited (SQL Interview Question)

| | |
|---|---|
| Category | Databases & SQL |
| Duration | 82.5 s |
| Video | [paise-kat-gaye-pahunche-nahi-transactions-and-ac-001.mp4](https://raw.githubusercontent.com/PunithVT/career-ops/main/interview-prep-videos/videos/paise-kat-gaye-pahunche-nahi-transactions-and-ac-001.mp4) |
| Cover / thumbnail | [paise-kat-gaye-pahunche-nahi-transactions-and-ac-001.jpg](https://raw.githubusercontent.com/PunithVT/career-ops/main/interview-prep-videos/covers/paise-kat-gaye-pahunche-nahi-transactions-and-ac-001.jpg) |
| Subtitles | [paise-kat-gaye-pahunche-nahi-transactions-and-ac-001.srt](https://raw.githubusercontent.com/PunithVT/career-ops/main/interview-prep-videos/subtitles/paise-kat-gaye-pahunche-nahi-transactions-and-ac-001.srt) |

![cover](https://raw.githubusercontent.com/PunithVT/career-ops/main/interview-prep-videos/covers/paise-kat-gaye-pahunche-nahi-transactions-and-ac-001.jpg)

## Instagram caption
```
EP 13 · Rs 500 debited. Never credited. Where did the money go?

The server crashed between the debit and the credit. 'Refund it in a try-catch' gets you rejected: that undo lives only in app memory and dies with the crash. Put both UPDATEs in one transaction for all-or-nothing. With default settings, the WAL makes every COMMIT survive a crash: the commit record is flushed before the database says success, the data pages are written later, and on restart committed work is replayed while anything without a commit record is discarded.

The twist: Rahul is in SBI, Priya in HDFC. Banks generally avoid two-phase commit across organisations: if the coordinator fails, a bank that already said yes is stuck holding the money. Use a durable, saga-style flow instead: write PENDING first, send the credit with a transaction ID, settle or reverse your own debit, and let that ID make a retried request do nothing. (In India, RBI rules say a failed UPI/IMPS debit must be reversed by T+1.)

Send this to a friend who has a backend interview coming up.

Follow @interviewtrap.ai for daily interview traps.

Animated emoji: Noto Emoji Animation by Google, CC BY 4.0 (creativecommons.org/licenses/by/4.0). Modified (resized/re-timed).

#SQL #ACID #DatabaseTransactions #SystemDesign #BackendInterview #TechInterview #InterviewTrapAI
```

## YouTube Shorts
**Title:** EP 13 · Transactions & ACID Explained: Money Debited but Never Credited #Shorts

**Description:**
```
EP 13 · Rs 500 debited. Never credited. Where did the money go?

The server crashed between the debit and the credit. 'Refund it in a try-catch' gets you rejected: that undo lives only in app memory and dies with the crash. Put both UPDATEs in one transaction for all-or-nothing. With default settings, the WAL makes every COMMIT survive a crash: the commit record is flushed before the database says success, the data pages are written later, and on restart committed work is replayed while anything without a commit record is discarded.

The twist: Rahul is in SBI, Priya in HDFC. Banks generally avoid two-phase commit across organisations: if the coordinator fails, a bank that already said yes is stuck holding the money. Use a durable, saga-style flow instead: write PENDING first, send the credit with a transaction ID, settle or reverse your own debit, and let that ID make a retried request do nothing. (In India, RBI rules say a failed UPI/IMPS debit must be reversed by T+1.)

Send this to a friend who has a backend interview coming up.

Follow @interviewtrap.ai for daily interview traps.

Animated emoji: Noto Emoji Animation by Google, CC BY 4.0 (creativecommons.org/licenses/by/4.0). Modified (resized/re-timed).

#SQL #ACID #DatabaseTransactions #SystemDesign #BackendInterview #TechInterview #InterviewTrapAI #Shorts
```
**Tags:** SQL, ACID, DatabaseTransactions, SystemDesign, BackendInterview, TechInterview, InterviewTrapAI, interview preparation, tech interview, Shorts
**Category:** Education · **AI voice disclosed:** yes · **Made for kids:** no

## Cover text
WHERE DID RS 500 GO?
