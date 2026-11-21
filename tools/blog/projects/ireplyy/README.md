# iReplyy

- **Overview:** Murtaza Baanihali’s social media automation SaaS for creators, businesses, and agencies that handle repetitive comments and direct messages. A typical use case: someone comments “guide” on an Instagram post and receives the link in a private reply, while the team can follow up in the inbox.
- **Public links:** [Live product](https://ireplyy.dhem.io/); [ireplyy.com](https://ireplyy.com/) is the short URL and permanently redirects there. [Portfolio case study](https://dhem.io/projects/ireplyy-social-automation-tool).

## Product capabilities

- [Comment replies](https://ireplyy.dhem.io/feature/auto-reply) and [DM automation](https://ireplyy.dhem.io/feature/auto-message): configure keyword triggers and, for comment automations, optionally select eligible posts. Instagram and Facebook Page comments can trigger a private message and an optional public reply. Messaging integrations support incoming text and supported button actions; media and buttons vary by platform.
- Choose a fixed response for predictable tasks (e.g. delivering a link), or [SmartAI](https://ireplyy.dhem.io/feature/smartai) for replies based on a custom prompt and recent conversation history. The [automation preview](https://ireplyy.dhem.io/feature/preview) shows how DMs and comment replies would look before activation; it does not test provider delivery.
- [Live chat](https://ireplyy.dhem.io/feature/live-chat) lets operators read conversation history and reply manually. [Contacts](https://ireplyy.dhem.io/feature/contacts) and [activity](https://ireplyy.dhem.io/feature/activity) record people and interactions for follow-up and troubleshooting.
- **Implemented integrations:** Instagram, Facebook Pages, Messenger, WhatsApp Business, and Telegram bots. The dashboard lists X/Twitter and TikTok as coming soon. TikTok webhook intake acknowledges requests but does not run automations.

## Architecture and article angles

- The Next.js app stays on Vercel for the dashboard and manual messaging. A Cloudflare Worker accepts provider webhooks and enqueues normalized events; a separate Worker executes automations and sends replies. See [architecture notes](architecture.md) for the service split, retry trade-offs, and evidence.
- **Possible articles:** Design a comment-to-DM flow and explain where a manual follow-up fits; compare fixed replies with prompt-driven replies; explain why webhook acceptance and reply delivery are different milestones.

## Sources

- The project owner confirmed the product facts. This brief draws on the portfolio case study, public feature pages, and the app, receiver, and message worker in `apps/full-stack/ireplyy-saas` (`f24654f`).
