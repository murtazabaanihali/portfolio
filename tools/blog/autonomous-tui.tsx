import React, { useState } from "react";
import { Box, Text, useInput } from "ink";
import { suggestDirections, runAutonomous, directionSchema, type AutonomousOptions, type Direction } from "./autonomous";

export function customTopicDirection(topic: string): Direction {
  const detail = topic.trim();
  return directionSchema.parse({ id: "custom-topic", label: detail.length > 100 ? detail.slice(0, 99) + "…" : detail, detail });
}

export function AutonomousWizard({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState<"suggest" | "suggesting" | "directions" | "topic" | "count" | "settings" | "confirm" | "running" | "done">("suggest");
  const [topic, setTopic] = useState("");
  const [topicReturnStep, setTopicReturnStep] = useState<"suggest" | "directions">("suggest");
  const [directions, setDirections] = useState<Direction[]>([]);
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
    if (step === "running" || step === "suggesting") return;
    if (info.escape) { if (step === "topic") setStep(topicReturnStep); else onClose(); return; }
    if ((step === "suggest" || step === "directions") && key === "t") {
      setTopicReturnStep(step); setStep("topic"); setMessage(""); return;
    }
    if (step === "topic") {
      if (info.return && topic.trim().length >= 3) {
        const direction = customTopicDirection(topic);
        setDirections([direction]); setSelected(new Set([direction.id])); setCursor(0);
        setCount("1"); setStep("count");
      } else if (info.backspace || info.delete) setTopic(s => s.slice(0, -1));
      else if (!info.ctrl && !info.meta && key) setTopic(s => (s + key.replace(/[\x00-\x1f\x7f]/g, " ")).slice(0, 700));
      return;
    }
    if (step === "done") {
      if (key === "q" || info.return) onClose();
      if (info.downArrow) setOffset(o => Math.min(Math.max(0, output.split("\n").length - 5), o + 1));
      if (info.upArrow) setOffset(o => Math.max(0, o - 1));
      return;
    }
    if (step === "suggest") {
      if (info.return) {
        setStep("suggesting");
        setMessage("");
        void suggestDirections().then(suggestions => {
          setDirections(suggestions);
          setSelected(new Set());
          setCursor(0);
          setStep("directions");
        }).catch(error => {
          setMessage(String(error));
          setStep("suggest");
        });
      }
      return;
    }
    if (step === "directions") {
      if (key === "r") { setMessage(""); setStep("suggest"); return; }
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
        const options: AutonomousOptions = { directions: directions.filter(d => selected.has(d.id)), count: Number(count), mode: publish ? "publish" : "draft", allowExistingTopic };
        void runAutonomous(options, setMessage).then(result => setOutput(JSON.stringify(result, null, 2)))
          .catch(error => setOutput(String(error))).finally(() => setStep("done"));
      }
    }
  });
  const clean = (s: string) => s.replace(/[\x00-\x08\x0b-\x1f\x7f-\x9f]/g, "");
  return <Box flexDirection="column" padding={1}>
    <Text bold color="magenta">Blog posts — your topic or suggested ideas</Text>
    <Text dimColor>Esc cancels before starting. This is a bounded run, not a recurring scheduler.</Text>
    {step === "suggest" && <>
      <Text>t: type your own topic — news, opinions, marketing, business, guides, or anything else.</Text>
      <Text>Or press Enter for broad LLM suggestions informed by your voice and existing posts.</Text>
      <Text color="yellow">Enter authorizes paid suggestion calls only. Typing your own topic skips that call. No posts are generated or published yet.</Text>
      {message && <Text color="red">{clean(message)} — Enter retries; Esc cancels. No predefined fallback suggestions.</Text>}
    </>}
    {step === "suggesting" && <Text color="yellow">Reading DB/local coverage and asking the LLM for topic directions…</Text>}
    {step === "directions" && <>
      <Text>↑↓ move · space multi-select · Enter continue · t type your topic · r new suggestions</Text>
      {directions.map((d, i) => <Text key={d.id} color={cursor === i ? "magenta" : undefined}>{cursor === i ? "›" : " "} {selected.has(d.id) ? "☑" : "□"} {clean(d.label)}</Text>)}
      <Text dimColor>{clean(directions[cursor]?.detail || "")}</Text>
    </>}
    {step === "topic" && <>
      <Text>What do you want to blog about? Include the angle or tone if you have one.</Text>
      <Text dimColor>For example: a marketing guide for developers, a grounded take on a model launch, or the reality of dropshipping.</Text>
      <Text>Topic: {topic}▌</Text>
      <Text dimColor>3–700 characters · Enter continue · Esc back. No model call yet.</Text>
    </>}
    {step === "count" && <Text>Number of posts (1–10; Backspace to edit): {count}▌</Text>}
    {step === "settings" && <>
      <Text>p: {publish ? "AUTO-ACCEPT: publish eligible posts LIVE" : "DRAFT ONLY: keep posts locally for you to read"}</Text>
      <Text>o: {allowExistingTopic ? "Continue on covered topics with a distinct angle" : "Skip likely covered topics"}</Text>
      <Text>Topic override NEVER allows an existing slug to be overwritten. Enter continues.</Text>
    </>}
    {step === "confirm" && <>
      <Text>{count} posts · {selected.size} topics · {allowExistingTopic ? "topic overlap allowed" : "skip overlap"}</Text>
      <Text color="yellow">Paid planning, multi-turn research, writing and cover calls. {publish ? "Includes the existing publish-mode check and LIVE publication without individual approval; uncertain work stays local." : "No reviewer call, uploads or live publication."}</Text>
      <Text>Every post uses an LLM research agent with free search. Bounded to 10 research turns, 8 queries and 12 reads; this is not a monetary cap. Incomplete evidence stays held for review.</Text>
      <Text>Skipped/failed posts may leave fewer than the requested count. Automated checks are not factual verification.</Text>
      <Text>Type {publish ? "publish" : "draft"} to authorize this batch: {confirmation}▌</Text>
    </>}
    {step === "running" && <Text color="yellow">{clean(message)} — wait for completion; do not interrupt publication.</Text>}
    {step === "done" && <><Text>{clean(output).split("\n").slice(offset, offset + Math.max(5, (process.stdout.rows || 30) - 8)).join("\n")}</Text><Text>↑↓ scroll results · Enter/q return to studio</Text></>}
  </Box>;
}
