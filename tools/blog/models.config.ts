/**
 * Centralized AI Model & Provider Configuration
 *
 * Supports 5 Free-tier providers:
 * 1. Google AI Studio (Gemini 2.5/2.0 Flash - 1M context, 1M TPM, 1500 RPD)
 * 2. Mistral AI (Codestral, Mistral Small - 128K-256K context, native function calling)
 * 3. OpenRouter (Nemotron 3 Ultra, Gemma 4, Inkling, Cohere - 256K-1M context)
 * 4. Groq Cloud (Llama 3.3 70B - ultra-fast LPU inference, ideal for lightweight planning & tools)
 * 5. Z.AI / Zhipu (GLM-4-Flash - permanent $0 free tier, 128K context)
 *
 * Features:
 * - Complexity/context-level tiering: complex, standard, lightweight, research, image
 * - Dynamic 429 rate-limit cooldown and provider rotation
 * - Zero config in .env needed for models (only provider API keys)
 * - Safe fallback to user env overrides if explicitly provided
 */

export type ProviderId = "google" | "mistral" | "openrouter" | "groq" | "zai";

export type TaskLevel = "complex" | "standard" | "lightweight" | "research" | "image";

export interface ProviderDefinition {
  id: ProviderId;
  name: string;
  defaultBaseURL: string;
  envKeyNames: string[];
  rateLimitNote: string;
  freeTierDocsUrl: string;
}

export interface ModelConfig {
  id: string;
  name: string;
  provider: ProviderId;
  contextWindow: number;
  maxOutputTokens: number;
  supportsToolCalling: boolean;
  supportsImageGeneration?: boolean;
  cost: "free";
  recommendedFor: TaskLevel[];
  notes?: string;
}

export const PROVIDERS: Record<ProviderId, ProviderDefinition> = {
  google: {
    id: "google",
    name: "Google AI Studio",
    defaultBaseURL: "https://generativelanguage.googleapis.com/v1beta/openai",
    envKeyNames: ["GEMINI_API_KEY", "GOOGLE_AI_STUDIO_API_KEY", "GOOGLE_API_KEY"],
    rateLimitNote: "15 RPM, 1,000,000 TPM, 1,500 RPD on free tier",
    freeTierDocsUrl: "https://aistudio.google.com/",
  },
  mistral: {
    id: "mistral",
    name: "Mistral AI",
    defaultBaseURL: "https://api.mistral.ai/v1",
    envKeyNames: ["MISTRAL_API_KEY"],
    rateLimitNote: "1 RPS (~60 RPM) free experiment tier on La Plateforme",
    freeTierDocsUrl: "https://console.mistral.ai/",
  },
  openrouter: {
    id: "openrouter",
    name: "OpenRouter",
    defaultBaseURL: "https://openrouter.ai/api/v1",
    envKeyNames: ["OPENROUTER_API_KEY"],
    rateLimitNote: "20 RPM, 50 RPD (1,000 RPD with $10 lifetime deposit)",
    freeTierDocsUrl: "https://openrouter.ai/",
  },
  groq: {
    id: "groq",
    name: "Groq Cloud",
    defaultBaseURL: "https://api.groq.com/openai/v1",
    envKeyNames: ["GROQ_API_KEY"],
    rateLimitNote: "30 RPM, 6K-12K TPM, 100K TPD (fast LPU inference)",
    freeTierDocsUrl: "https://console.groq.com/",
  },
  zai: {
    id: "zai",
    name: "Z.AI (Zhipu GLM)",
    defaultBaseURL: "https://open.bigmodel.cn/api/paas/v4",
    envKeyNames: ["ZAI_API_KEY", "ZHIPU_API_KEY", "BIGMODEL_API_KEY"],
    rateLimitNote: "Permanent free tier for GLM-4-Flash, 128k context",
    freeTierDocsUrl: "https://z.ai/ or https://bigmodel.cn/",
  },
};

/**
 * Verified 100% Free Tier Model Catalog
 */
