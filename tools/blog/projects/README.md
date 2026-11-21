# Project context for blog posts

Keep one short brief per project at `tools/blog/projects/<project-slug>/README.md`. These are authoring notes, not drafts or publish inputs. For new briefs, copy the structure below, omit unused sections, and aim for one screen of bullets. Use a linked note such as `architecture.md` only for details that will help with a future article.

## Project index

These briefs cover the nine entries on [dhem.io/projects](https://dhem.io/projects). Each links to its portfolio case study, the product or public repository where available, and the source used for implementation details.

| Project | Brief focus |
| --- | --- |
| [Thesis Maker](thesis-maker/README.md) | Medical research, reproducible analysis, and university-formatted documents |
| [iReplyy](ireplyy/README.md) | Social messaging automation, unified inbox, and webhook workers |
| [Dhesend](dhesend/README.md) | Developer email API and the self-hosted delivery pipeline |
| [DheGEN](dhegen/README.md) | AI chat, images, and creative media tools |
| [Breathings](breathings-app/README.md) | Guided breathing, mindfulness audio, and Android playback |
| [Professional Healthcare Resume Builder](healthcare-resume-builder/README.md) | Medical profile fields, writing assistance, and print templates |
| [3D Portfolio](3d-portfolio/README.md) | WebGL-enhanced developer showcase |
| [@baanihali/captcha](captcha/README.md) | React sliding puzzle and server-side verification |
| [This Portfolio](this-portfolio/README.md) | Main portfolio, project catalog, and blog publishing |

## Brief template

```markdown
# Project name

- **Overview:** What it does, who uses it, and what problem it solves.
- **Public links:** Canonical site, docs, demo, or public repo. Note the author's role if relevant.

## Shipped features

- A few capabilities that matter to readers, with examples or limits where useful.

## Stack and decisions

- Key tools or architecture choices and why they matter. Include meaningful constraints or trade-offs, not a full dependency list.

## Article angles

- Reader questions, useful workflows, or firsthand lessons the prompt supports. Label ideas and planned features as such.

## Sources and caveats

- Link supporting sources or note which facts came from the owner. Date volatile facts when known; flag claims to verify before publishing.
```

Example request: “Build context for `<project-name>` in this blog. It helps [audience] do [task]. It currently supports [features] and uses [stack] because [reason]. Here are [public links].”
