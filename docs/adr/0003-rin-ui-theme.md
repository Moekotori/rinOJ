# ADR-0003: Frontend Theme Strategy

Status: Proposed  
Date: 2026-05-02

## Decision

Rin OJ will build UI on TailwindCSS 4 and shadcn/ui, then place all product styling behind a local `packages/rin-ui` theme layer. `rin-ui` owns design tokens, Rin mascot surfaces, accessible animation defaults, and theme/plugin integration points.

## Context

The product needs Codeforces-level capability, Luogu-style community warmth, AtCoder-level visual polish, and a light anime identity. The risk is mixing visual decisions directly into app pages, making future redesigns expensive. A dedicated theme package keeps visual identity replaceable.

## Rationale

- Performance: TailwindCSS 4 keeps CSS output predictable, while shadcn/ui avoids a large runtime component framework.
- Ecosystem: shadcn/ui and Lucide are common in modern React applications and compose well with Next.js App Router.
- Maintenance: design tokens centralize color, radius, spacing, motion, and typography decisions.
- Accessibility: `rin-ui` can enforce contrast, keyboard states, ARIA patterns, and `prefers-reduced-motion` behavior across apps.

## Theme Tokens

Initial tokens include:

- `color.rin.sakuraWhite`: `#FDFBF7`
- `color.rin.hazePink`: `#FFD3DC`
- `color.rin.skyBlue`: `#A8D8EA`
- `color.rin.lavender`: `#C5B4E3`
- `color.rin.nightPurple`: `#1A1530`
- `radius.surface`: `16px`
- `font.sans`: `Inter`, `Noto Sans SC`
- `font.code`: `JetBrains Mono`
- `font.display`: `Klee One`

## Consequences

- App pages import `rin-ui` primitives and tokens instead of hard-coding theme colors.
- Framer Motion variants live in `rin-ui/motion` and must respect `prefers-reduced-motion`.
- Mascot SVG and later Live2D entry points are assets exposed by `rin-ui`, not scattered across feature pages.
- Remote ESM plugins can request theme tokens and limited mount points but cannot mutate core navigation or auth state directly.