export const MODEL_CATALOG: Record<string, ModelConfig> = {
  // --- Google AI Studio Models ---
  "gemini-2.5-flash": {
    id: "gemini-2.5-flash",
    name: "Gemini 2.5 Flash",
    provider: "google",
    contextWindow: 1_000_000,
    maxOutputTokens: 65_536,
    supportsToolCalling: true,
    cost: "free",
    recommendedFor: ["complex", "standard", "research"],
    notes: "Top-tier 1M context, 65K max output, ideal for heavy blog writing and deep research.",
  },
  "gemini-2.0-flash": {
    id: "gemini-2.0-flash",
    name: "Gemini 2.0 Flash",
    provider: "google",
    contextWindow: 1_000_000,
    maxOutputTokens: 8_192,
    supportsToolCalling: true,
    cost: "free",
    recommendedFor: ["standard", "lightweight", "research"],
    notes: "High speed, 1M context, reliable tool calling and standard writing.",
  },
  "gemini-1.5-flash": {
    id: "gemini-1.5-flash",
    name: "Gemini 1.5 Flash",
    provider: "google",
    contextWindow: 1_000_000,
    maxOutputTokens: 8_192,
    supportsToolCalling: true,
    cost: "free",
    recommendedFor: ["standard"],
    notes: "Proven 1M context fallback.",
  },
  "gemini-2.5-flash-image": {
    id: "gemini-2.5-flash-image",
    name: "Gemini 2.5 Flash Image",
    provider: "google",
    contextWindow: 32_768,
    maxOutputTokens: 8_192,
    supportsToolCalling: false,
    supportsImageGeneration: true,
    cost: "free",
    recommendedFor: ["image"],
    notes: "Cover illustration generation via OpenAI-compatible endpoint.",
  },

  // --- Mistral AI Models ---
  "codestral-latest": {
    id: "codestral-latest",
    name: "Codestral Latest",
    provider: "mistral",
    contextWindow: 256_000,
    maxOutputTokens: 32_768,
    supportsToolCalling: true,
    cost: "free",
    recommendedFor: ["complex", "standard"],
    notes: "256K context, strong code and technical prose structuring.",
  },
  "mistral-small-latest": {
    id: "mistral-small-latest",
    name: "Mistral Small Latest",
    provider: "mistral",
    contextWindow: 128_000,
    maxOutputTokens: 8_192,
    supportsToolCalling: true,
    cost: "free",
    recommendedFor: ["standard", "research"],
    notes: "Strict tool calling adherence and coherent standard articles.",
  },
  "ministral-8b-latest": {
    id: "ministral-8b-latest",
    name: "Ministral 8B Latest",
    provider: "mistral",
    contextWindow: 128_000,
    maxOutputTokens: 8_192,
    supportsToolCalling: true,
    cost: "free",
    recommendedFor: ["lightweight"],
    notes: "Fast lightweight structured generation.",
  },

  // --- Groq Cloud Models ---
  "llama-3.3-70b-versatile": {
    id: "llama-3.3-70b-versatile",
    name: "Llama 3.3 70B Versatile (Groq)",
    provider: "groq",
    contextWindow: 128_000,
    maxOutputTokens: 32_768,
    supportsToolCalling: true,
    cost: "free",
    recommendedFor: ["lightweight", "research"],
    notes: "Fastest LPU inference. Perfect for planning and fast tool turns. Prompts kept concise to respect TPM.",
  },
  "llama-3.1-8b-instant": {
    id: "llama-3.1-8b-instant",
    name: "Llama 3.1 8B Instant (Groq)",
    provider: "groq",
    contextWindow: 128_000,
    maxOutputTokens: 8_192,
    supportsToolCalling: true,
    cost: "free",
    recommendedFor: ["lightweight"],
    notes: "Instantaneous execution for short directions.",
  },

  // --- OpenRouter Verified Free Models ---
  "nvidia/nemotron-3-ultra-550b-a55b:free": {
    id: "nvidia/nemotron-3-ultra-550b-a55b:free",
    name: "Nemotron 3 Ultra 550B (free)",
    provider: "openrouter",
    contextWindow: 1_000_000,
    maxOutputTokens: 65_536,
    supportsToolCalling: false,
    cost: "free",
    recommendedFor: ["complex", "standard"],
    notes: "1M context, 65K output ceiling on OpenRouter free pool.",
  },
  "thinkingmachines/inkling:free": {
    id: "thinkingmachines/inkling:free",
    name: "Thinking Machines Inkling (free)",
    provider: "openrouter",
    contextWindow: 1_048_576,
    maxOutputTokens: 262_144,
    supportsToolCalling: false,
    cost: "free",
    recommendedFor: ["complex", "standard"],
    notes: "1M context, ultra-high output limit.",
  },
  "google/gemma-4-31b-it:free": {
    id: "google/gemma-4-31b-it:free",
    name: "Google Gemma 4 31B (free)",
    provider: "openrouter",
    contextWindow: 262_144,
    maxOutputTokens: 32_768,
    supportsToolCalling: false,
    cost: "free",
    recommendedFor: ["complex", "standard"],
    notes: "262K context, great editorial prose.",
  },
  "cohere/north-mini-code:free": {
    id: "cohere/north-mini-code:free",
    name: "Cohere North Mini Code (free)",
    provider: "openrouter",
    contextWindow: 256_000,
    maxOutputTokens: 64_000,
    supportsToolCalling: false,
    cost: "free",
    recommendedFor: ["standard"],
    notes: "256K context, 64K output.",
  },
  "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free": {
    id: "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free",
    name: "Nemotron 3 Nano Omni Reasoning (free)",
    provider: "openrouter",
    contextWindow: 256_000,
    maxOutputTokens: 65_536,
    supportsToolCalling: true,
    cost: "free",
    recommendedFor: ["research"],
    notes: "Tool-calling reasoning model for evidence research.",
  },
  "google/gemma-4-26b-a4b-it:free": {
    id: "google/gemma-4-26b-a4b-it:free",
    name: "Google Gemma 4 26B (free)",
    provider: "openrouter",
    contextWindow: 262_144,
    maxOutputTokens: 32_768,
    supportsToolCalling: true,
    cost: "free",
    recommendedFor: ["lightweight", "research"],
    notes: "Tool-capable open model on OpenRouter.",
  },

  // --- Z.AI / Zhipu GLM Models ---
  "glm-4-flash": {
    id: "glm-4-flash",
    name: "GLM-4 Flash",
    provider: "zai",
    contextWindow: 128_000,
    maxOutputTokens: 4_096,
    supportsToolCalling: true,
    cost: "free",
    recommendedFor: ["standard", "lightweight"],
    notes: "Permanently free ($0/M tokens), 128K context.",
  },
};

