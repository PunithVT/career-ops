# EP 07 · Thundering Herd Explained: How One Cache Expiry Kills Your Database (India vs Pakistan Scorecard)

| | |
|---|---|
| Category | System Design & Scaling |
| Duration | 102.5 s |
| Video | [india-vs-pakistan-cache-expires-the-thundering-h-001.mp4](https://raw.githubusercontent.com/PunithVT/career-ops/main/interview-prep-videos/videos/india-vs-pakistan-cache-expires-the-thundering-h-001.mp4) |
| Cover / thumbnail | [india-vs-pakistan-cache-expires-the-thundering-h-001.jpg](https://raw.githubusercontent.com/PunithVT/career-ops/main/interview-prep-videos/covers/india-vs-pakistan-cache-expires-the-thundering-h-001.jpg) |
| Subtitles | [india-vs-pakistan-cache-expires-the-thundering-h-001.srt](https://raw.githubusercontent.com/PunithVT/career-ops/main/interview-prep-videos/subtitles/india-vs-pakistan-cache-expires-the-thundering-h-001.srt) |

![cover](https://raw.githubusercontent.com/PunithVT/career-ops/main/interview-prep-videos/covers/india-vs-pakistan-cache-expires-the-thundering-h-001.jpg)

## Instagram caption
```
EP 07 · Your cache was empty for half a second. Your database died. Here's why.

At 2 lakh requests per second, a 500 ms rebuild means at least ~1 lakh identical cache misses. As the DB slows, the rebuild window grows, more requests miss, and the pile-up spreads into your app tier. That's the thundering herd, also called a cache stampede. A bigger TTL only makes it rarer. More replicas still get the same flood.

The fix interviewers want: a single-flight Redis lock with an expiry, a soft TTL so everyone else gets the last known score, early refresh, jittered TTLs, and request collapsing at the CDN.

Save this for your next system design round, and comment 'HERD' if you'd heard of this before.

Follow @interviewtrap.ai for daily interview traps.

Animated emoji: Noto Emoji Animation by Google, CC BY 4.0 (creativecommons.org/licenses/by/4.0). Modified (resized/re-timed).

#SystemDesign #Redis #Caching #BackendEngineering #TechInterview #SoftwareEngineer #InterviewTrapAI
```

## YouTube Shorts
**Title:** EP 07 · Thundering Herd Explained: How One Cache Expiry Kills Your Database #Shorts

**Description:**
```
EP 07 · Your cache was empty for half a second. Your database died. Here's why.

At 2 lakh requests per second, a 500 ms rebuild means at least ~1 lakh identical cache misses. As the DB slows, the rebuild window grows, more requests miss, and the pile-up spreads into your app tier. That's the thundering herd, also called a cache stampede. A bigger TTL only makes it rarer. More replicas still get the same flood.

The fix interviewers want: a single-flight Redis lock with an expiry, a soft TTL so everyone else gets the last known score, early refresh, jittered TTLs, and request collapsing at the CDN.

Save this for your next system design round, and comment 'HERD' if you'd heard of this before.

Follow @interviewtrap.ai for daily interview traps.

Animated emoji: Noto Emoji Animation by Google, CC BY 4.0 (creativecommons.org/licenses/by/4.0). Modified (resized/re-timed).

#SystemDesign #Redis #Caching #BackendEngineering #TechInterview #SoftwareEngineer #InterviewTrapAI #Shorts
```
**Tags:** SystemDesign, Redis, Caching, BackendEngineering, TechInterview, SoftwareEngineer, InterviewTrapAI, interview preparation, tech interview, Shorts
**Category:** Education · **AI voice disclosed:** yes · **Made for kids:** no

## Cover text
CACHE EXPIRES. DB DIES.
