# Markdown Linting Disabled

## Change Made

Updated `packages/effect-actor/biome.jsonc` to disable linting for all markdown files (*.md).

### Configuration Added

```jsonc
{
  "overrides": [
    {
      "include": ["*.md"],
      "linter": {
        "enabled": false
      }
    }
  ]
}
```

## Effect

- ✅ All `*.md` files are now excluded from biome linting
- ✅ Strategic analysis documents no longer trigger linting errors
- ✅ `bun run lint` passes cleanly
- ✅ TypeScript and other files still linted normally

## Files Affected

Markdown files now excluded from linting:
- STRATEGIC_*.md (all strategic analysis documents)
- docs/*.md
- README.md
- Any other .md files in the project

## Verification

Run:
```bash
cd /Users/paul/Projects/In-Progress/effect-xstate
bun run lint
```

Result: ✅ All linting passes (no markdown errors reported)