/**
 * Task-specific Priority Fallback Chains
 * Ordered from highest capability/reliability to secondary fallbacks.
 */
export const TASK_CHAINS: Record<TaskLevel, string[]> = {
  // Complex: Massive context (>256K), high output ceiling (>24K), deep research dossiers
  complex: [
    "gemini-2.5-flash",
    "nvidia/nemotron-3-ultra-550b-a55b:free",
    "codestral-latest",
    "thinkingmachines/inkling:free",
    "google/gemma-4-31b-it:free",
  ],

  // Standard: General blog drafting, revisions, opinions, explainers
  standard: [
    "gemini-2.0-flash",
    "mistral-small-latest",
    "cohere/north-mini-code:free",
    "glm-4-flash",
    "gemini-1.5-flash",
  ],

  // Lightweight: Topic direction suggestions, planner briefs, review schema validation
  // Prioritizes Groq for near-instant execution and low token overhead
  lightweight: [
    "llama-3.3-70b-versatile",
    "gemini-2.0-flash",
    "glm-4-flash",
    "ministral-8b-latest",
    "llama-3.1-8b-instant",
  ],

  // Research: Multi-turn tool calling (search_web, read_page, finish_research)
  research: [
    "gemini-2.5-flash",
    "llama-3.3-70b-versatile",
    "mistral-small-latest",
    "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free",
    "gemini-2.0-flash",
  ],

  // Image: Editorial cover art generation
  image: [
    "gemini-2.5-flash-image",
  ],
};

/**
 * Detect whether an API error is a rate limit or quota exhaustion (HTTP 429, TPM, RPM, Quota).
 */
export function isRateLimitError(error: unknown): boolean {
  if (!error) return false;
  const str = String(error instanceof Error ? error.message : error).toLowerCase();
  const status = (error as { status?: number })?.status;
  return (
    status === 429 ||
    str.includes("429") ||
    str.includes("rate limit") ||
    str.includes("ratelimit") ||
    str.includes("quota exceeded") ||
    str.includes("resource has been exhausted") ||
    str.includes("too many requests") ||
    str.includes("tpm") ||
    str.includes("rpm") ||
    str.includes("tokens per minute") ||
    str.includes("requests per minute") ||
    str.includes("requests per day")
  );
}

/**
 * Rotation & Rate-Limit Cooldown Manager
 * Tracks models/providers that hit 429 rate limits and rotates candidate queues.
 */
export class ModelRotationManager {
  private modelCooldowns = new Map<string, number>();
  private providerCooldowns = new Map<ProviderId, number>();
  private defaultCooldownMs: number;

  constructor(defaultCooldownMs = 60_000) {
    this.defaultCooldownMs = defaultCooldownMs;
  }

  isRateLimited(modelId: string, provider?: ProviderId): boolean {
    const now = Date.now();
    const modelEnd = this.modelCooldowns.get(modelId) || 0;
    if (now < modelEnd) return true;

    if (provider) {
      const provEnd = this.providerCooldowns.get(provider) || 0;
      if (now < provEnd) return true;
    }
    return false;
  }

  recordRateLimit(modelId: string, provider?: ProviderId, cooldownMs = this.defaultCooldownMs): void {
    const expiresAt = Date.now() + cooldownMs;
    this.modelCooldowns.set(modelId, expiresAt);
    if (provider) {
      this.providerCooldowns.set(provider, expiresAt);
    }
  }

