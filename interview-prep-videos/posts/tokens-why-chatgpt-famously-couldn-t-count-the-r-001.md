# EP 11 · Tokens Explained: Why ChatGPT Famously Couldn't Count the R's in Strawberry (and Why Hindi Costs More)

| | |
|---|---|
| Category | Generative AI |
| Duration | 81.8 s |
| Video | [tokens-why-chatgpt-famously-couldn-t-count-the-r-001.mp4](https://raw.githubusercontent.com/PunithVT/career-ops/main/interview-prep-videos/videos/tokens-why-chatgpt-famously-couldn-t-count-the-r-001.mp4) |
| Cover / thumbnail | [tokens-why-chatgpt-famously-couldn-t-count-the-r-001.jpg](https://raw.githubusercontent.com/PunithVT/career-ops/main/interview-prep-videos/covers/tokens-why-chatgpt-famously-couldn-t-count-the-r-001.jpg) |
| Subtitles | [tokens-why-chatgpt-famously-couldn-t-count-the-r-001.srt](https://raw.githubusercontent.com/PunithVT/career-ops/main/interview-prep-videos/subtitles/tokens-why-chatgpt-famously-couldn-t-count-the-r-001.srt) |

![cover](https://raw.githubusercontent.com/PunithVT/career-ops/main/interview-prep-videos/covers/tokens-why-chatgpt-famously-couldn-t-count-the-r-001.jpg)

## Instagram caption
```
EP 11 · AI that writes code famously couldn't count the r's in 'strawberry'. And the same chatbot's bill jumps when you switch to Hindi. One culprit.

LLMs don't read letters. A tokenizer cuts text into sub-word pieces called tokens from a fixed vocabulary, and the model only sees their IDs. On GPT-4's cl100k tokenizer, 'strawberry' becomes str | aw | berry (newer o200k splits it st | raw | berry), so the r's are sealed inside the pieces and the model can only guess. Newer reasoning models mostly get it right by spelling the word out first.

The trap: pricing and the context window are counted in tokens, and replies are generated token by token. Devanagari takes 3 bytes per code point in UTF-8, and tokenizers learned fewer Hindi pieces, so the same meaning often needs several times more tokens on older tokenizers. Measure with your model's real tokenizer. Need an exact letter count? Use a tool call.

Send this to a friend who has a GenAI interview coming up.

Follow @interviewtrap.ai for daily interview traps.

Animated emoji: Noto Emoji Animation by Google, CC BY 4.0 (creativecommons.org/licenses/by/4.0). Modified (resized/re-timed).

#GenerativeAI #LLM #Tokenization #ChatGPT #AIInterview #Freshers #InterviewTrapAI
```

## YouTube Shorts
**Title:** EP 11 · Tokens Explained: Why ChatGPT Famously Couldn't Count the R's in Strawberry #Shorts

**Description:**
```
EP 11 · AI that writes code famously couldn't count the r's in 'strawberry'. And the same chatbot's bill jumps when you switch to Hindi. One culprit.

LLMs don't read letters. A tokenizer cuts text into sub-word pieces called tokens from a fixed vocabulary, and the model only sees their IDs. On GPT-4's cl100k tokenizer, 'strawberry' becomes str | aw | berry (newer o200k splits it st | raw | berry), so the r's are sealed inside the pieces and the model can only guess. Newer reasoning models mostly get it right by spelling the word out first.

The trap: pricing and the context window are counted in tokens, and replies are generated token by token. Devanagari takes 3 bytes per code point in UTF-8, and tokenizers learned fewer Hindi pieces, so the same meaning often needs several times more tokens on older tokenizers. Measure with your model's real tokenizer. Need an exact letter count? Use a tool call.

Send this to a friend who has a GenAI interview coming up.

Follow @interviewtrap.ai for daily interview traps.

Animated emoji: Noto Emoji Animation by Google, CC BY 4.0 (creativecommons.org/licenses/by/4.0). Modified (resized/re-timed).

#GenerativeAI #LLM #Tokenization #ChatGPT #AIInterview #Freshers #InterviewTrapAI #Shorts
```
**Tags:** GenerativeAI, LLM, Tokenization, ChatGPT, AIInterview, Freshers, InterviewTrapAI, interview preparation, tech interview, Shorts
**Category:** Education · **AI voice disclosed:** yes · **Made for kids:** no

## Cover text
STRAWBERRY HAS 2 R'S?
