import { describe, it, expect } from "vitest";
import {
  mergeTranscriptSegments,
  pickCanonicalTranscript,
  nameTranscript,
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
