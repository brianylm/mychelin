import { describe, it, expect } from "vitest";
import {
  mergeTranscriptSegments,
  pickCanonicalTranscript,
  nameTranscript,
  transcriptWeight,
} from "./conversation-transcript";

describe("mergeTranscriptSegments", () => {
  it("collapses consecutive same-speaker segments", () => {
    const merged = mergeTranscriptSegments([
      { speaker: "Ah Ma", text: "First fry garlic." },
      { speaker: "Ah Ma", text: "Then pork belly." },
      { speaker: "Brian", text: "How much garlic?" },
      { speaker: "Ah Ma", text: "Three cloves." },
    ]);
    expect(merged).toHaveLength(3);
    expect(merged[0].text).toBe("First fry garlic. Then pork belly.");
    expect(merged[2].speaker).toBe("Ah Ma");
  });

  it("drops empty segments and normalizes the speaker label", () => {
    const merged = mergeTranscriptSegments([
      { speaker: "", text: "hello" },
      { speaker: "  ", text: "   " },
    ]);
    expect(merged).toHaveLength(1);
    expect(merged[0].speaker).toBe("Speaker 1");
  });
});

describe("pickCanonicalTranscript", () => {
  const live = [{ speaker: "Live transcript", text: "rough caption" }];

  it("prefers the backup (dialect-strong) transcript", () => {
    const backup = [{ speaker: "Ah Ma", text: "precise dialect line" }];
    expect(pickCanonicalTranscript({ backup, live })[0].text).toBe("precise dialect line");
  });

  it("falls back to live captions when backup is empty", () => {
    expect(pickCanonicalTranscript({ backup: [], live })[0].text).toBe("rough caption");
  });
});

describe("pickCanonicalTranscript when the AI backup is thin", () => {
  const englishCaptions = [
    {
      speaker: "Live transcript",
      text: "Okay so this is my mum's chicken rice. First you take one whole chicken, rub it with coarse salt, then poach it for thirty five minutes.",
    },
  ];

  it("uses full live captions over a few stray backup characters (B's 21 Nov report)", () => {
    const backup = [{ speaker: "Speaker 1", text: "雞 鹽 水" }];
    expect(pickCanonicalTranscript({ backup, live: englishCaptions })[0].speaker).toBe("Live transcript");
  });

  it("keeps a full dialect backup over mangled English captions of similar length", () => {
    const backup = [{ speaker: "Speaker 1", text: "先把五花肉切塊用醬油和老抽醃一下然後鍋裡放油炒香蒜頭和紅蔥頭" }];
    const live = [{ speaker: "Live transcript", text: "see in a high fa you cut quiet young jail and lousy soy" }];
    expect(pickCanonicalTranscript({ backup, live })[0].speaker).toBe("Speaker 1");
  });
});

describe("transcriptWeight", () => {
  it("counts English words and Chinese characters", () => {
    expect(transcriptWeight([{ speaker: "a", text: "two cloves, garlic!" }])).toBe(3);
    expect(transcriptWeight([{ speaker: "a", text: "五花肉 pork belly" }])).toBe(5);
    expect(transcriptWeight([{ speaker: "a", text: " ... " }])).toBe(0);
  });
});

describe("nameTranscript", () => {
  it("maps speaker labels through the name map, trimming blanks", () => {
    const named = nameTranscript(
      [
        { speaker: "Speaker 1", text: "hi" },
        { speaker: "Speaker 2", text: "yo" },
      ],
      { "Speaker 1": "Ah Ma", "Speaker 2": "  " }
    );
    expect(named[0].speaker).toBe("Ah Ma");
    expect(named[1].speaker).toBe("Speaker 2");
  });
});
