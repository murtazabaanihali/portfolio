import React, { useEffect, useMemo, useState } from "react";
import { Box, Text, render, useApp, useInput, useStdout, useStdin } from "ink";
import { Marked } from "marked";
import { markedTerminal } from "marked-terminal";
import wrapAnsi from "wrap-ansi";
import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { BlogService, rejectDraft, type Plan } from "./core";
import { R2Storage } from "./storage";
import { approve, listWorkspaces, loadWorkspace, setStatus } from "./workspace";
import { generate, generateBatch, generateCover, revise } from "./ai";
import { AutonomousWizard } from "./autonomous-tui";

export function formatMarkdown(body: string, width = 80): string {
    const m = new Marked();
    m.use(
        markedTerminal({
            // Wrap once after rendering, at the actual pane width (including tables/code).
            reflowText: false,
            showSectionPrefix: false,
            width: Math.max(1, width),
        }) as never,
    );
    m.use({ renderer: {
        // Wide ASCII grids become unreadable when Ink hard-wraps their borders.
        // Labeled rows preserve every cell and work at any terminal width.
        table({ header, rows }) {
            const labels = header.map(cell => this.parser.parseInline(cell.tokens));
            if (!rows.length) return "\n" + labels.join("\n") + "\n\n";
            return "\n" + rows.map(row => row.map((cell, i) =>
                `${labels[i] || `Column ${i + 1}`}: ${this.parser.parseInline(cell.tokens)}`,
            ).join("\n")).join("\n\n") + "\n\n";
        },
    } });
    return wrapAnsi(String(m.parse(body)), Math.max(1, width), { hard: true, trim: false });
}

export type PreviewPane = { kind: "text"; text: string } | { kind: "post"; header: string; body: string };
export function previewLines(pane: PreviewPane, width: number) {
    const text = pane.kind === "post" ? `${pane.header}\n\n${formatMarkdown(pane.body, width)}` : pane.text;
    return wrapAnsi(text, Math.max(1, width), { hard: true, trim: false }).split("\n");
}

export function computeScrollbar(
    totalLines: number,
    contentHeight: number,
    offset: number,
): {
    thumbTop: number;
    thumbHeight: number;
    maxOffset: number;
    chars: string[];
} {
    const maxOffset = Math.max(0, totalLines - contentHeight);
    const clampedOffset = Math.min(Math.max(0, offset), maxOffset);
    if (totalLines <= contentHeight) {
        return {
            thumbTop: 0,
            thumbHeight: contentHeight,
            maxOffset: 0,
            chars: Array(contentHeight).fill("│"),
        };
    }
    const thumbHeight = Math.max(
        1,
        Math.min(
            contentHeight,
            Math.round((contentHeight / totalLines) * contentHeight),
        ),
    );
    const thumbTop =
        maxOffset === 0
            ? 0
            : Math.min(
                  contentHeight - thumbHeight,
                  Math.round(
                      (clampedOffset / maxOffset) *
                          (contentHeight - thumbHeight),
                  ),
              );
    const chars: string[] = [];
    for (let r = 0; r < contentHeight; r++) {
        if (r >= thumbTop && r < thumbTop + thumbHeight) {
            chars.push("█");
        } else {
            chars.push("│");
        }
    }
    return { thumbTop, thumbHeight, maxOffset, chars };
}

export function computeScrollInfo(
    totalLines: number,
    contentHeight: number,
    offset: number,
): string {
    if (totalLines === 0) return "";
    if (totalLines <= contentHeight) return "[All]";
    const maxOffset = Math.max(0, totalLines - contentHeight);
    const clampedOffset = Math.min(Math.max(0, offset), maxOffset);
    const lineStart = clampedOffset + 1;
    const lineEnd = Math.min(totalLines, clampedOffset + contentHeight);
    const pct =
        maxOffset > 0 ? Math.round((clampedOffset / maxOffset) * 100) : 100;
    const pos =
        clampedOffset === 0
            ? "Top"
            : clampedOffset >= maxOffset
              ? "Bot"
              : `${pct}%`;
    return `[${pos}] L${lineStart}-${lineEnd}/${totalLines}`;
}

type Row = Awaited<ReturnType<typeof listWorkspaces>>[number];
const safeTerminal = (s: string) =>
    s.replace(/[\x00-\x08\x0b-\x1f\x7f-\x9f]/g, "");
