import React, { useEffect, useState } from "react";
import { Box, Text, render, useApp, useInput, useStdout, useStdin } from "ink";
import { marked } from "marked";
import { markedTerminal } from "marked-terminal";
import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { BlogService, type Plan } from "./core";
import { R2Storage } from "./storage";
import { approve, listWorkspaces, loadWorkspace, setStatus } from "./workspace";
import { generate, generateBatch, generateCover, revise } from "./ai";

marked.use(markedTerminal({ reflowText: true, width: Math.min(100, process.stdout.columns || 80) }) as never);
type Row = Awaited<ReturnType<typeof listWorkspaces>>[number];
const safeTerminal = (s: string) => s.replace(/[\x00-\x08\x0b-\x1f\x7f-\x9f]/g, "");
function App() {
  const { exit } = useApp(), { stdout } = useStdout(), { setRawMode } = useStdin();
  const [rows, setRows] = useState<Row[]>([]), [selected, setSelected] = useState<Set<string>>(new Set());
  const [cursor, setCursor] = useState(0), [status, setMessage] = useState("Ready · local drafts stay local until committed");
  const [pane, setPane] = useState(""), [offset, setOffset] = useState(0), [busy, setBusy] = useState(false);
  const [plan, setPlan] = useState<Plan>(), [input, setInput] = useState(""), [prompt, setPrompt] = useState<"generate" | "revise" | "confirm" | null>(null);
  const refresh = async () => setRows(await listWorkspaces());
  useEffect(() => { void refresh(); }, []);
  const current = rows[Math.min(cursor, rows.length - 1)];
  const targets = () => selected.size ? [...selected] : current ? [current.id] : [];
  const svc = () => new BlogService(new R2Storage());
  const task = (fn: () => Promise<void>) => {
    setBusy(true);
    void fn().catch(e => setMessage(String(e))).finally(() => { setBusy(false); void refresh(); });
  };
  const show = (s: string) => { setPane(s); setOffset(0); };
  const external = async (command: string, args: string[]) => {
    setRawMode(false);
    try { await new Promise<void>((resolve, reject) => {
      const child = spawn(command, args, { stdio: "inherit" });
      child.on("error", reject); child.on("exit", code => code === 0 ? resolve() : reject(new Error("External program exited " + code)));
    }); } finally { setRawMode(true); }
  };
  useInput((key, info) => {
    if (busy) return;
    if (prompt) {
      if (info.escape) { setPrompt(null); setInput(""); return; }
      if (info.return) {
        const value = input, mode = prompt; setPrompt(null); setInput("");
        task(async () => {
          if (mode === "generate") {
            setMessage("Generating / researching (paid model calls explicitly requested)…");
            const brief = JSON.parse(await readFile(value, "utf8"));
            const result = Array.isArray(brief) ? await generateBatch(brief, (i, state) => setMessage(`Item ${i + 1}: ${state}`)) : await generate(brief);
            show(JSON.stringify(result, null, 2)); setMessage("Generation completed; inspect results and any retry notices.");
          } else if (mode === "revise" && current) {
            setMessage("AI revision in progress…"); const result = await revise(current.id, value);
            show(JSON.stringify(result, null, 2)); setPlan(undefined); setMessage("Revised; previous approval invalidated.");
          } else if (mode === "confirm" && value === "publish" && plan) {
            const result = await svc().commit(plan, false); show(JSON.stringify(result, null, 2)); setPlan(undefined); setSelected(new Set()); setMessage("Committed. Cleanup warnings, if any, appear above.");
          } else setMessage("Not confirmed. Nothing published.");
        }); return;
      }
      if (info.backspace || info.delete) setInput(s => s.slice(0, -1));
      else if (!info.ctrl && !info.meta && key) setInput(s => s + key);
      return;
    }
    if (key === "q") { exit(); return; }
    if (info.upArrow || key === "k") { setCursor(c => Math.max(0, c - 1)); return; }
    if (info.downArrow || key === "j") { setCursor(c => Math.min(rows.length - 1, c + 1)); return; }
    if (info.pageDown || key === "]") { setOffset(o => Math.min(pane.split("\n").length - 1, o + 10)); return; }
    if (info.pageUp || key === "[") { setOffset(o => Math.max(0, o - 10)); return; }
    if (key === " " && current) { setSelected(s => { const next = new Set(s); next.has(current.id) ? next.delete(current.id) : next.add(current.id); return next; }); setPlan(undefined); return; }
    if (key === "g") { setPrompt("generate"); return; }
    if (key === "r" && current) { setPrompt("revise"); return; }
    if (key === "p" && plan) { setPrompt("confirm"); return; }
    task(async () => {
      if (key === "v" && current) {
        const w = await loadWorkspace(current.id);
        show(`${w.meta.title}\n${w.meta.author} · ${w.meta.category} · ${w.meta.status}\nText model: ${w.state.textModel || "external"} · Cover model: ${w.state.imageModel || "supplied"}\n\n${w.state.warnings?.join("\n") || ""}\nSources:\n${w.state.sources?.join("\n") || "None"}\n\n${marked.parse(safeTerminal(w.body))}`);
      } else if (key === "d") {
        const next = await svc().plan(targets().map(workspace => ({ type: "upsert", workspace })));
        setPlan(next); show(next.changes.map(c => `${c.kind.toUpperCase()}: ${c.slug}\nCover: ${c.cover.before || "none"} → ${c.cover.after || "none"}\n${safeTerminal(c.diff)}`).join("\n"));
        setMessage("Diff prepared. Approve each exact revision with a; p asks for explicit commit confirmation.");
      } else if (key === "a") {
        for (const id of targets()) await approve(id);
        setMessage("Selected exact revisions approved. Edits invalidate approval.");
      } else if (key === "s") {
        for (const id of targets()) { const w = await loadWorkspace(id); await setStatus(id, w.meta.status === "draft" ? "published" : "draft"); }
        setPlan(undefined); setMessage("Editorial status changed locally. Review diff before committing.");
      } else if (key === "e" && current) {
        const w = await loadWorkspace(current.id), editor = process.env.EDITOR || "vi";
        // No shell interpolation. For editor flags use a wrapper executable in EDITOR.
        await external(editor, [join(w.path, "post.md")]);
        setPlan(undefined); setMessage("Editor closed; revalidate/review before approving.");
      } else if (key === "c" && current) {
        const w = await loadWorkspace(current.id);
        const file = w.cover ? join(w.path, w.meta.cover.src) : w.meta.cover.src;
        if (process.env.TERM_PROGRAM === "iTerm.app" && w.cover) {
          stdout.write("\x1b]1337;File=inline=1;width=60;height=18;preserveAspectRatio=1:" + Buffer.from(w.cover).toString("base64") + "\x07\n");
          setMessage("Inline cover sent to iTerm. Press o for external viewer.");
        } else { show("Cover: " + file); setMessage("Inline cover unavailable in this terminal. Press o to open viewer."); }
      } else if (key === "o" && current) {
        const w = await loadWorkspace(current.id);
        await external(process.platform === "darwin" ? "open" : "xdg-open", [w.cover ? join(w.path, w.meta.cover.src) : w.meta.cover.src]);
      } else if (key === "i" && current) {
        setMessage("Retrying/reusing generated cover (may incur charges)…"); show(JSON.stringify(await generateCover(current.id), null, 2)); setPlan(undefined);
      }
    });
  });
  const height = Math.max(5, (process.stdout.rows || 30) - 14);
  return <Box flexDirection="column" paddingX={1}>
    <Text bold color="magenta">BLOG STUDIO  /  review before publishing</Text>
    <Text dimColor>↑↓ select · space batch · v preview · d diff · a approve · s status · p commit</Text>
    <Text dimColor>e editor · c/o cover/viewer · g generate* · r revise* · i retry cover* · PgUp/PgDn scroll · q exit</Text>
    <Text dimColor>* Explicit AI action: may incur provider charges. Use CLI cover --regenerate for replacement.</Text>
    <Box marginTop={1} borderStyle="round" borderColor="magenta">
      <Box width="30%" flexDirection="column" paddingX={1}>
        {rows.length === 0 && <Text dimColor>No local posts. Import via CLI or press g with a brief JSON file.</Text>}
        {rows.slice(Math.max(0, cursor - 3), Math.max(0, cursor - 3) + height).map((r, i) => <Text key={r.id} color={r.id === current?.id ? "magenta" : undefined}>
          {r.id === current?.id ? "›" : " "} {selected.has(r.id) ? "☑" : "□"} {r.approved ? "✓" : "○"} {safeTerminal(r.title)} [{r.status}]
        </Text>)}
      </Box>
      <Box width="70%" flexDirection="column" paddingX={1} minHeight={height}><Text>{pane.split("\n").slice(offset, offset + height).join("\n") || "Select an article and press v for a readable Markdown preview. Draft storage is public, not private."}</Text></Box>
    </Box>
    <Text color={busy ? "yellow" : "green"}>{safeTerminal(status)}</Text>
    {prompt && <Text color="yellow">{prompt === "generate" ? "Brief JSON path (Enter authorizes model charges)" : prompt === "revise" ? "Revision instructions (Enter authorizes model charges)" : "Type publish to commit the reviewed plan"}: {input}▌</Text>}
  </Box>;
}
export async function launchTui() { await render(<App />).waitUntilExit(); }
