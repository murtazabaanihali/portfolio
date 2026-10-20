import React, { useState } from "react";
import { Box, Text, useInput } from "ink";
import { directions, runAutonomous, type AutonomousOptions } from "./autonomous";

export function AutonomousWizard({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState<"directions" | "count" | "settings" | "confirm" | "running" | "done">("directions");
  const [cursor, setCursor] = useState(0);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [count, setCount] = useState("3");
  const [publish, setPublish] = useState(false);
  const [allowExistingTopic, setAllowExistingTopic] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [message, setMessage] = useState("");
  const [output, setOutput] = useState("");
  const [offset, setOffset] = useState(0);
  useInput((key, info) => {
    if (step === "running") return;
    if (info.escape) { onClose(); return; }
    if (step === "done") {
      if (key === "q" || info.return) onClose();
      if (info.downArrow) setOffset(o => Math.min(Math.max(0, output.split("\n").length - 5), o + 1));
      if (info.upArrow) setOffset(o => Math.max(0, o - 1));
      return;
    }
    if (step === "directions") {
      if (info.upArrow) setCursor(i => Math.max(0, i - 1));
      if (info.downArrow) setCursor(i => Math.min(directions.length - 1, i + 1));
      if (key === " ") setSelected(previous => {
        const next = new Set(previous), id = directions[cursor].id;
        next.has(id) ? next.delete(id) : next.add(id); return next;
      });
      if (info.return && selected.size) setStep("count");
    } else if (step === "count") {
      if (info.backspace || info.delete) setCount(s => s.slice(0, -1));
      else if (/^\d+$/.test(key)) setCount(s => (s + key).slice(0, 2));
      if (info.return && Number(count) >= 1 && Number(count) <= 10) setStep("settings");
    } else if (step === "settings") {
      if (key === "p") setPublish(v => !v);
      if (key === "o") setAllowExistingTopic(v => !v);
      if (info.return) setStep("confirm");
    } else if (step === "confirm") {
      if (info.backspace || info.delete) setConfirmation(s => s.slice(0, -1));
      else if (!info.ctrl && !info.meta && key) setConfirmation(s => s + key);
      if (info.return && confirmation === (publish ? "publish" : "draft")) {
        setStep("running");
        const options: AutonomousOptions = { directions: [...selected] as AutonomousOptions["directions"], count: Number(count), mode: publish ? "publish" : "draft", allowExistingTopic };
        void runAutonomous(options, setMessage).then(result => setOutput(JSON.stringify(result, null, 2)))
          .catch(error => setOutput(String(error))).finally(() => setStep("done"));
      }
    }
  });
  const clean = (s: string) => s.replace(/[\x00-\x08\x0b-\x1f\x7f-\x9f]/g, "");
  return <Box flexDirection="column" padding={1}>
    <Text bold color="magenta">Autonomous blog batch — DHEM / portfolio</Text>
    <Text dimColor>Esc cancels before starting. This is a bounded run, not a recurring scheduler.</Text>
    {step === "directions" && <>
      <Text>Select directions: ↑↓ move · space multi-select · Enter continue</Text>
      {directions.map((d, i) => <Text key={d.id} color={cursor === i ? "magenta" : undefined}>{cursor === i ? "›" : " "} {selected.has(d.id) ? "☑" : "□"} {d.label}</Text>)}
      <Text dimColor>{directions[cursor].detail}</Text>
    </>}
    {step === "count" && <Text>Number of articles (1–10; Backspace to edit): {count}▌</Text>}
    {step === "settings" && <>
      <Text>p: {publish ? "AUTO-ACCEPT: publish eligible articles LIVE" : "DRAFT ONLY: keep articles locally for review"}</Text>
      <Text>o: {allowExistingTopic ? "Continue on covered topics with a distinct angle" : "Skip likely covered topics"}</Text>
      <Text>Topic override NEVER allows an existing slug to be overwritten. Enter continues.</Text>
    </>}
    {step === "confirm" && <>
      <Text>{count} articles · {selected.size} directions · {allowExistingTopic ? "topic overlap allowed" : "skip overlap"}</Text>
      <Text color="yellow">Paid planning, text and cover calls. {publish ? "Includes model review and LIVE publication without individual approval; uncertain work stays local." : "No uploads or live publication."}</Text>
      <Text>Model review is not factual verification. Skipped/failed articles may leave fewer than the requested count.</Text>
      <Text>Type {publish ? "publish" : "draft"} to authorize this batch: {confirmation}▌</Text>
    </>}
    {step === "running" && <Text color="yellow">{clean(message)} — wait for completion; do not interrupt publication.</Text>}
    {step === "done" && <><Text>{clean(output).split("\n").slice(offset, offset + Math.max(5, (process.stdout.rows || 30) - 8)).join("\n")}</Text><Text>↑↓ scroll results · Enter/q return to studio</Text></>}
  </Box>;
}
