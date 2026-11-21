# This Portfolio

- **Overview:** Murtaza Baanihali’s main personal site and blog. It showcases skills, experience, and project case studies, and gives readers and prospective collaborators a contact route. It is separate from the Vite-based [3D Portfolio](../3d-portfolio/README.md).
- **Public links:** [Live site](https://dhem.io/) · [Projects](https://dhem.io/projects) · [Blog](https://dhem.io/blog) · [Source](https://github.com/murtazabaanihali/portfolio) · [Portfolio case study](https://dhem.io/projects/this-portfolio)

## Stack and decisions

- The portfolio case study identifies Next.js, Supabase, and AWS CloudFront. The current checkout uses Next.js 16 App Router, React, TypeScript, Tailwind, and shadcn/ui, deployed to Cloudflare Workers via OpenNext. Project records come from Neon PostgreSQL through Drizzle and are cached in Redis.
- Cloudflare R2 stores blog Markdown, media, and the publishing manifest; PostgreSQL mirrors metadata for listings and lookups. The blog tooling publishes content and syncs that mirror without requiring a site redeploy. Upstash Redis and ISR cache reads; RSS, raw Markdown, and `llms.txt` expose the content in other formats.
- The contact form uses a server action with input validation and rate limiting before sending via Resend.

## Article angles and sources

- **Possible articles:** Keep an editorial publishing pipeline independent of deployment; separate R2’s document storage from SQL-backed metadata queries without creating two copies of the article body.
- Live portfolio and case study; this checkout’s `app/projects/`, `actions/index.ts`, `lib/blog/store.ts`, Drizzle configuration, OpenNext/Wrangler configuration, and blog tooling guide.