  reset(modelId?: string): void {
    if (modelId) {
      this.modelCooldowns.delete(modelId);
    } else {
      this.modelCooldowns.clear();
      this.providerCooldowns.clear();
    }
  }

  getCooldownRemainingMs(modelId: string, provider?: ProviderId): number {
    const now = Date.now();
    const modelEnd = this.modelCooldowns.get(modelId) || 0;
    const provEnd = provider ? (this.providerCooldowns.get(provider) || 0) : 0;
    return Math.max(0, Math.max(modelEnd, provEnd) - now);
  }

  /**
   * Rotate a list of model IDs:
   * 1. Filters to models whose provider has a configured API key.
   * 2. Places active (non-cooling) models first.
   * 3. Places rate-limited models at the back, ordered by soonest expiring cooldown.
   */
  rotate(
    modelIds: string[],
    isKeyAvailable: (provider: ProviderId) => boolean,
  ): string[] {
    const available = modelIds.filter((id) => {
      const conf = MODEL_CATALOG[id];
      if (!conf) return true; // Custom or test models pass through
      return isKeyAvailable(conf.provider);
    });

    const candidateList = available.length > 0 ? available : modelIds;
    const active: string[] = [];
    const cooling: { id: string; expires: number }[] = [];
    const now = Date.now();

    for (const id of candidateList) {
      const conf = MODEL_CATALOG[id];
      const prov = conf?.provider;
      const modelEnd = this.modelCooldowns.get(id) || 0;
      const provEnd = prov ? (this.providerCooldowns.get(prov) || 0) : 0;
      const expires = Math.max(modelEnd, provEnd);

      if (expires > now) {
        cooling.push({ id, expires });
      } else {
        active.push(id);
      }
    }

    cooling.sort((a, b) => a.expires - b.expires);
    return [...active, ...cooling.map((c) => c.id)];
  }
}

/** Global singleton rotation manager instance */
export const rotationManager = new ModelRotationManager();

/**
 * Determine API Key and Base URL for a given model or provider.
 */
export function resolveProviderCredentials(providerId: ProviderId): {
  apiKey: string | null;
  baseURL: string;
} {
  const provider = PROVIDERS[providerId];
  if (!provider) {
    return {
      apiKey: process.env.OPENROUTER_API_KEY || null,
      baseURL: process.env.BLOG_AI_BASE_URL || "https://openrouter.ai/api/v1",
    };
  }

  // 1. Check provider-specific keys in env
  let apiKey: string | null = null;
  for (const keyName of provider.envKeyNames) {
    const val = process.env[keyName]?.trim();
    if (val) {
      apiKey = val;
      break;
    }
  }

  // 2. Fallback to generic OPENROUTER_API_KEY if specific key is not set
  if (!apiKey && process.env.OPENROUTER_API_KEY?.trim()) {
    apiKey = process.env.OPENROUTER_API_KEY.trim();
  }

  // 3. Base URL: check BLOG_AI_BASE_URL override first if explicitly non-default
  const customBase = process.env.BLOG_AI_BASE_URL?.trim();
  const baseURL =
    customBase && customBase !== "https://openrouter.ai/api/v1"
      ? customBase
      : provider.defaultBaseURL;

  return { apiKey, baseURL };
}

/**
 * Check if a provider has an API key configured in process.env.
 */
export function hasProviderKey(providerId: ProviderId): boolean {
  const { apiKey } = resolveProviderCredentials(providerId);
  return Boolean(apiKey);
}

/**
 * Check if at least one AI provider has an API key configured.
 */
export function hasAnyProviderKey(): boolean {
  return (
    hasProviderKey("google") ||
    hasProviderKey("mistral") ||
    hasProviderKey("openrouter") ||
    hasProviderKey("groq") ||
    hasProviderKey("zai")
  );
}

/**
 * Dynamically classify writing complexity based on the brief and research findings.
 */
export function determineWritingComplexity(input: {
  brief?: string;
  sourcesCount?: number;
  urlsCount?: number;
  postType?: string;
  dossierFindingsCount?: number;
}): TaskLevel {
  const sources = (input.sourcesCount || 0) + (input.urlsCount || 0);
  const briefLen = input.brief?.length || 0;
  const findings = input.dossierFindingsCount || 0;

  if (
    sources >= 4 ||
    briefLen > 1500 ||
    findings >= 8 ||
    input.postType === "guide" ||
    input.postType === "explainer"
  ) {
    return "complex";
  }
  return "standard";
}

/**
 * Get ordered list of candidate models for a task with rotation applied.
 */
export function getModelsForTask(task: TaskLevel): string[] {
  const chain = TASK_CHAINS[task] || TASK_CHAINS.standard;
  const rotated = rotationManager.rotate(chain, hasProviderKey);
  return rotated.slice(0, 5);
}
