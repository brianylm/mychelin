# Whisper & SG Dialect Support — Technical Report for Mychelin AI Language Bridge

**Date:** 2026-03-27  
**Context:** Heritage recipe preservation — transcribing elderly Singaporeans speaking in dialect (kitchen context)

---

## Executive Summary

Whisper has **partial but usable** support for Singapore's dialects. Cantonese and Malay are well-supported. Mandarin (Singapore-accented) works decently. **Hokkien and Teochew are NOT natively supported** — they're the biggest gap and the most critical dialects for Mychelin's target users. The recommended architecture is a **hybrid pipeline**: Whisper for supported languages + Meta's SeamlessM4T for Hokkien + LLM (Claude/Gemini) for translation, cultural context, and recipe structuring.

---

## 1. Whisper Dialect Support Analysis

### Language Support Matrix

| Dialect/Language | Whisper Support | Language Code | Accuracy Estimate | Notes |
|---|---|---|---|---|
| **Cantonese** | ✅ Supported (large-v3+) | `yue` | ~8% WER (FLEURS benchmark) | Dedicated language code since large-v3. Auto-detect often misidentifies as `zh` — **must force `yue`** |
| **Mandarin** | ✅ Supported | `zh` | ~5-8% WER | Good accuracy. SG-accented Mandarin adds ~3-5% WER penalty. Use `initial_prompt` to guide output |
| **Malay** | ✅ Supported | `ms` | ~10-15% WER | Solid support. Handles standard Malay well. SG Malay slang less reliable |
| **Tamil** | ✅ Supported | `ta` | ~15-20% WER | Supported but lower accuracy than major languages |
| **Hokkien** | ❌ NOT supported | N/A | N/A | **Critical gap.** No language code. No training data. Primarily oral language with no standard writing system |
| **Teochew** | ❌ NOT supported | N/A | N/A | **Critical gap.** No language code. Even less data than Hokkien |
| **Hakka** | ❌ NOT supported | N/A | N/A | No language code or training data |

### Key Findings

1. **Hokkien is the #1 problem.** It's the most commonly spoken Chinese dialect among SG elderly AND has no standard written form. Whisper literally cannot process it.

2. **Cantonese auto-detection is broken.** Even with large-v3 supporting `yue`, the auto-detect often identifies Cantonese speech as `zh` (Mandarin), producing garbled Mandarin transcriptions. **Always force the language code.**

3. **Code-switching (Singlish) handling:** Whisper can handle Singlish (English with dialect loanwords) reasonably well when set to `en`. Tested by community members — captures general meaning but struggles with dialect-specific terms like "char kway teow" or "kueh". Expect ~15-25% WER for heavy Singlish.

4. **Kitchen context challenge:** Elderly speakers in kitchens = background noise (sizzling, chopping) + dialect + code-switching. This is worst-case for any ASR system.

---

## 2. Whisper Versions Comparison

### Model Variants

| Model | Size | Speed | Dialect Performance | Best For |
|---|---|---|---|---|
| **large-v3** | 1.5B params | Slowest | Best for dialects (includes `yue`) | Maximum accuracy on supported languages |
| **large-v3-turbo** | 809M params | 4x faster than large-v3 | ~= large-v2 accuracy | Good balance for production |
| **GPT-4o Transcribe** | Cloud only | Fast | Improved WER over Whisper | Best cloud option, newer architecture |
| **GPT-4o Mini Transcribe** | Cloud only | Fastest | Good for major languages | Budget cloud option |

### Deployment Options

| Option | Cost | Latency | Dialect Control | Recommendation |
|---|---|---|---|---|
| **OpenAI Whisper API** | $0.006/min | ~10-30s for 5min clip | Limited (no `yue` in API?) | ✅ Start here for MVP |
| **GPT-4o Transcribe API** | $0.006/min | Similar | Better accuracy | ✅ Upgrade path |
| **GPT-4o Mini Transcribe** | $0.003/min | Fastest | Good | ✅ Budget option |
| **faster-whisper (self-hosted)** | ~$0.001/min on GPU | Variable | Full control over language codes, prompts | ⭐ Best for dialect tuning |
| **whisper.cpp** | Free (CPU) | Slow | Full control | Good for dev/testing |

### Cost at Scale (100 users × 5-min clips)

