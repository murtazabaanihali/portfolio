import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { request } from "node:https";
export type ResearchResult = { sources: { url: string; title: string; text: string; kind?: "page" | "search-result"; retrievedAt?: string }[]; warnings: string[]; provider?: string };
const privateIp = (ip: string) => {
  if (ip.includes(":")) return /^(::|fc|fd|fe8|fe9|fea|feb|ff)/i.test(ip) || ip.includes(".");
  const [a, b] = ip.split(".").map(Number);
  return a === 0 || a === 10 || a === 127 || a === 169 && b === 254 || a === 172 && b >= 16 && b <= 31 || a === 192 && b === 168 || a === 100 && b >= 64 && b <= 127 || a >= 224;
};
export function withSignal<T>(promise: Promise<T>, signal: AbortSignal): Promise<T> {
  return new Promise((resolve, reject) => {
    const abort = () => reject(signal.reason || new Error("Request timed out"));
    if (signal.aborted) return abort();
    signal.addEventListener("abort", abort, { once: true });
    promise.then(resolve, reject).finally(() => signal.removeEventListener("abort", abort));
  });
}
async function pinnedRequest(url: URL, addresses: { address: string; family: number }[], signal: AbortSignal): Promise<Response> {
  return new Promise((resolve, reject) => {
    const req = request(url, {
      signal, method: "GET", headers: { "User-Agent": "PortfolioBlogResearch/1.0" },
      // Pin the checked address: no second DNS lookup/rebinding between validation and connect.
      lookup: (_host, options, callback) => {
        if (options.all) callback(null, addresses);
        else callback(null, addresses[0].address, addresses[0].family);
      },
    }, res => {
      const chunks: Buffer[] = []; let size = 0;
      res.on("data", (chunk: Buffer) => {
        size += chunk.length;
        if (size > 1_000_000) req.destroy(new Error("Research response exceeds 1MB"));
        else chunks.push(chunk);
      });
      res.on("error", reject);
      res.on("end", () => {
        const headers = new Headers();
        for (const [key, value] of Object.entries(res.headers)) if (value) headers.set(key, Array.isArray(value) ? value.join(", ") : value);
        resolve(new Response(Buffer.concat(chunks), { status: res.statusCode || 500, headers }));
      });
    });
    req.on("error", reject); req.end();
  });
}
export async function publicFetch(input: string, signal: AbortSignal): Promise<Response> {
  let url = new URL(input);
  for (let redirects = 0; redirects <= 3; redirects++) {
    if (url.protocol !== "https:" || url.username || url.password || url.port && url.port !== "443") throw new Error("Research requires a public HTTPS URL");
    const host = url.hostname.replace(/^\[|\]$/g, "");
    const addresses = isIP(host) ? [{ address: host, family: isIP(host) }] : await withSignal(lookup(host, { all: true }), signal);
    if (!addresses.length || addresses.some(a => privateIp(a.address))) throw new Error("Private/local research URLs are prohibited");
    signal.throwIfAborted();
    const response = await pinnedRequest(url, addresses, signal);
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get("location");
      if (!location) throw new Error("Missing redirect location");
      url = new URL(location, url);
      continue;
    }
    if (!response.ok) throw new Error(`Source HTTP ${response.status}`);
    return response;
  }
  throw new Error("Too many source redirects");
}
const decode = (s: string) => s.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
export const readable = (s: string) => decode(s.replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ")).trim();
async function boundedText(response: Response, max = 1_000_000) {
  if (!response.body) return "";
  const reader = response.body.getReader(); let total = 0; const chunks: Uint8Array[] = [];
  try {
    while (true) {
      const { value, done } = await reader.read(); if (done) break;
      total += value.length; if (total > max) throw new Error("Research response too large");
      chunks.push(value);
    }
  } finally { await reader.cancel(); }
  return Buffer.concat(chunks).toString("utf8");
}
export async function suppliedSource(url: string, signal = AbortSignal.timeout(12_000)) {
  const response = await publicFetch(url, signal);
  const type = response.headers.get("content-type") || "";
  if (!/text\/|application\/(json|xml)/.test(type)) throw new Error("Source is not text");
  const body = await boundedText(response);
  return { url, title: readable(body.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || url), text: readable(body).slice(0, 20_000), kind: "page" as const, retrievedAt: new Date().toISOString() };
}
export type SearchProvider = { name: string; search(query: string, signal: AbortSignal): Promise<ResearchResult["sources"]> };
export const freeProviders: SearchProvider[] = [
  { name: "DuckDuckGo", async search(query, signal) {
    const body = await boundedText(await publicFetch("https://html.duckduckgo.com/html/?q=" + encodeURIComponent(query), signal));
    const results = [...body.matchAll(/<a[^>]*class="[^"]*result__a[^"]*"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g)].slice(0, 5);
    return results.map(m => {
      const url = new URL(decode(m[1]), "https://duckduckgo.com");
      return { url: url.searchParams.get("uddg") || url.href, title: readable(m[2]), text: "Search result only; page facts have not been verified." };
    });
  } },
  { name: "Bing RSS", async search(query, signal) {
    const body = await boundedText(await publicFetch("https://www.bing.com/search?format=rss&q=" + encodeURIComponent(query), signal));
    return [...body.matchAll(/<item>([\s\S]*?)<\/item>/g)].slice(0, 5).map(m => ({
      title: readable(m[1].match(/<title>([\s\S]*?)<\/title>/)?.[1] || ""),
      url: decode(m[1].match(/<link>([\s\S]*?)<\/link>/)?.[1] || ""),
      text: readable(m[1].match(/<description>([\s\S]*?)<\/description>/)?.[1] || ""),
    })).filter(r => r.url.startsWith("https://"));
  } },
];
export async function research(query: string, providers = freeProviders, timeout = Number(process.env.BLOG_RESEARCH_TIMEOUT_MS || 25000)): Promise<ResearchResult> {
  const warnings: string[] = [], deadline = Date.now() + Math.max(1000, Math.min(timeout, 60000));
  // Each backend gets part of the total deadline, leaving room for an independent fallback.
  for (let i = 0; i < providers.length && Date.now() < deadline; i++) {
    const provider = providers[i], providerDeadline = Date.now() + Math.floor((deadline - Date.now()) / (providers.length - i));
    for (let attempt = 0; attempt < 3 && Date.now() < providerDeadline; attempt++) {
      try {
        const signal = AbortSignal.timeout(Math.max(1, Math.min(4000, providerDeadline - Date.now())));
        const results = await withSignal(provider.search(query, signal), signal);
        if (!results.length) throw new Error("No usable results (possibly restricted or challenged)");
        const sources: ResearchResult["sources"] = [];
        for (const result of results.slice(0, 3)) {
          if (Date.now() >= deadline) break;
          try { sources.push(await suppliedSource(result.url, AbortSignal.timeout(Math.max(1, Math.min(3000, deadline - Date.now()))))); }
          catch { sources.push({ ...result, kind: "search-result" }); warnings.push(`Could not read ${result.url}; search snippet is not verification.`); }
        }
        return { sources, warnings, provider: provider.name };
      } catch (e) {
        warnings.push(`${provider.name} attempt ${attempt + 1}: ${String(e)}`);
        const wait = Math.min(250 * 2 ** attempt, providerDeadline - Date.now());
        if (wait > 0) await new Promise(r => setTimeout(r, wait));
      }
    }
  }
  warnings.push("Free research unavailable. Continue drafting; omit or qualify unverified latest-model, availability, price, and benchmark claims.");
  return { sources: [], warnings };
}
