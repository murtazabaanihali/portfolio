# @baanihali/captcha

- **Overview:** A reusable TypeScript package for adding a sliding-image verification challenge to React sign-up, login, and other forms.
- **Public links:** [npm package](https://www.npmjs.com/package/@baanihali/captcha) · [Source and integration guide](https://github.com/murtazabaanihali/captcha) · [Portfolio case study](https://dhem.io/projects/captcha)

## Product capabilities

- The responsive React slider uses CSS variables for customization. The server creates randomly positioned image challenges and verifies the submitted position. The integration uses challenge IDs and server-managed state so the protected action can check verification server-side.
- Supports custom image inputs and documents integrations with Next.js, Express, and NestJS. The default server package relies on Sharp’s native Node.js bindings; [the separate Workers package](https://github.com/murtazabaanihali/captcha-workers) uses WebAssembly for V8-isolate runtimes.

## Article angles and sources

- **Possible articles:** Explain why the client owns the interaction but the server owns verification; compare native image processing on Node with WASM image processing at the edge.
- Portfolio case study, npm package metadata, and public source README, package exports, React component, and server helpers. Use published package exports for import examples.