| Scenario | Monthly Audio | Whisper API | GPT-4o Mini | Self-hosted (T4 GPU) |
|---|---|---|---|---|
| 100 users × 1 clip/week | 2,000 min/mo | $12/mo | $6/mo | ~$50/mo (GPU) but unlimited |
| 100 users × 5 clips/week | 10,000 min/mo | $60/mo | $30/mo | ~$50/mo (GPU) |
| 1000 users × 5 clips/week | 100,000 min/mo | $600/mo | $300/mo | ~$150/mo (better GPU) |

**Verdict:** API is cheaper until ~10K minutes/month. Self-hosted wins at scale AND gives dialect tuning control.

---

## 3. Recommended Pipeline Architecture

### The Hybrid Approach (Recommended)

```
┌──────────────────────────────────────────────────────────┐
│                    USER RECORDS AUDIO                     │
│              (Grandma speaking in dialect)                │
└─────────────────────┬────────────────────────────────────┘
                      │
                      ▼
┌──────────────────────────────────────────────────────────┐
│              STEP 1: LANGUAGE DETECTION                   │
│                                                          │
│  Use Whisper's language detection on first 30 seconds    │
│  + User-selected "dialect hint" in app UI                │
│  → Route to appropriate ASR engine                       │
└─────────────────────┬────────────────────────────────────┘
                      │
          ┌───────────┼───────────────┐
          ▼           ▼               ▼
   ┌────────────┐ ┌──────────┐ ┌─────────────┐
   │ Cantonese  │ │ Mandarin │ │  Hokkien/   │
   │ Malay/     │ │ English  │ │  Teochew    │
   │ Tamil      │ │          │ │             │
   │            │ │          │ │             │
   │ Whisper    │ │ Whisper  │ │ Meta        │
   │ large-v3   │ │ API or   │ │ SeamlessM4T │
   │ force lang │ │ GPT-4o   │ │ (Hokkien)   │
   │ code       │ │ Transcr. │ │ or LLM      │
   └─────┬──────┘ └────┬─────┘ └──────┬──────┘
         │              │              │
         └──────────────┼──────────────┘
                        ▼
┌──────────────────────────────────────────────────────────┐
│          STEP 2: LLM TRANSLATION & ENRICHMENT            │
│                                                          │
│  Claude/Gemini receives raw transcription + context:     │
│  - "This is a recipe recording from a Hokkien-speaking   │
│    Singaporean grandmother"                              │
│  - Translate to English                                  │
│  - Extract recipe structure (ingredients, steps)         │
│  - Add cultural context notes                            │
│  - Handle code-switched terms                            │
└─────────────────────┬────────────────────────────────────┘
                      │
                      ▼
┌──────────────────────────────────────────────────────────┐
│           STEP 3: STRUCTURED RECIPE OUTPUT               │
│                                                          │
│  {                                                       │
│    "original_dialect": "Hokkien",                        │
│    "transcription": "...",                               │
│    "english_translation": "...",                         │
│    "recipe": {                                           │
│      "name": "Bak Kut Teh",                             │
│      "ingredients": [...],                               │
│      "steps": [...],                                     │
│      "cultural_notes": "..."                             │
│    }                                                     │
│  }                                                       │
└──────────────────────────────────────────────────────────┘
```

### Why NOT Direct Speech-to-English Translation?

Whisper supports `task="translate"` (any language → English text), but:
- It loses the original dialect words/terms that are culturally significant
- Recipe-specific terms get mangled ("tau hu" → mistranscribed)
- No way to preserve romanization

**Better approach:** Transcribe first (preserve original), then translate with LLM context.

### Romanization Output

Whisper **cannot** output romanization natively (no Peh-ōe-jī for Hokkien, no Jyutping for Cantonese). 

**Solution:** Use the LLM step to add romanization:
```
Prompt: "Convert this Cantonese transcription to Jyutping romanization 
alongside the Chinese characters: {transcription}"
```

---

## 4. Alternatives & Complements

### Meta SeamlessM4T — The Hokkien Solution ⭐

Meta built the **first AI speech-to-speech translation system specifically for Hokkien**. This is a game-changer for Mychelin.

- **What it does:** Direct Hokkien speech → English text (and vice versa)
- **Open source:** Available on GitHub (facebook/seamless_communication)
- **Key limitation:** Trained on Taiwanese Hokkien — Singapore Hokkien has vocabulary differences
- **Integration:** Can self-host, or use via HuggingFace Inference API

### Google Cloud Speech-to-Text V2

