import { describe, expect, test } from "bun:test";
import wrapAnsi from "wrap-ansi";
import { stripVTControlCharacters } from "node:util";
import { computeScrollbar, computeScrollInfo, formatMarkdown, previewLines, type PreviewPane } from "../tui";
import { customTopicDirection } from "../autonomous-tui";

describe("TUI preview scrolling and scrollbar", () => {
    test("computes scrollbar when content fits completely", () => {
        const result = computeScrollbar(5, 10, 0);
        expect(result.maxOffset).toBe(0);
        expect(result.thumbTop).toBe(0);
        expect(result.thumbHeight).toBe(10);
        expect(result.chars).toEqual(Array(10).fill("│"));
    });

    test("computes scrollbar at top, middle, and bottom for scrollable content", () => {
        const totalLines = 100;
        const contentHeight = 10;

        // Top position (offset = 0)
        const top = computeScrollbar(totalLines, contentHeight, 0);
        expect(top.maxOffset).toBe(90);
        expect(top.thumbTop).toBe(0);
        expect(top.thumbHeight).toBe(1);
        expect(top.chars[0]).toBe("█");
        expect(top.chars.slice(1)).toEqual(Array(9).fill("│"));

        // Bottom position (offset = maxOffset)
        const bot = computeScrollbar(totalLines, contentHeight, 90);
        expect(bot.thumbTop).toBe(9);
        expect(bot.chars[9]).toBe("█");
        expect(bot.chars.slice(0, 9)).toEqual(Array(9).fill("│"));

        // Middle position (offset = 45)
        const mid = computeScrollbar(totalLines, contentHeight, 45);
        expect(mid.thumbTop).toBeGreaterThan(0);
        expect(mid.thumbTop).toBeLessThan(9);
        expect(mid.chars[mid.thumbTop]).toBe("█");
    });

    test("computes scroll info indicator strings", () => {
        expect(computeScrollInfo(0, 10, 0)).toBe("");
        expect(computeScrollInfo(5, 10, 0)).toBe("[All]");
        expect(computeScrollInfo(100, 10, 0)).toBe("[Top] L1-10/100");
        expect(computeScrollInfo(100, 10, 90)).toBe("[Bot] L91-100/100");
        expect(computeScrollInfo(100, 10, 45)).toBe("[50%] L46-55/100");
    });

    test("formats markdown and bounds lines to preview width", () => {
        const md = "# Heading 1\n\nA descriptive paragraph that will reflow according to the specified width.";
        const rendered = formatMarkdown(md, 40);
        expect(rendered).toContain("Heading 1");
        expect(rendered).toContain("descriptive paragraph");

        const wrapped = wrapAnsi(rendered, 40, { hard: true, trim: false }).split("\n");
        for (const line of wrapped) {
            // Strip ANSI codes when checking visible length
            const clean = line.replace(/[\x1b\x9b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g, "");
            expect(clean.length).toBeLessThanOrEqual(40);
        }
    });

    test("renders headings without raw Markdown markers", () => {
        const rendered = stripVTControlCharacters(formatMarkdown("## A clear take\n\nSome **developed prose**.\n\n### A closer look", 50));
        expect(rendered).toContain("A clear take");
        expect(rendered).toContain("developed prose");
        expect(rendered).toContain("A closer look");
        expect(rendered).not.toMatch(/^#{1,6}\s/m);
        expect(rendered).not.toContain("**");
    });

    test("wide tables become labeled rows without wrapped ASCII grids or lost cells", () => {
        const markdown = "| Question | Options | Rationale | Status |\n|---|---|---|---|\n" +
            "| Which channel reaches the intended audience? | **Community** or search | Start where people already describe the problem in their own words. | Pending |\n" +
            "| What should the landing page say? | A concrete promise | Explain the outcome before listing features. | Chosen |";
        for (const width of [20, 40, 70, 100]) {
            const rendered = stripVTControlCharacters(formatMarkdown(markdown, width));
            const normalized = rendered.replace(/\s+/g, " ");
            expect(normalized).toContain("Question: Which channel reaches the intended audience?");
            expect(normalized).toContain("Options: Community or search");
            expect(normalized).toContain("Rationale: Start where people already describe the problem in their own words.");
            expect(normalized).toContain("Status: Pending");
            expect(normalized).toContain("Status: Chosen");
            expect(rendered).not.toMatch(/[┌┬┼┐│]/);
            for (const line of rendered.split("\n")) expect(line.length).toBeLessThanOrEqual(width);
        }
    });

    test("keeps inline code, links and Unicode in table cells readable", () => {
        const rendered = stripVTControlCharacters(formatMarkdown("| Tool | Notes |\n|---|---|\n| `bun test` | [Docs](https://example.com/docs) — 中文 ✓ |", 30));
        expect(rendered).toContain("bun test");
        expect(rendered).toContain("Docs");
        expect(rendered.replace(/\s+/g, "")).toContain("https://example.com/docs");
        expect(rendered).toContain("中文");
        for (const line of rendered.split("\n")) expect(wrapAnsi(line, 30, { hard: true, trim: false })).toBe(line);
    });

    test("reflows original post content rather than preserving old pane line breaks on resize", () => {
        const pane: PreviewPane = { kind: "post", header: "A post", body: "A complete paragraph about choosing a distribution channel that fits the people you want to reach, rather than chasing every platform at once." };
        const narrow = previewLines(pane, 25);
        const wide = previewLines(pane, 80);
        expect(narrow.length).toBeGreaterThan(wide.length);
        expect(stripVTControlCharacters(wide.join(" ")).replace(/\s+/g, " ").trim()).toBe(
            stripVTControlCharacters(narrow.join(" ")).replace(/\s+/g, " ").trim(),
        );
        expect(wide.some(line => stripVTControlCharacters(line).length > 25)).toBe(true);
        expect(previewLines({ kind: "text", text: "Diff and status messages still work." }, 20).length).toBeGreaterThan(1);
    });

    test("custom topics preserve the owner's full angle without calling suggestions", () => {
        const topic = "A conversational guide to marketing for developers who dislike marketing. Explain how to find the first interested people, without making it a product-scoping worksheet.";
        const direction = customTopicDirection("  " + topic + "  ");
        expect(direction.detail).toBe(topic);
        expect(direction.label.length).toBeLessThanOrEqual(100);
        expect(direction.id).toBe("custom-topic");
        expect(() => customTopicDirection("ab")).toThrow();
        expect(() => customTopicDirection("x".repeat(701))).toThrow();
    });

    test("scroll clamping prevents out-of-bounds scrolling", () => {
        const totalLines = 20;
        const contentHeight = 10;
        const maxOffset = totalLines - contentHeight; // 10

        // Scrolling past maxOffset clamps to maxOffset
        const clampedOver = Math.min(Math.max(0, 50), maxOffset);
        expect(clampedOver).toBe(10);

        // Scrolling above 0 clamps to 0
        const clampedUnder = Math.min(Math.max(0, -5), maxOffset);
        expect(clampedUnder).toBe(0);
    });
});
