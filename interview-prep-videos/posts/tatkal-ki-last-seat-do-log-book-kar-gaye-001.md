# EP 06 · Race Condition in Seat Booking: Why 'Check Then Update' Double-Books the Last Seat (SQL Interview)

| | |
|---|---|
| Category | Databases & SQL |
| Duration | 82.9 s |
| Video | [tatkal-ki-last-seat-do-log-book-kar-gaye-001.mp4](https://raw.githubusercontent.com/PunithVT/career-ops/main/interview-prep-videos/videos/tatkal-ki-last-seat-do-log-book-kar-gaye-001.mp4) |
| Cover / thumbnail | [tatkal-ki-last-seat-do-log-book-kar-gaye-001.jpg](https://raw.githubusercontent.com/PunithVT/career-ops/main/interview-prep-videos/covers/tatkal-ki-last-seat-do-log-book-kar-gaye-001.jpg) |
| Subtitles | [tatkal-ki-last-seat-do-log-book-kar-gaye-001.srt](https://raw.githubusercontent.com/PunithVT/career-ops/main/interview-prep-videos/subtitles/tatkal-ki-last-seat-do-log-book-kar-gaye-001.srt) |

![cover](https://raw.githubusercontent.com/PunithVT/career-ops/main/interview-prep-videos/covers/tatkal-ki-last-seat-do-log-book-kar-gaye-001.jpg)

## Instagram caption
```
EP 06 · Last Tatkal seat. Two users. Two servers. Both got a confirmed ticket. Can you find the bug?

If your booking code does SELECT, then 'if available > 0', then UPDATE, both requests can read 1 before either one writes. That's a check-then-act race. 'The DB is ACID' doesn't save you at default isolation, and 'synchronized' only locks inside one server.

The fix lives where every server meets: the database. Use UPDATE ... WHERE available > 0 and check rows affected, in the same transaction as the booking. Or use SELECT ... FOR UPDATE, with a CHECK constraint as a safety net. For a hot row, keep the locked step tiny and queue or split the demand. (This is about your code, not a claim about how IRCTC works.)

Save this for your next backend interview, and comment: optimistic or pessimistic locking?

Follow @interviewtrap.ai for daily interview traps.

Animated emoji: Noto Emoji Animation by Google, CC BY 4.0 (creativecommons.org/licenses/by/4.0). Modified (resized/re-timed).

#SQL #SystemDesign #DatabaseInterview #Concurrency #TechInterview #BackendDeveloper #InterviewTrapAI
```

## YouTube Shorts
**Title:** EP 06 · Race Condition in Seat Booking: Why 'Check Then Update' Double-Books the Last Seat #Shorts

**Description:**
```
EP 06 · Last Tatkal seat. Two users. Two servers. Both got a confirmed ticket. Can you find the bug?

If your booking code does SELECT, then 'if available › 0', then UPDATE, both requests can read 1 before either one writes. That's a check-then-act race. 'The DB is ACID' doesn't save you at default isolation, and 'synchronized' only locks inside one server.

The fix lives where every server meets: the database. Use UPDATE ... WHERE available › 0 and check rows affected, in the same transaction as the booking. Or use SELECT ... FOR UPDATE, with a CHECK constraint as a safety net. For a hot row, keep the locked step tiny and queue or split the demand. (This is about your code, not a claim about how IRCTC works.)

Save this for your next backend interview, and comment: optimistic or pessimistic locking?

Follow @interviewtrap.ai for daily interview traps.

Animated emoji: Noto Emoji Animation by Google, CC BY 4.0 (creativecommons.org/licenses/by/4.0). Modified (resized/re-timed).

#SQL #SystemDesign #DatabaseInterview #Concurrency #TechInterview #BackendDeveloper #InterviewTrapAI #Shorts
```
**Tags:** SQL, SystemDesign, DatabaseInterview, Concurrency, TechInterview, BackendDeveloper, InterviewTrapAI, interview preparation, tech interview, Shorts
**Category:** Education · **AI voice disclosed:** yes · **Made for kids:** no

## Cover text
LAST SEAT, 2 TICKETS