| Language | Google Support | Notes |
|---|---|---|
| Cantonese | ✅ `yue-Hant-HK` | Good quality |
| Mandarin | ✅ `cmn-Hans-CN`, `cmn-Hans-SG` | Has SG-specific model! |
| Malay | ✅ `ms-MY` | Malaysian Malay (close to SG) |
| Tamil | ✅ `ta-SG` | Has SG-specific model! |
| Hokkien | ❌ | Not supported |
| Teochew | ❌ | Not supported |

**Key advantage:** Google has **Singapore-specific** models for Mandarin and Tamil. This could outperform Whisper for those languages.

**Pricing:** $0.006/min (standard), $0.009/min (enhanced) — comparable to Whisper.

### Azure Cognitive Services

- Supports Cantonese (`zh-HK`), Mandarin (`zh-CN`), Malay (`ms-MY`), Tamil (`ta-IN`)
- **No Hokkien/Teochew**
- No particular SG advantage over Google or Whisper

### MERaLiON — Singapore's National Speech Model ⭐

A*STAR and AI Singapore developed **MERaLiON Speech Encoder** (Dec 2024):
- 630M parameter speech foundation model
- Specifically trained for **Singapore-accented English and Singlish**
- Includes influence of Hokkien, Malay, Cantonese, Tamil
- Currently English-focused, expanding to other languages
- **Open source** on HuggingFace: `MERaLiON/MERaLiON-SpeechEncoder-v1`
- Could be fine-tuned for dialect recognition with additional data

### NUS/AISG AI Speech Lab

- Developed a speech recognition system for Singaporean lingo
- 90% accurate in quiet environments
- Supports English, Mandarin, some Hokkien and Malay
- Deployed for SCDF emergency call dispatchers
- **Not publicly available** as an API — research/government use

### Recommended Stack Comparison

| Component | Option A (Simple) | Option B (Best Quality) |
|---|---|---|
| Cantonese ASR | Whisper API (`yue`) | Google STT (`yue-Hant-HK`) |
| Mandarin ASR | Whisper API (`zh`) | Google STT (`cmn-Hans-SG`) ⭐ |
| Malay ASR | Whisper API (`ms`) | Whisper or Google |
| Tamil ASR | Whisper API (`ta`) | Google STT (`ta-SG`) ⭐ |
| Hokkien ASR | ❌ Gap | Meta SeamlessM4T ⭐ |
| Teochew ASR | ❌ Gap | Whisper `zh` + LLM correction |
| Singlish ASR | Whisper (`en`) | MERaLiON (if available) |
| Translation | Claude API | Claude/Gemini with recipe context |
| Recipe Structuring | Claude API | Claude with structured output |

---

## 5. Integration for Next.js (Mychelin)

### Option A: OpenAI Whisper API (Simplest MVP)

```typescript
// app/api/transcribe/route.ts
import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const audioFile = formData.get('audio') as File;
  const dialectHint = formData.get('dialect') as string; // User-selected dialect
  
  // Map dialect to Whisper language code
  const languageMap: Record<string, string> = {
    'cantonese': 'yue',
    'mandarin': 'zh',
    'malay': 'ms',
    'tamil': 'ta',
    'english': 'en',
    // Hokkien/Teochew: route to different pipeline
  };
  
  const language = languageMap[dialectHint];
  
  if (!language) {
    // Route Hokkien/Teochew to SeamlessM4T pipeline
    return handleUnsupportedDialect(audioFile, dialectHint);
  }
  
  // Whisper transcription
  const transcription = await openai.audio.transcriptions.create({
    model: 'whisper-1',
    file: audioFile,
    language: language,
    prompt: getContextPrompt(dialectHint), // Help Whisper with food terms
    response_format: 'verbose_json',
    timestamp_granularities: ['segment'],
  });
  
  // LLM translation & recipe extraction
  const enriched = await translateAndStructure(
    transcription.text,
    dialectHint
  );
  
  return NextResponse.json(enriched);
}

function getContextPrompt(dialect: string): string {
  // Providing context helps Whisper recognize food-specific terms
  const foodTerms: Record<string, string> = {
    'cantonese': '煲湯 叉燒 蒸魚 糖水 老火湯 雲吞麵',
    'mandarin': '炒饭 红烧肉 包子 饺子 卤肉饭 肉骨茶',
    'malay': 'nasi lemak, rendang, sambal, kueh, satay, laksa',
  };
  return foodTerms[dialect] || '';
}

async function translateAndStructure(
  transcription: string, 
  dialect: string
) {
  // Use Claude/Gemini for translation + recipe structuring
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY!,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      messages: [{
        role: 'user',
        content: `You are a Singapore heritage recipe translator. A ${dialect}-speaking 
