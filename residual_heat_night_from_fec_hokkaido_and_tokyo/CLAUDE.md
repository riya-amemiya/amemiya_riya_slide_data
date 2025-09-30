# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Slidev presentation project for Frontend Conference Hokkaido 2025. Slidev is a developer-focused presentation framework that uses Markdown for content and Vue.js for interactive components.

## Development Commands

```bash
# Install dependencies (using Bun)
bun install

# Start development server (opens browser automatically)
bun dev

# Build static site
bun build

# Export to PDF/PNG/PPTX
bun export
```

## Architecture & Key Files

- `slides.md` - Main presentation content in Markdown with Slidev-specific frontmatter and syntax
- `pages/` - Additional slide files that can be imported into the main presentation
- `components/` - Vue components that can be embedded in slides (e.g., Counter.vue)
- `snippets/` - Code snippets that can be referenced in slides using `<<< @/snippets/filename`
- `netlify.toml` & `vercel.json` - Deployment configurations for hosting platforms

## Slidev-Specific Conventions

1. **Slide Separation**: Use `---` to separate slides
2. **Frontmatter**: Each slide can have YAML frontmatter for layout, transitions, and other settings
3. **Vue Components**: Can be used directly in Markdown (e.g., `<Counter :count="10" />`)
4. **Code Blocks**: Support syntax highlighting with line highlighting `{1-3|5|all}`
5. **Presenter Notes**: Last HTML comment block in each slide becomes presenter notes
6. **Themes**: Currently using 'seriph' theme, configured in the main frontmatter

## Code Patterns

- Vue 3 Composition API with `<script setup>` for components
- TypeScript support enabled
- UnoCSS for atomic styling (note the special syntax like `border="~ main rounded-md"`)
- Components use defineProps for type-safe props

## Testing & Validation

Currently no test suite is configured. When modifying:

- Verify slides render correctly in dev mode
- Check that all imported components work
- Ensure code snippets display properly
- Test navigation between slides
