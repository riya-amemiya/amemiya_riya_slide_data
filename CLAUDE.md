# CLAUDE.md

Rules for working on slide decks in this repository. Each rule below was written after a concrete violation; they bind every future session.

## Slide text

- The user's talk abstract (トーク概要) and any text the user wrote are the specification. Use their sentences verbatim in slides. Never paraphrase user-written Japanese into your own wording; when a slide needs a sentence the abstract already contains, copy it.
- Japanese slide prose follows the japanese-tech-writing skill. Load it before writing or editing any Japanese deliverable text in this repository, and run its self-review pass (full read-through for duplication, tone consistency, unnatural phrasing) before reporting the work.
- No hedge annotations or meta commentary in slides or code samples: no "(疑似)" / "概念図" / "定義は省略"-style disclaimers, and no comments that exist only to preempt a reviewer's objection. A code sample may carry at most a one-line provenance comment (source file path).
- Review feedback from any agent (Codex, grok, subagents) names defects only. Rewrite each fix in slide idiom and check it against the user's abstract before applying. Never paste reviewer wording into slide content.

## Visual elements

- No decorative boxes or label-like containers: callout, fixme, tag badges, and gray caption text are banned. Body text is plain paragraphs.
- Do not center-align text. Alignment is uniformly left unless the user asks otherwise. Do not import centered classes or decorative components from sibling decks just because they exist there.
- When the user rejects an element, delete the element itself everywhere in the deck. Replacing its contents while keeping the container is the same violation.

## Editing discipline

- Never rewrite slides.md (or any existing file) wholesale with Write. Apply targeted Edits against the current file contents — the user edits these files between turns, and a full-file Write resurrects content they deleted.
- Read the current file immediately before editing. Never edit from a remembered draft of the file.
- Before reporting any change: run `bun run build`, render the changed slides to PNG and inspect them, then delete temporary export directories.
