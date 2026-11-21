# iReplyy architecture notes

**Request path:** Messaging provider → Cloudflare receiver Worker → Cloudflare Queues → consumer Worker → PostgreSQL, messaging APIs, and SmartAI as needed. The dashboard is a separate Next.js deployment on Vercel.

## Why the split matters

- **Dashboard (`ireplyy/`):** Next.js 14 App Router, React, TypeScript, and Tailwind. It owns automation configuration, account connections and OAuth, login, billing, and manual replies. The app defines the shared PostgreSQL schema in Drizzle and uses Redis/Upstash for caching. Moving automated messaging off the app did not move the dashboard to Cloudflare.
- **Webhook receiver (`message-receiver/`):** Provider adapters authenticate and filter incoming requests, then normalize supported messages, comments, and button actions into a shared versioned event schema. For events that qualify, the receiver awaits successful enqueue before acknowledging the webhook. It does not look up automations, call AI, or send replies. A successful acknowledgment confirms queue acceptance, not reply delivery.
- **Consumer (`message-worker/`):** Validates the same queue contract, finds the connected account and a matching active rule, and records contacts and conversation activity. It picks one eligible automation, not every matching rule. It sends via provider-specific adapters and maintains dashboard counters and cache state. Even without a matching rule, an inbound text can still appear in the inbox for a manual response. The consumer uses native SQL via Postgres.js and Cloudflare Hyperdrive against the same PostgreSQL schema. SmartAI uses a configurable OpenAI-compatible endpoint with a custom prompt and bounded recent history.

## Trade-offs worth writing about

- **At-least-once, not exactly-once:** The consumer handles acknowledgments and retries per event, backs off on transient failures, and is configured with a dead-letter queue. There is no durable deduplication or action ledger. If a reply succeeds and a later step fails, a replay can repeat a send, activity entry, or AI call. Separating ingestion from execution makes retries manageable; it does not make external side effects atomic.
- **Normalize incoming events, not provider capabilities:** Instagram and Facebook Page comments can produce public and private replies; WhatsApp Business and Telegram flows are messaging-first. The outbound adapters still have to respect each provider’s formatting, media, and button limits. A dashboard preview is not a substitute for testing with a connected staging account.

## Sources

- Local source reviewed at `f24654f`: the app’s automation, integration and live-chat code; the receiver’s request handler, adapters and event schema; the consumer’s queue handler, repository, adapters and Wrangler configuration.
- The app README records the completed messaging callback cutover. On 2026-11-21, the [live site](https://ireplyy.dhem.io/) responded from Vercel and the [receiver health endpoint](https://webhooks.ireplyy.com/health) returned HTTP 200.