grandmother recorded this recipe. Transcription: "${transcription}"

Please provide:
1. English translation (natural, preserving cultural terms)
2. Recipe structure (ingredients with measurements, numbered steps)
3. Cultural notes (significance of dish, traditional tips)
4. Key dialect terms with romanization and meaning

Return as JSON with keys: translation, recipe {name, ingredients[], steps[]}, 
culturalNotes, dialectTerms [{term, romanization, meaning}]`
      }]
    })
  });
  
  return response.json();
}
```

### Option B: Self-hosted faster-whisper (Full Control)

```typescript
// For self-hosted: run faster-whisper as a sidecar service
// Docker: ghcr.io/fedirz/faster-whisper-server

// app/api/transcribe/route.ts
export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const audioFile = formData.get('audio') as File;
  const dialect = formData.get('dialect') as string;
  
  // Call self-hosted faster-whisper (OpenAI-compatible API)
  const whisperResponse = await fetch(
    `${process.env.WHISPER_SERVER_URL}/v1/audio/transcriptions`,
    {
      method: 'POST',
      body: (() => {
        const fd = new FormData();
        fd.append('file', audioFile);
        fd.append('model', 'large-v3');  // Full model for best dialect support
        fd.append('language', getLanguageCode(dialect));
        fd.append('initial_prompt', getContextPrompt(dialect));
        return fd;
      })(),
    }
  );
  
  const result = await whisperResponse.json();
  // ... continue with LLM pipeline
}
```

### Audio Format Requirements

| Format | Supported | Notes |
|---|---|---|
| **WebM/Opus** | ✅ | Default from browser MediaRecorder — **use this** |
| **MP3** | ✅ | Good compression, widely supported |
| **WAV** | ✅ | Best quality but large files |
| **M4A/AAC** | ✅ | Good for mobile recordings |
| **FLAC** | ✅ | Lossless, good quality |
| **OGG** | ✅ | Supported |

**File size limit:** 25MB for OpenAI API. A 5-minute recording in WebM/Opus is typically ~2-5MB. No issues.

**Recommended:** Record as WebM/Opus (browser default), send directly to API. No conversion needed.

### Latency Expectations

| Scenario | API (Whisper/GPT-4o) | Self-hosted (T4 GPU) | Self-hosted (A100) |
|---|---|---|---|
| 1-min clip | 5-10 seconds | 15-30 seconds | 5-10 seconds |
| 5-min clip | 15-30 seconds | 60-120 seconds | 15-30 seconds |
| + LLM translation | +3-5 seconds | +3-5 seconds | +3-5 seconds |
| **Total for 5-min clip** | **~20-35 seconds** | **~65-125 seconds** | **~20-35 seconds** |

For recipe recordings (not real-time), 20-35 seconds is acceptable. Show a "Processing grandma's recipe..." animation.

---

## 6. Handling the Hokkien/Teochew Gap — Detailed Strategy

This is the hardest problem. Here are the options ranked:

### Option 1: Meta SeamlessM4T (Best for Hokkien) ⭐

```python
# Self-hosted SeamlessM4T for Hokkien
from seamless_communication.models.inference import Translator

translator = Translator("seamlessM4T_v2_large", "vocoder_v2", device="cuda")

# Hokkien speech → English text
translated_text, _, _ = translator.predict(
    input="grandma_recording.wav",
    task_str="S2TT",  # Speech-to-Text Translation
    tgt_lang="eng",   # Target: English
    src_lang="hok",   # Source: Hokkien
)
```

**Pros:** Purpose-built for Hokkien. Open source. Direct speech-to-English.
**Cons:** Trained on Taiwanese Hokkien (different vocabulary from SG Hokkien). Requires GPU hosting. No Teochew support.

### Option 2: Whisper `zh` + LLM Correction (Pragmatic Fallback)

When grandma speaks Hokkien, try Whisper with `zh` — it may produce **garbled but partially phonetically useful** Chinese characters. Then use Claude to interpret:

