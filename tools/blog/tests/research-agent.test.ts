import { describe, expect, test } from "bun:test";
import { runResearchAgent } from "../research-agent";
import { dossier, fixtureRead, fixtureSearch, pages, scriptedTurn, toolMessage } from "./research-fixture";

const input = { topic: "Current model economics", currentDate: "2026-01-01" };
describe("bounded research tool agent", () => {
  test("LLM queries, follow-up reads and grounded dossier; independent reads run concurrently", async () => {
    let active = 0, peak = 0;
    const result = await runResearchAgent(input, [], {
      turn: scriptedTurn(), search: fixtureSearch,
      read: async url => {
        active++; peak = Math.max(peak, active);
        await Bun.sleep(5);
        active--;
        return fixtureRead(url);
      },
    });
    expect(peak).toBe(4);
    expect(result.complete).toBe(true);
    expect(result.queries).toHaveLength(3);
    expect(result.sources.filter(s => s.kind === "page")).toHaveLength(5);
    expect(result.models).toEqual(["mock-researcher"]);
    expect(result.trace.at(-1)?.tool).toBe("finish_research");
  });

  test("fetches supplied URLs concurrently and reuses pages within the run", async () => {
    let reads = 0, active = 0, peak = 0;
    const result = await runResearchAgent(input, pages.map(p => p.url), {
      turn: scriptedTurn(), search: fixtureSearch,
      read: async url => { reads++; active++; peak = Math.max(peak, active); await Bun.sleep(5); active--; return fixtureRead(url); },
    });
    expect(result.complete).toBe(true);
    expect(reads).toBe(5);
    expect(peak).toBe(5);
  });

  test("fabricated quotation cannot finish research; malformed and unknown tools receive errors", async () => {
    let step = 0;
    const result = await runResearchAgent(input, pages.map(p => p.url), {
      read: fixtureRead, search: fixtureSearch,
      turn: async () => {
        step++;
        if (step === 1) return toolMessage([{ name: "shell", args: { command: "echo nope" } }, { name: "search_web", args: { query: "x" } }]);
        return toolMessage([{ name: "finish_research", args: { ...dossier, findings: [{ ...dossier.findings[0], quote: "This quote was invented by the model." }] } }]);
      },
    });
    expect(result.complete).toBe(false);
    expect(result.dossier).toBeUndefined();
    expect(step).toBe(10);
    expect(result.trace.some(t => t.error?.includes("Unknown research tool"))).toBe(true);
    expect(result.trace.some(t => t.error?.includes("Unsupported quotation"))).toBe(true);
  });

  test("snippets are never accepted as supporting evidence", async () => {
    const result = await runResearchAgent(input, [], {
      turn: scriptedTurn(), search: fixtureSearch, read: async () => { throw new Error("Page blocked"); },
    });
    expect(result.complete).toBe(false);
    expect(result.dossier).toBeUndefined();
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  test("search budgets and duplicate-query cache apply across turns", async () => {
    let turn = 0, searches = 0;
    const result = await runResearchAgent(input, [], {
      search: async () => { searches++; return { sources: [], warnings: [] }; },
      turn: async () => {
        turn++;
        return toolMessage([{ name: "search_web", args: { query: "repeat query" } }, { name: "search_web", args: { query: `new query ${turn}` } }]);
      },
    });
    expect(turn).toBe(10);
    expect(searches).toBe(8);
    expect(result.queries).toHaveLength(8);
    expect(result.complete).toBe(false);
  });

  test("provider failure is a visible hold, not synthetic successful research", async () => {
    const result = await runResearchAgent(input, [], { turn: async () => { throw new Error("offline"); } });
    expect(result.complete).toBe(false);
    expect(result.warnings.join(" ")).toContain("offline");
  });

  test("rejects non-HTTPS tools without invoking the reader", async () => {
    let reads = 0;
    const result = await runResearchAgent(input, [], {
      read: async url => { reads++; return fixtureRead(url); },
      turn: async () => toolMessage([{ name: "read_page", args: { url: "file:///etc/passwd" } }]),
    });
    expect(reads).toBe(0);
    expect(result.trace[0].error).toContain("HTTPS");
  });

  test("valid quotations still fail coverage gate when investigation is too narrow", async () => {
    const result = await runResearchAgent(input, [pages[0].url], {
      read: fixtureRead,
      turn: async () => toolMessage([{ name: "finish_research", args: { ...dossier, findings: [dossier.findings[0]] } }]),
    });
    expect(result.dossier).toBeDefined();
    expect(result.complete).toBe(false);
    expect(result.warnings.join(" ")).toContain("Research incomplete");
  });
});
