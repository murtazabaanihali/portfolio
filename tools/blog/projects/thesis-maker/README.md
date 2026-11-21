# Thesis Maker

- **Overview:** Murtaza Baanihali’s research, analysis, and document generation platform for medical postgraduates. A guided wizard turns a study topic, degree, institution, supervisor details, and optional dataset into a university-formatted thesis or research synopsis.
- **Public links:** [Product and sample downloads](https://thesis.dhem.io/) · [Portfolio case study](https://dhem.io/projects/thesis-maker)

## Product capabilities

- Search PubMed for biomedical literature, ground claims in retrieved passages, and produce Vancouver-style citations. University profiles control the document structure, including required certificates, declarations, and ethics committee (IEC) proformas.
- Analyze de-identified CSV/XLSX datasets and use computed results for tables and figures. A synopsis can describe planned methodology without a dataset. The optional generated-cohort workflow is for educational use; simulated rows are not patient observations.
- Follow background generation as sections are written, then review and download the editable Word document and matching PDF. The live site has free thesis and synopsis samples and offers pay-as-you-go credits. The source also implements presentation jobs with editable PowerPoint and PDF exports.

## Stack and article angles

- The React 19/Vite SPA uses shadcn/ui and Logto and ships as Cloudflare Workers Static Assets. The Bun/Express API in `first-server` enqueues BullMQ work and relays progress over server-sent events. A separate worker runs research, analysis, and rendering, with PostgreSQL for job state and Cloudflare R2 for artifacts.
- PubMed is the primary literature source; Crossref and Semantic Scholar are fallbacks. OpenRouter handles model calls; Python runs analysis and Matplotlib charts. The worker builds the canonical DOCX, updates its fields in LibreOffice, and exports the PDF from that same file.
- **Possible articles:** Make a research pipeline reproducible by separating model-authored specifications from seeded Python sampling; use one editable document as the source for both Word and PDF.

## Sources

- Public product and case study; local `apps/frontend/thesis-maker` (`1a5437b`), `servers/first-server/src/apps/thesis` (`8e99011`), and `servers/micro-services/thesis-worker` (`71f0c76`), including frontend and worker READMEs.
