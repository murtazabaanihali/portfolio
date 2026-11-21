# DheGEN

- **Overview:** Murtaza Baanihali’s AI creative suite for creators, designers, and marketers who want chat and visual tools in one workspace.
- **Public links:** [Product](https://dhegen.dhem.io/) · [Portfolio case study](https://dhem.io/projects/dhegen)

## Product capabilities

- GenGPT streams chat responses and saves conversation history. Text-to-image turns prompts into visuals; Photo Maker uses reference images, prompts, and style options for portraits, avatars, and illustrations.
- The product also offers photo face swap and an experimental video face swap tool, with examples and generation history. Video face swap is distinct from text-to-video: the standalone [video generation page](https://dhegen.dhem.io/video) is a coming-soon screen.

## Stack and article angles

- Next.js, TypeScript, Tailwind, and shadcn/ui provide the shared dashboard. Server actions call Replicate for predictions, including Llama 3 models for GenGPT. Prisma/PostgreSQL stores account, credit, and history data; Redis supports caching and BullMQ-backed email queueing. The app copies generated media into S3 storage and uses Razorpay for payment.
- **Possible articles:** Design a single history and credit system for tools with different inputs, outputs, and runtimes; compare streaming chat with media jobs that wait for a prediction to finish.

## Sources

- Product feature pages and portfolio case study; local `apps/full-stack/dhegen` (`8490e54`), including README, prediction actions, history persistence, Prisma schema, and video routes.
