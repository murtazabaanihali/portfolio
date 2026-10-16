---
version: 1
title: "Designing a small, dependable publishing workflow"
slug: dependable-publishing-workflow
description: "A practical outline for publishing Markdown with explicit review, stable URLs, and a single source of truth."
author: Murtaza Baanihali
status: draft
category: engineering
tags:
  - markdown
  - developer-tools
publishedAt: null
updatedAt: null
cover:
  src: "https://images.example.com/replace-with-your-cover.png"
  alt: "Three paper sheets arranged beside a small approval stamp"
---

This is an **authoring example**, not a live article or a claim about a deployed system. Replace the cover URL with an image you own before publication.

## Keep content portable

Ordinary Markdown lets writers focus on the article without running executable content.

## Make review explicit

Review the article, metadata, dates, links, and cover together. A content edit should invalidate approval.

## Prefer stable URLs

Keep a published slug unchanged when the title changes.

| Decision | Reason |
| --- | --- |
| One active manifest | Listings and discovery agree |
| Explicit removal | Missing local files do not delete remote work |

```ts
const publication = { status: "draft", requiresReview: true };
```

## Consider the trade-offs

Public draft storage is not private storage. Cache expiry is not an instant erasure mechanism.
