---
name: feedback_no-mono-sub-typography
description: Never use small mono-font subtitle text (like .vg__sub) in this project
metadata:
  type: feedback
---

Do not use small monospace subtitle/caption text anywhere in this project — the style removed was `.vg__sub` (font-family: mono, font-size: 13px, muted color), used under video card titles.

**Why:** User explicitly removed these and said never to use this typography again in this project.

**How to apply:** When adding new text elements in pdm-2027, skip mono caption/subtitle lines under headings. Use only the established label, lead, and display type styles already in the design system.
