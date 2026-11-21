# Project context for blog posts

Keep one short brief per project at `tools/blog/projects/<project-slug>/README.md`. These are authoring notes, not drafts or publish inputs. Copy the structure below, omit unused sections, and aim for one screen of bullets. Use a linked note such as `architecture.md` only for details that will help with a future article.

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