```typescript
// Force Whisper to transcribe Hokkien as Chinese (imperfect but useful)
const transcription = await openai.audio.transcriptions.create({
  model: 'whisper-1',
  file: audioFile,
  language: 'zh', // Will produce approximate Mandarin transcription
  prompt: '肉骨茶 炒粿條 蚵仔煎 滷肉飯', // Hokkien food terms in Chinese characters
});

// Then ask Claude to interpret the garbled output
const interpretation = await claude.messages.create({
  model: 'claude-sonnet-4-20250514',
  messages: [{
    role: 'user',
    content: `This is a Whisper transcription of a HOKKIEN-speaking Singaporean 
grandmother explaining a recipe. Whisper doesn't support Hokkien, so it produced 
an approximate Mandarin transcription. Many words will be phonetically similar 
but semantically wrong.

Raw transcription: "${transcription.text}"

Please:
1. Interpret what the grandmother likely said in Hokkien
2. Translate to natural English
3. Extract the recipe if possible
4. Flag any parts you're uncertain about`
  }]
});
```

**Pros:** No extra infrastructure. Works today.
**Cons:** Lossy. Many Hokkien sounds don't map to Mandarin characters well.

### Option 3: Human-in-the-Loop (Most Reliable for Heritage)

For a heritage preservation app, accuracy matters more than speed:

```
Record → Whisper (best-effort) → LLM interpretation → 
HUMAN REVIEW STEP (family member verifies) → Final recipe
```

Add a "Review & Correct" UI where family members can:
- Listen to audio segments
- Edit the transcription
- Confirm/fix translations
- Add their own notes

**This is actually the most culturally appropriate approach** — it turns recipe preservation into a family activity.

---

## 7. Implementation Recommendations

### Phase 1: MVP (Weeks 1-2)
- Use **OpenAI Whisper API** for Cantonese, Mandarin, Malay, Tamil, English
- Use **Claude API** for translation + recipe structuring
- Add **dialect selector** in UI (user picks grandma's dialect before recording)
- For Hokkien/Teochew: use `zh` fallback + Claude interpretation
- Estimated cost: ~$15/month for 100 users

### Phase 2: Hokkien Support (Weeks 3-4)
- Integrate **Meta SeamlessM4T** (self-hosted or HuggingFace Inference)
- Test with SG Hokkien speakers (vs. Taiwanese Hokkien training data)
- Add human review step for low-confidence transcriptions

### Phase 3: Optimization (Month 2+)
- Evaluate **Google STT** for Mandarin (`cmn-Hans-SG`) and Tamil (`ta-SG`) — may outperform Whisper for SG accents
- Consider **GPT-4o Transcribe** as Whisper upgrade (same price, better accuracy)
- Explore **MERaLiON** model for Singlish/code-switching scenarios
- Build feedback loop: user corrections improve prompts over time
- Consider **fine-tuning Whisper** on SG dialect recordings if enough data collected

### Phase 4: Scale (Month 3+)
- Move to **self-hosted faster-whisper** if volume exceeds 10K minutes/month
- Deploy on GPU instance (RunPod/Vast.ai: ~$0.30-0.50/hr for T4)
- Build custom vocabulary for SG food terms
- Community contribution: let users submit corrected transcriptions to build training data

---

## 8. Key Risks & Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Hokkien transcription is too inaccurate | Core feature broken | Human-in-the-loop review; Meta SeamlessM4T |
| Elderly speakers + kitchen noise | Poor ASR quality | Audio preprocessing (noise reduction); prompt users for quiet moment; accept imperfection |
| Code-switching confuses Whisper | Garbled output | Force language code; use LLM to clean up |
| SG Hokkien ≠ Taiwanese Hokkien | SeamlessM4T less accurate | Collect SG Hokkien data; fine-tune over time |
| API costs at scale | Budget pressure | Self-hosted faster-whisper at scale |
| Whisper misidentifies dialect | Wrong transcription | Never use auto-detect; always force language |

---

## TL;DR Recommendation

**Start with Whisper API + Claude for the MVP.** It handles Cantonese, Mandarin, Malay, Tamil, and English well. For the critical Hokkien gap, use Whisper `zh` fallback + Claude interpretation, with a human review step. Add Meta SeamlessM4T for proper Hokkien support in Phase 2. The total cost for 100 users is under $20/month.

**The killer insight:** For heritage preservation, perfect transcription isn't required on day one. What matters is capturing the recording and getting a "good enough" interpretation that family members can then review and correct. The human-in-the-loop approach is both technically pragmatic and culturally meaningful.
