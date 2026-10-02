# CLAUDE.md

Rules for working on slide decks in this repository. Each rule below was written after a concrete violation; they bind every future session.

## Slide text

- The user's talk abstract (トーク概要) fixes what the talk covers and in what order; it is not slide copy. Articles, diffs, and other material the user hands over are sources of facts, never text to paste: pasting article paragraphs onto slides produces long lines nobody can read while listening. Slide text is short lines and lists a listener can scan in seconds, split with list items or `<br>` instead of one long sentence per paragraph, and every fact still traces to the source. Text the user edited on a slide stays exactly as they wrote it. Do not invent a heading by truncating or relabeling a user sentence; if the body already says it, delete the heading.
- Japanese slide prose follows the japanese-writing skill. Invoking the skill is not applying it, and a clean slop-lint run is not a review: the lint cannot see headings, list items, table cells, diagram labels, or text baked into GIFs that read unnaturally. Every one of those is read as a phrase a speaker would say out loud to the audience. A noun stack made by nominalizing a verb phrase, a list item cut off at a bare noun after its verb was dropped, and translation-style word order are rewritten into the phrasing a Japanese engineer would actually say, without changing the fact. After writing or editing any Japanese deliverable text in this repository, re-read the actual file top to bottom against the skill's checklist and record each finding as fixed or kept with a reason before reporting the work. A report without that findings ledger is a report on an unreviewed file, and a fact stated on a slide is verified only against its primary source, never against a mirror's own description of itself.
- No hedge annotations or meta commentary in slides or code samples: no "(疑似)" / "概念図" / "定義は省略"-style disclaimers, and no comments that exist only to preempt a reviewer's objection. A code sample may carry at most a one-line provenance comment (source file path).
- Review feedback from any agent (Codex, grok, subagents) names defects only. Rewrite each fix in slide idiom and check it against the user's abstract before applying. Never paste reviewer wording into slide content.
- Presenter notes are not part of the deliverable unless the user asks for them by name. When the user calls a slide sentence unnatural or meaningless, first decide whether the sentence belongs on the slide at all. A sentence whose fact the heading or code block already carries, an invented heading that only labels the next sentence, and any advice not taken from the user's words or a primary source, is filler, and filler is deleted rather than reworded.

## Visual elements

- No decorative boxes or label-like containers: callout, fixme, tag badges, and gray caption text are banned. Diagrams support the text and never replace it: add one where a comparison is easier to see than to read, such as two algorithms side by side or a memory layout, drawn as plain HTML/CSS cells in the style of the user's article figures. Flowcharts and Mermaid are hard to read on a slide and are not used. Processing cost such as allocations, copies, and per-element work is shown with an animated GIF alongside the static figure, so the exported PDF still carries the content through the static figure.
- Do not change text alignment unless the current conversation names alignment. A deck that already centers stays centered. A deck that already left-aligns stays left. Do not import centered classes or decorative components from sibling decks just because they exist there.
- When the user rejects an element, delete the element itself everywhere in the deck. Replacing its contents while keeping the container is the same violation.

## Editing discipline

- Never rewrite slides.md (or any existing file) wholesale with Write. Apply targeted Edits against the current file contents — the user edits these files between turns, and a full-file Write resurrects content they deleted.
- Read the current file immediately before editing. Never edit from a remembered draft of the file.
- Before reporting any change: run `bun run build`, render the changed slides to PNG and inspect them, then delete temporary export directories.
