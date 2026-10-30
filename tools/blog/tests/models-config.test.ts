import { describe, expect, test, beforeEach } from "bun:test";
import {
  MODEL_CATALOG,
  PROVIDERS,
  TASK_CHAINS,
  determineWritingComplexity,
  isRateLimitError,
  rotationManager,
  resolveProviderCredentials,
  hasProviderKey,
  getModelsForTask,
  type ProviderId,
} from "../models.config";
import { fallback, configForModel, models } from "../ai";

describe("centralized models and multi-provider configuration", () => {
  beforeEach(() => {
    rotationManager.reset();
  });

  test("all registered providers have valid definitions, HTTPS endpoints, and free tier documentation", () => {
    const providerIds: ProviderId[] = ["google", "mistral", "openrouter", "groq", "zai"];
    for (const id of providerIds) {
      const p = PROVIDERS[id];
      expect(p).toBeDefined();
      expect(p.id).toBe(id);
      expect(p.defaultBaseURL).toMatch(/^https:\/\//);
      expect(p.envKeyNames.length).toBeGreaterThan(0);
      expect(p.rateLimitNote).toBeTruthy();
    }
  });

  test("all catalog models are 100% free tier with sufficient context windows", () => {
    const modelKeys = Object.keys(MODEL_CATALOG);
    expect(modelKeys.length).toBeGreaterThanOrEqual(14);

    for (const key of modelKeys) {
      const m = MODEL_CATALOG[key];
      expect(m.cost).toBe("free");
      expect(m.id).toBe(key);
      expect(m.name).toBeTruthy();
      expect(PROVIDERS[m.provider]).toBeDefined();

      if (m.supportsImageGeneration) {
        expect(m.recommendedFor).toContain("image");
      } else {
        // Text/research models must provide at least 128K context window for blogs
        expect(m.contextWindow).toBeGreaterThanOrEqual(128_000);
        expect(m.maxOutputTokens).toBeGreaterThanOrEqual(4_096);
      }
    }
  });

  test("task chains cover all 5 difficulty/complexity tiers", () => {
    const tasks = ["complex", "standard", "lightweight", "research", "image"] as const;
    for (const task of tasks) {
      const chain = TASK_CHAINS[task];
      expect(chain.length).toBeGreaterThanOrEqual(1);
      for (const modelId of chain) {
        expect(MODEL_CATALOG[modelId]).toBeDefined();
      }
    }
  });

  test("complexity classification assigns 'complex' to deep research or guides", () => {
    expect(
      determineWritingComplexity({
        brief: "Short note on AI",
        sourcesCount: 1,
        urlsCount: 1,
        postType: "opinion",
        dossierFindingsCount: 3,
      }),
    ).toBe("standard");

    expect(
      determineWritingComplexity({
        brief: "Deep analysis",
        sourcesCount: 3,
        urlsCount: 2, // total 5 >= 4
        postType: "news",
        dossierFindingsCount: 5,
      }),
    ).toBe("complex");

    expect(
      determineWritingComplexity({
        brief: "Comprehensive step-by-step setup",
        sourcesCount: 1,
        urlsCount: 1,
        postType: "guide",
        dossierFindingsCount: 2,
      }),
    ).toBe("complex");

    expect(
      determineWritingComplexity({
        brief: "A very long detailed editorial brief ".repeat(60), // > 1500 chars
        sourcesCount: 1,
        urlsCount: 1,
        postType: "opinion",
        dossierFindingsCount: 2,
      }),
    ).toBe("complex");
  });

  test("rate limit error detection flags HTTP 429 and rate-limit phrasing", () => {
    expect(isRateLimitError({ status: 429 })).toBe(true);
    expect(isRateLimitError(new Error("HTTP 429: Too Many Requests"))).toBe(true);
    expect(isRateLimitError(new Error("Rate limit exceeded for model"))).toBe(true);
    expect(isRateLimitError(new Error("Tokens per minute (TPM) limit reached"))).toBe(true);
    expect(isRateLimitError(new Error("Resource has been exhausted (quota)"))).toBe(true);

    expect(isRateLimitError(new Error("Connection reset by peer"))).toBe(false);
    expect(isRateLimitError(new Error("transient timeout"))).toBe(false);
    expect(isRateLimitError(null)).toBe(false);
  });

  test("rotation manager shifts rate-limited models to back of queue", () => {
    const list = ["gemini-2.5-flash", "llama-3.3-70b-versatile", "mistral-small-latest"];

    // Initially none are cooling
    const initialRotated = rotationManager.rotate(list, () => true);
    expect(initialRotated).toEqual(list);

    // Record rate limit for primary model
    rotationManager.recordRateLimit("gemini-2.5-flash", "google", 60_000);
    expect(rotationManager.isRateLimited("gemini-2.5-flash", "google")).toBe(true);

    // Rotated list places cooling model at the back
    const afterRateLimit = rotationManager.rotate(list, () => true);
    expect(afterRateLimit[0]).toBe("llama-3.3-70b-versatile");
    expect(afterRateLimit[1]).toBe("mistral-small-latest");
    expect(afterRateLimit[2]).toBe("gemini-2.5-flash");

    // Reset clears cooldown
    rotationManager.reset();
    expect(rotationManager.isRateLimited("gemini-2.5-flash", "google")).toBe(false);
    expect(rotationManager.rotate(list, () => true)).toEqual(list);
  });

  test("credentials resolver maps provider-specific keys and falls back to OPENROUTER_API_KEY", () => {
    const saved = { ...process.env };
    try {
      delete process.env.GEMINI_API_KEY;
      delete process.env.MISTRAL_API_KEY;
      delete process.env.GROQ_API_KEY;
      delete process.env.ZAI_API_KEY;
      process.env.OPENROUTER_API_KEY = "test-openrouter-key";

      const googleCreds = resolveProviderCredentials("google");
      expect(googleCreds.apiKey).toBe("test-openrouter-key");
      expect(googleCreds.baseURL).toBe("https://generativelanguage.googleapis.com/v1beta/openai");

      // When provider-specific key is provided
      process.env.GEMINI_API_KEY = "specific-gemini-key";
      const resolvedWithSpecific = resolveProviderCredentials("google");
      expect(resolvedWithSpecific.apiKey).toBe("specific-gemini-key");
    } finally {
      Object.assign(process.env, saved);
    }
  });

  test("configForModel routes to distinct provider baseURLs and API keys", () => {
    const saved = { ...process.env };
    try {
      process.env.GEMINI_API_KEY = "gemini-secret";
      process.env.GROQ_API_KEY = "groq-secret";
      process.env.MISTRAL_API_KEY = "mistral-secret";
      process.env.ZAI_API_KEY = "zai-secret";
      process.env.OPENROUTER_API_KEY = "router-secret";

      const gemini = configForModel("gemini-2.5-flash");
      expect(gemini.baseURL).toBe("https://generativelanguage.googleapis.com/v1beta/openai");
      expect(gemini.apiKey).toBe("gemini-secret");

      const groq = configForModel("llama-3.3-70b-versatile");
      expect(groq.baseURL).toBe("https://api.groq.com/openai/v1");
      expect(groq.apiKey).toBe("groq-secret");

      const mistral = configForModel("codestral-latest");
      expect(mistral.baseURL).toBe("https://api.mistral.ai/v1");
      expect(mistral.apiKey).toBe("mistral-secret");

      const zai = configForModel("glm-4-flash");
      expect(zai.baseURL).toBe("https://open.bigmodel.cn/api/paas/v4");
      expect(zai.apiKey).toBe("zai-secret");

      const router = configForModel("nvidia/nemotron-3-ultra-550b-a55b:free");
      expect(router.baseURL).toBe("https://openrouter.ai/api/v1");
      expect(router.apiKey).toBe("router-secret");
    } finally {
      Object.assign(process.env, saved);
    }
  });

  test("fallback skips immediate retries and rotates on rate limit error", async () => {
    const calls: string[] = [];
    const modelsToTry = ["gemini-2.5-flash", "llama-3.3-70b-versatile"];

    const result = await fallback(modelsToTry, async (model) => {
      calls.push(model);
      if (model === "gemini-2.5-flash") {
        const err = new Error("Rate limit reached: 429 Too Many Requests");
        (err as { status?: number }).status = 429;
        throw err;
      }
      return "blog-generated-successfully";
    });

    // On 429, it records rate limit and rotates without burning a second futile retry on gemini
    expect(calls).toEqual(["gemini-2.5-flash", "llama-3.3-70b-versatile"]);
    expect(result.model).toBe("llama-3.3-70b-versatile");
    expect(result.result).toBe("blog-generated-successfully");
    expect(rotationManager.isRateLimited("gemini-2.5-flash", "google")).toBe(true);
  });

  test("models() function defaults to centralized task configuration when env is empty", () => {
    const saved = { ...process.env };
    try {
      delete process.env.BLOG_TEXT_MODELS;
      delete process.env.BLOG_RESEARCH_MODELS;
      delete process.env.BLOG_IMAGE_MODELS;

      const textDefaults = models("BLOG_TEXT_MODELS");
      expect(textDefaults.length).toBeGreaterThanOrEqual(1);
      expect(textDefaults.length).toBeLessThanOrEqual(5);

      const researchDefaults = models("BLOG_RESEARCH_MODELS");
      expect(researchDefaults.length).toBeGreaterThanOrEqual(1);

      const imageDefaults = models("BLOG_IMAGE_MODELS");
      expect(imageDefaults).toContain("gemini-2.5-flash-image");
    } finally {
      Object.assign(process.env, saved);
    }
  });
});
