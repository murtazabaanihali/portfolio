# Professional Healthcare Resume Builder

- **Overview:** A resume builder for healthcare professionals, with ATS-friendly templates and fields for medical qualifications instead of a generic résumé form.
- **Public links:** [Live builder](https://doctor-resume-maker.vercel.app/) · [Source](https://github.com/murtazabaanihali/doctor-resume-maker) · [Portfolio case study](https://dhem.io/projects/healthcare-resume-builder)

## Product capabilities

- A step-by-step editor structures clinical experience, appointments, education, training, licenses, certifications, and skills. Users can manage named profiles and preview a resume while editing.
- AI writing assistance helps turn profile details into a professional summary and role descriptions. Templates include Clinical Classic, Academic Research, Medical Executive, and Resident Minimal; the A4 print view uses print-specific styles and page breaks.

## Stack and article angles

- Next.js, TypeScript, Tailwind, and shadcn/ui. The browser stores saved profiles in `localStorage`; the AI writing action is separate and sends profile context to a server route backed by DeepSeek. Preview and print share the template renderer.
- **Possible articles:** Model medical qualifications so one profile can generate multiple layouts; offer field-level writing assistance while preserving user control over credentials and experience.

## Sources

- Live builder and portfolio case study; public repository README, profile storage, doctor profile form, AI route, and preview/print routes.
