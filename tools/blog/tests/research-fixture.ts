/**
 * Test fixtures and mock helpers for research agent unit tests.
 */

import type { ResearchTurn, Dossier } from "../research-agent";
import type { ResearchResult } from "../research";

/** Mock pages used across research tests. */
export const pages: ResearchResult["sources"] = Array.from(
  { length: 5 },
  (_, i) => ({
    url: `https://${i % 2 ? "docs" : "study"}.example.com/source-${i}`,
    title: `Fixture source ${i}`,
    kind: "page" as const,
    text: `Fixture evidence number ${i} explains bounded retries and meaningful failure handling.`,
    retrievedAt: "2026-01-01T00:00:00Z",
  }),
);

/** Valid completed research dossier matching fixture pages. */
export const dossier: Dossier = {
  sufficient: true,
  angle: "Explain bounded retries without inventing measurements.",
  writerPersona:
    "API reliability editorial lens: distinguish retries, idempotency and failure modes.",
  primaryKeyword: "bounded email retries",
  findings: pages.slice(0, 3).map((p) => ({
    claim: p.text,
    url: p.url,
    quote: p.text,
    caveat: "Fixture evidence only",
  })),
  gaps: [],
  marketing: {
    fit: "none",
    rationale: "No confirmed product implementation evidence.",
  },
};

/** Build a mock assistant completion message containing function tool calls. */
export const toolMessage = (
  calls: { name: string; args: unknown }[],
): Awaited<ReturnType<ResearchTurn>> => ({
  model: "mock-researcher",
  message: {
    role: "assistant",
    content: null,
    tool_calls: calls.map((c, i) => ({
      id: `call-${i}`,
      type: "function",
      function: { name: c.name, arguments: JSON.stringify(c.args) },
    })),
  },
});

/** Create a scripted multi-turn research handler that simulates search, page reads, and finishing. */
export function scriptedTurn(final = dossier): ResearchTurn {
  let step = 0;
  return async () => {
    switch (step++) {
      case 0:
        return toolMessage(
          [
            "official current documentation",
            "practical benchmark methodology",
            "limitations and counterexamples",
          ].map((query) => ({ name: "search_web", args: { query } })),
        );
      case 1:
        return toolMessage(
          pages
            .slice(0, 4)
            .map((p) => ({ name: "read_page", args: { url: p.url } })),
        );
      case 2:
        return toolMessage([
          { name: "read_page", args: { url: pages[4].url } },
        ]);
      default:
        return toolMessage([{ name: "finish_research", args: final }]);
    }
  };
}

/** Mock search function returning discovery leads without page text. */
export const fixtureSearch = async (): Promise<ResearchResult> => ({
  sources: pages.map((p) => ({
    ...p,
    kind: "search-result",
    text: "Discovery lead only",
  })),
  warnings: [],
});

/** Mock page fetcher returning pre-canned page text. */
export const fixtureRead = async (url: string) => {
  const page = pages.find((p) => p.url === url);
  if (!page) {
    throw new Error("Unexpected fixture URL " + url);
  }
  return { ...page, kind: "page" as const, retrievedAt: page.retrievedAt! };
};

/** Bundle mock dependencies for unit testing research agent execution. */
export const researchDeps = () => ({
  researchTurn: scriptedTurn(),
  research: fixtureSearch,
  suppliedSource: fixtureRead,
});
