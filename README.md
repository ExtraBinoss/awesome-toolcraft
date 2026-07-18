# Awesome Toolcraft

Awesome Toolcraft is a web-based hub for exploring a collection of ready-to-use creative tools. It provides a single interface where experimental generators can be opened, tested, and refined directly in the browser.

The project is intentionally focused on experimentation: each tool is a self-contained application with its own controls, renderer, and export workflow. The hub makes these tools easier to discover and use without requiring a separate setup for every experiment.

## Foundation and attribution

The source code behind Awesome Toolcraft is based on [Toolcraft](https://github.com/pixel-point/toolcraft), an open-source starter kit and UI library created by [Pixel Point](https://github.com/pixel-point). Toolcraft provides the foundation for the application runtime, canvas, controls, panels, state management, and export workflows used in this project.

Pixel Point has done excellent work building Toolcraft. Awesome Toolcraft is an independent web application built on top of that work; it is not the official Toolcraft project and is not affiliated with Pixel Point.

Toolcraft is distributed under the [MIT License](https://github.com/pixel-point/toolcraft/blob/main/LICENSE.md). This project acknowledges and preserves that upstream attribution for the Toolcraft-derived runtime and UI source.

## What this project is for

Awesome Toolcraft is intended for:

- testing creative tools in a browser-based environment;
- experimenting with procedural graphics, gradients, patterns, and visual effects;
- validating controls, renderers, exports, and interaction ideas;
- providing a practical collection of pre-built tools rather than a generic framework.

The tools are experimental and may evolve independently. Their controls and rendering implementations are kept close to each tool so that they can be inspected, modified, and extended easily.

## Included tools

The hub currently contains tools such as:

- Gradient Generator;
- Aurora Generator;
- SVG Pattern Generator.

Additional tools can be added as independent entries in `src/tools/` and registered in `src/tools.ts`.

## Project structure

```text
src/
  tools.ts                         Hub catalog and routes
  HubPage.tsx                      Main tool catalog
  tools/
    gradient-generator/            Procedural gradient tool
    aurora-generator/              Aurora renderer
    svg-pattern-generator/         SVG pattern tool
  toolcraft/
    runtime/                       Application state, canvas, panels, and export logic
    ui/                            Shared controls and interface components
public/
  toolcraft-hub.png                Application identity and favicon
```

## Development

This project is currently developed and run through Windows PowerShell.

```powershell
cd "<USERPROFILE>\Documents\Personal_project\Codex\Toolcraft\awesome-toolcraft2"
npm install
npm run dev
```

The development server is available at `http://localhost:5000/`.

To create a production build:

```powershell
npm run build
```

The hub is served at `/`. Individual tools are available through routes such as `/tools/gradient-generator`.

## Adding a tool

1. Create a dedicated directory under `src/tools/`.
2. Keep the tool's schema, composition, renderer, shaders, and styles inside that directory where practical.
3. Register the tool in `src/tools.ts`.
4. Add a thumbnail under `public/images/` when the tool is shown in the catalog.
5. Add a route in `src/App.tsx` if the tool requires a dedicated page component.

## License

This repository contains independent application code as well as source derived from the MIT-licensed [Toolcraft project](https://github.com/pixel-point/toolcraft). Refer to the upstream [MIT License](https://github.com/pixel-point/toolcraft/blob/main/LICENSE.md) for the licensing terms covering the Toolcraft-derived foundation.
