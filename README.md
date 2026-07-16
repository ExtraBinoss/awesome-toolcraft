# Toolcraft Hub

A central catalog for all Toolcraft applications.

## Structure

```text
tools/
  awesome-toolcraft2/
  nom-du-prochain-tool/
src/
  tools.ts
```

Each application stays self-contained in its own directory. To register a new
application in the hub, add its entry to `src/tools.ts` and place its AVIF or
WebP thumbnail in `public/images/`.

## Development

```bash
npm install
npm run dev
```

Run each Toolcraft application's commands from its own directory under `tools/`.
