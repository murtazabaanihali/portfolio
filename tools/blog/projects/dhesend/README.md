# Dhesend

- **Overview:** Murtaza Baanihali’s transactional email platform for developers who need to verify a sending domain, integrate an email API, and see what happened to each message without building that workflow themselves.
- **Public links:** [Product](https://dhesend.vercel.app/) · [Docs](https://dhesend.vercel.app/docs/introduction) · [SDKs](https://dhesend.vercel.app/docs/sdks) · [Portfolio case study](https://dhem.io/projects/dhesend)

## Product and codebase

- The public product documents email sending, domain management, email activity, and event webhooks. It offers a dashboard, framework-specific quickstarts, and open-source [Node.js](https://github.com/dhesend/dhesend-node) and [Python](https://github.com/dhesend/dhesend-python) clients.
- **Architecture documented on the portfolio:** Next.js/Tailwind/shadcn UI with MDX docs; an Express and AWS email stack using SES, SNS, SQS, and Lambda.
- **Self-hosted implementation in the local repository:** A Bun/Express API validates sends against a verified domain, stores message records in MongoDB, and hands work to RabbitMQ. A Rust consumer builds the email and transfers it over SMTP to KumoMTA, which handles DKIM signing and outbound delivery. The worker reports failures before MTA acceptance; KumoMTA emits delivery, bounce, and deferral events after acceptance. PostgreSQL holds relational data, Redis handles caching and rate limiting, and Cloudflare R2 stores attachments.
- The local project's README marks the self-hosted implementation as active development, not production-ready. The SDKs in the public docs belong to the public API; the local rewrite's dashboard and SDK work have their own status.

## Article angles and sources

- **Possible articles:** Explain what changes when you replace a managed mail service with your own MTA; trace the difference between an API accepting a message, a worker handing it to SMTP, and the recipient server accepting it.
- Public docs and case study; local `apps/full-stack/dhesend` (`0058738`), including README, CONTEXT, send handler, Rust queue worker, and KumoMTA policy.