function App() {
    const { exit } = useApp(),
        { write, stdout } = useStdout(),
        { setRawMode } = useStdin();
    const [autonomous, setAutonomous] = useState(false);
    const [rows, setRows] = useState<Row[]>([]),
        [selected, setSelected] = useState<Set<string>>(new Set());
    const [cursor, setCursor] = useState(0),
        [status, setMessage] = useState(
            "Ready · local drafts stay local until committed",
        );
    const [pane, setPane] = useState<PreviewPane | null>(null),
        [offset, setOffset] = useState(0),
        [busy, setBusy] = useState(false);
    const [focusedPane, setFocusedPane] = useState<"list" | "preview">("list");
    const [plan, setPlan] = useState<Plan>(),
        [input, setInput] = useState(""),
        [prompt, setPrompt] = useState<
            "generate" | "revise" | "confirm" | "reject" | null
        >(null);
    const refresh = async () => setRows(await listWorkspaces());
    useEffect(() => {
        void refresh();
    }, []);

    const terminal = stdout as typeof process.stdout;
    const [terminalSize, setTerminalSize] = useState(() => ({ cols: terminal.columns || 80, rows: terminal.rows || 30 }));
    useEffect(() => {
        const resize = () => setTerminalSize({ cols: terminal.columns || 80, rows: terminal.rows || 30 });
        terminal.on("resize", resize);
        return () => { terminal.off("resize", resize); };
    }, [terminal]);
    const { cols, rows: rowsCount } = terminalSize;
    const height = Math.max(5, rowsCount - 14);
    const contentHeight = Math.max(4, height - 1);
    const availableWidth = Math.max(10, cols - 4);
    const leftWidth = Math.floor(availableWidth * 0.3);
    const rightWidth = availableWidth - leftWidth;
    // Right pane padding (2) plus scrollbar and its margin (2).
    const previewWidth = Math.max(1, rightWidth - 4);

    const current = rows[Math.min(cursor, rows.length - 1)];
    const targets = () =>
        selected.size ? [...selected] : current ? [current.id] : [];
    const svc = () => new BlogService(new R2Storage());
    const task = (fn: () => Promise<void>) => {
        setBusy(true);
        void fn()
            .catch((e) => setMessage(String(e)))
            .finally(() => {
                setBusy(false);
                void refresh();
            });
    };
    const show = (s: string) => {
        setPane({ kind: "text", text: s });
        setOffset(0);
        setFocusedPane("preview");
    };
    const external = async (command: string, args: string[]) => {
        setRawMode(false);
        try {
            await new Promise<void>((resolve, reject) => {
                const child = spawn(command, args, { stdio: "inherit" });
                child.on("error", reject);
                child.on("exit", (code) =>
                    code === 0
                        ? resolve()
                        : reject(new Error("External program exited " + code)),
                );
            });
        } finally {
            setRawMode(true);
        }
    };

    const allLines = useMemo(() => {
        if (!pane) return [];
        return previewLines(pane, previewWidth);
    }, [pane, previewWidth]);

    const maxOffset = Math.max(0, allLines.length - contentHeight);
    const clampedOffset = Math.min(Math.max(0, offset), maxOffset);

    const visibleLines = useMemo(() => {
        if (!pane) return [];
        const lines = allLines.slice(
            clampedOffset,
            clampedOffset + contentHeight,
        );
        while (lines.length < contentHeight) lines.push("");
        return lines;
    }, [allLines, clampedOffset, contentHeight, pane]);

    const scrollbar = useMemo(
        () => computeScrollbar(allLines.length, contentHeight, clampedOffset),
        [allLines.length, contentHeight, clampedOffset],
    );

    const scrollInfo = useMemo(
        () => computeScrollInfo(allLines.length, contentHeight, clampedOffset),
        [allLines.length, contentHeight, clampedOffset],
    );

    useInput((key, info) => {
        if (busy || autonomous) return;
        if (prompt) {
            if (info.escape) {
                setPrompt(null);
                setInput("");
                return;
            }
            if (info.return) {
                const value = input,
                    mode = prompt;
                setPrompt(null);
                setInput("");
                task(async () => {
                    if (mode === "generate") {
                        setMessage(
                            "Generating / researching (paid model calls explicitly requested)…",
                        );
                        const brief = JSON.parse(await readFile(value, "utf8"));
                        const result = Array.isArray(brief)
                            ? await generateBatch(brief, (i, state) =>
                                  setMessage(`Item ${i + 1}: ${state}`),
                              )
                            : await generate(brief, undefined, undefined, { onStatus: setMessage });
                        show(JSON.stringify(result, null, 2));
                        setMessage(
                            "Generation completed; inspect results and any retry notices.",
                        );
                    } else if (mode === "revise" && current) {
                        setMessage("AI revision in progress…");
                        const result = await revise(current.id, value, { onStatus: setMessage });
                        show(JSON.stringify(result, null, 2));
                        setPlan(undefined);
                        setMessage("Revised; previous approval invalidated.");
                    } else if (
                        mode === "confirm" &&
                        value === "publish" &&
                        plan
                    ) {
                        const result = await svc().commit(plan, false);
                        show(JSON.stringify(result, null, 2));
                        setPlan(undefined);
                        setSelected(new Set());
                        setMessage(
                            "Committed. Cleanup warnings, if any, appear above.",
                        );
                    } else if (mode === "reject") {
                        if (value.trim().toLowerCase() === "reject" || value.trim().toLowerCase() === "y") {
                            const toReject = targets();
                            setMessage(`Rejecting ${toReject.length} draft(s) everywhere…`);
                            let count = 0;
                            let serviceInstance: BlogService | undefined;
                            try { serviceInstance = svc(); } catch {}
                            for (const id of toReject) {
                                try {
                                    await rejectDraft(id, serviceInstance);
                                    count++;
                                } catch (e) {
                                    setMessage(`Failed to reject ${id}: ${String(e)}`);
                                }
                            }
                            setSelected(new Set());
                            setPlan(undefined);
                            setPane(null);
                            setFocusedPane("list");
                            setCursor((c) => Math.max(0, c - 1));
                            setMessage(`Rejected and removed ${count} draft(s) everywhere.`);
                        } else {
                            setMessage("Not confirmed. No drafts removed.");
                        }
                    } else setMessage("Not confirmed. Nothing published.");
                });
                return;
            }
            if (info.backspace || info.delete) setInput((s) => s.slice(0, -1));
            else if (!info.ctrl && !info.meta && key) setInput((s) => s + key);
            return;
        }
        if (key === "q") {
            exit();
            return;
        }

        // Tab switches between list and preview panes
        if (info.tab) {
            setFocusedPane((p) => (p === "list" ? "preview" : "list"));
            return;
        }

        if (focusedPane === "preview") {
            // Preview navigation
            if (info.escape || info.leftArrow) {
                setFocusedPane("list");
                return;
            }
            if (key === "v") {
                setFocusedPane("list");
                return;
            }
            if (info.upArrow || key === "k") {
                setOffset((o) => Math.max(0, o - 1));
                return;
            }
            if (info.downArrow || key === "j") {
                setOffset((o) => Math.min(maxOffset, o + 1));
                return;
            }
            if (info.pageDown || key === "]") {
                setOffset((o) => Math.min(maxOffset, o + contentHeight));
                return;
            }
            if (info.pageUp || key === "[") {
                setOffset((o) => Math.max(0, o - contentHeight));
                return;
            }
            if (info.home) {
                setOffset(0);
                return;
            }
            if (info.end) {
                setOffset(maxOffset);
                return;
            }
        } else {
            // List navigation
            if (info.rightArrow && pane) {
                setFocusedPane("preview");
                return;
            }
            if (info.upArrow || key === "k") {
                setCursor((c) => Math.max(0, c - 1));
                return;
            }
            if (info.downArrow || key === "j") {
                setCursor((c) => Math.min(rows.length - 1, c + 1));
                return;
            }
            // Dedicated shortcuts to scroll preview while in list
            if (info.pageDown || key === "]") {
                setOffset((o) => Math.min(maxOffset, o + contentHeight));
                return;
            }
            if (info.pageUp || key === "[") {
                setOffset((o) => Math.max(0, o - contentHeight));
                return;
            }
            if (key === "J" || (info.meta && info.downArrow)) {
                setOffset((o) => Math.min(maxOffset, o + 1));
                return;
            }
            if (key === "K" || (info.meta && info.upArrow)) {
                setOffset((o) => Math.max(0, o - 1));
                return;
            }
        }

        if (key === " " && current) {
            setSelected((s) => {
                const next = new Set(s);
                next.has(current.id)
                    ? next.delete(current.id)
                    : next.add(current.id);
                return next;
            });
            setPlan(undefined);
            return;
        }
        if (key === "n") {
            setPlan(undefined);
            setAutonomous(true);
            return;
        }
        if (key === "g") {
            setPrompt("generate");
            return;
        }
        if (key === "r" && current) {
            setPrompt("revise");
            return;
        }
        if (key === "p" && plan) {
            setPrompt("confirm");
            return;
        }
        if (key === "x" && (current || selected.size)) {
            setPrompt("reject");
            return;
        }
        task(async () => {
            if ((key === "v" || (info.return && focusedPane === "list")) && current) {
                const w = await loadWorkspace(current.id);
                setPane({
                    kind: "post",
                    header: safeTerminal(`${w.meta.title}\n${w.meta.author} · ${w.meta.category} · ${w.meta.status}\nText model: ${w.state.textModel || "external"} · Cover model: ${w.state.imageModel || "supplied"}\n\n${w.state.warnings?.join("\n") || ""}\nSources:\n${w.state.sources?.join("\n") || "None"}`),
                    body: safeTerminal(w.body),
                });
                setOffset(0);
                setFocusedPane("preview");
            } else if (key === "d") {
                const next = await svc().plan(
                    targets().map((workspace) => ({
                        type: "upsert",
                        workspace,
                    })),
                );
                setPlan(next);
                show(
                    next.changes
                        .map(
                            (c) =>
                                `${c.kind.toUpperCase()}: ${c.slug}\nCover: ${c.cover.before || "none"} → ${c.cover.after || "none"}\n${safeTerminal(c.diff)}`,
                        )
                        .join("\n"),
                );
                setMessage(
                    "Diff prepared. Approve each exact revision with a; p asks for explicit commit confirmation.",
                );
            } else if (key === "a") {
                for (const id of targets()) await approve(id);
                setMessage(
                    "Selected exact revisions approved. Edits invalidate approval.",
                );
            } else if (key === "s") {
                for (const id of targets()) {
                    const w = await loadWorkspace(id);
                    await setStatus(
                        id,
                        w.meta.status === "draft" ? "published" : "draft",
                    );
                }
                setPlan(undefined);
                setMessage(
                    "Editorial status changed locally. Review diff before committing.",
                );
            } else if (key === "e" && current) {
                const w = await loadWorkspace(current.id),
                    editor = process.env.EDITOR || "vi";
                // No shell interpolation. For editor flags use a wrapper executable in EDITOR.
                await external(editor, [join(w.path, "post.md")]);
                setPlan(undefined);
                setMessage(
                    "Editor closed; revalidate/review before approving.",
                );
            } else if (key === "c" && current) {
                const w = await loadWorkspace(current.id);
                const file = w.cover
                    ? join(w.path, w.meta.cover.src)
                    : w.meta.cover.src;
                if (process.env.TERM_PROGRAM === "iTerm.app" && w.cover) {
                    write(
                        "\x1b]1337;File=inline=1;width=60;height=18;preserveAspectRatio=1:" +
                            Buffer.from(w.cover).toString("base64") +
                            "\x07\n",
                    );
                    setMessage(
                        "Inline cover sent to iTerm. Press o for external viewer.",
                    );
                } else {
                    show("Cover: " + file);
                    setMessage(
                        "Inline cover unavailable in this terminal. Press o to open viewer.",
                    );
                }
            } else if (key === "o" && current) {
                const w = await loadWorkspace(current.id);
                await external(
                    process.platform === "darwin" ? "open" : "xdg-open",
                    [
                        w.cover
                            ? join(w.path, w.meta.cover.src)
                            : w.meta.cover.src,
                    ],
                );
            } else if (key === "i" && current) {
                setMessage(
                    "Retrying/reusing generated cover (may incur charges)…",
                );
                show(JSON.stringify(await generateCover(current.id), null, 2));
                setPlan(undefined);
            }
        });
    });
    if (autonomous) return <AutonomousWizard onClose={() => { setAutonomous(false); void refresh(); }} />;
    return (
        <Box flexDirection="column" paddingX={1}>
            <Text bold color="magenta">
                BLOG STUDIO / {focusedPane === "preview" ? "preview & review mode" : "review before publishing"}
            </Text>
            {focusedPane === "preview" ? (
                <>
                    <Text dimColor>
                        ↑↓/jk scroll · PgUp/PgDn page · Home/End top/bot · Esc/Tab/v back to list · q exit
                    </Text>
                    <Text dimColor>
                        a approve · s status · d diff · e editor · c/o cover/viewer · p commit · x reject
                    </Text>
                </>
            ) : (
                <>
                    <Text dimColor>
                        ↑↓ select · space batch · v preview · d diff · a approve · s
                        status · p commit · x reject · Tab preview
                    </Text>
                    <Text dimColor>
                        n autonomous batch* · e editor · c/o cover/viewer · g generate* · r revise* · i retry
                        cover* · J/K scroll · q exit
                    </Text>
                </>
            )}
            <Text dimColor>
                * Explicit AI action: may incur provider charges. Use CLI cover
                --regenerate for replacement.
            </Text>
            <Box width={availableWidth + 2} marginTop={1} borderStyle="round" borderColor="magenta">
                <Box width={leftWidth} flexShrink={0} flexDirection="column" paddingX={1}>
                    <Text
                        bold
                        color={focusedPane === "list" ? "magenta" : undefined}
                    >
                        {focusedPane === "list" ? "● DRAFTS" : "○ DRAFTS"} ({rows.length})
                    </Text>
                    {rows.length === 0 && (
                        <Text dimColor>
                            No local posts. Import via CLI or press g with a
                            brief JSON file.
                        </Text>
                    )}
                    {rows
                        .slice(
                            Math.max(0, cursor - 3),
                            Math.max(0, cursor - 3) + contentHeight,
                        )
                        .map((r) => (
                            <Text
                                key={r.id}
                                wrap="truncate-end"
                                color={
                                    r.id === current?.id ? "magenta" : undefined
                                }
                            >
                                {r.id === current?.id ? "›" : " "}{" "}
                                {selected.has(r.id) ? "☑" : "□"}{" "}
                                {r.approved ? "✓" : "○"} {safeTerminal(r.title)}{" "}
                                [{r.status}]
                            </Text>
                        ))}
                </Box>
                <Box
                    width={rightWidth}
                    flexShrink={0}
                    flexDirection="column"
                    paddingX={1}
                >
                    <Box justifyContent="space-between">
                        <Text
                            bold
                            color={focusedPane === "preview" ? "magenta" : undefined}
                        >
                            {focusedPane === "preview"
                                ? "● PREVIEW"
                                : "○ PREVIEW"}
                        </Text>
                        {pane ? (
                            <Text dimColor>{scrollInfo}</Text>
                        ) : null}
                    </Box>
                    {!pane ? (
                        <Box minHeight={contentHeight}>
                            <Text dimColor>
                                Select a post and press v to read it. Local drafts stay local; remote draft storage is public.
                            </Text>
                        </Box>
                    ) : (
                        <Box flexDirection="row">
                            <Box flexDirection="column" width={previewWidth}>
                                {visibleLines.map((l, i) => (
                                    <Text key={i}>{l}</Text>
                                ))}
                            </Box>
                            <Box flexDirection="column" width={1} marginLeft={1}>
                                {scrollbar.chars.map((s, i) => (
                                    <Text
                                        key={i}
                                        color={
                                            s === "█"
                                                ? focusedPane === "preview"
                                                    ? "magenta"
                                                    : "cyan"
                                                : "gray"
                                        }
                                    >
                                        {s}
                                    </Text>
                                ))}
                            </Box>
                        </Box>
                    )}
                </Box>
            </Box>
            <Text color={busy ? "yellow" : "green"}>
                {safeTerminal(status)}
            </Text>
            {prompt && (
                <Text color="yellow">
                    {prompt === "generate"
                        ? "Brief JSON path (Enter authorizes model charges)"
                        : prompt === "revise"
                          ? "Revision instructions (Enter authorizes fresh research + writing charges)"
                          : prompt === "reject"
                            ? `Type reject to completely remove ${targets().length} draft(s) everywhere`
                            : "Type publish to commit the reviewed plan"}
                    : {input}▌
                </Text>
            )}
        </Box>
    );
}
export async function launchTui() {
    await render(<App />).waitUntilExit();
}
