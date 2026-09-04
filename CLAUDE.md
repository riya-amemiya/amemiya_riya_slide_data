# CLAUDE.md

Rules for working on slide decks in this repository. Each rule below was written after a concrete violation; they bind every future session.

## Slide text

- The user's talk abstract (トーク概要) and any text the user wrote are the specification. Use their sentences verbatim in slides. Never paraphrase user-written Japanese into your own wording; when a slide needs a sentence the abstract already contains, copy it. Do not invent a heading by truncating or relabeling a user sentence. A heading made by dropping words from a user sentence is still a paraphrase. If the body already uses the user's sentence, do not add a heading that restates it in different words; delete that heading.
- Japanese slide prose follows the japanese-tech-writing skill. Invoking the skill is not applying it. After writing or editing any Japanese deliverable text in this repository, re-read the actual file top to bottom against the skill's checklist and record each finding as fixed or kept with a reason before reporting the work. A report without that findings ledger is a report on an unreviewed file, and a fact stated on a slide is verified only against its primary source, never against a mirror's own description of itself.
- No hedge annotations or meta commentary in slides or code samples: no "(疑似)" / "概念図" / "定義は省略"-style disclaimers, and no comments that exist only to preempt a reviewer's objection. A code sample may carry at most a one-line provenance comment (source file path).
- Review feedback from any agent (Codex, grok, subagents) names defects only. Rewrite each fix in slide idiom and check it against the user's abstract before applying. Never paste reviewer wording into slide content.
- Presenter notes are not part of the deliverable unless the user asks for them by name. When the user calls a slide sentence unnatural or meaningless, first decide whether the sentence belongs on the slide at all. A sentence whose fact the heading or code block already carries, an invented heading that only labels the next sentence, and any advice not taken from the user's words or a primary source, is filler, and filler is deleted rather than reworded.

## Visual elements

- No decorative boxes or label-like containers: callout, fixme, tag badges, and gray caption text are banned. Body text is plain paragraphs.
- Do not change text alignment unless the current conversation names alignment. A deck that already centers stays centered. A deck that already left-aligns stays left. Do not import centered classes or decorative components from sibling decks just because they exist there.
- When the user rejects an element, delete the element itself everywhere in the deck. Replacing its contents while keeping the container is the same violation.

## Editing discipline

- Never rewrite slides.md (or any existing file) wholesale with Write. Apply targeted Edits against the current file contents — the user edits these files between turns, and a full-file Write resurrects content they deleted.
- Read the current file immediately before editing. Never edit from a remembered draft of the file.
- Before reporting any change: run `bun run build`, render the changed slides to PNG and inspect them, then delete temporary export directories.
