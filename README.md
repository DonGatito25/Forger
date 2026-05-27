# Forger

Forger is a local-first creative organizer for writers, worldbuilders, game designers, and anyone managing a fictional project with a lot of moving parts.

It helps you keep track of:

- tabs for separate stories, settings, or projects
- character categories and character cards
- multi-category character proxies
- tags and searchable character metadata
- relationship diagrams
- story timelines
- concept trees with sub-concepts

Everything currently runs in the browser and saves to `localStorage`, so you can get started quickly without setting up a backend.

## What It Does

### Home

The Home page is the main character workspace.

- Create and reorder tabs
- Create and reorder categories
- Create, edit, move, and delete characters
- Place the same character in multiple categories using proxies
- Search across the active tab or globally across the catalog of characters
- Open related feature pages from the workspace sidebar

### Diagram Mode

Diagram Mode lives at `/diagram`.

- Build visual relationship boards for the active tab
- Drag characters onto a canvas
- Connect them with relationship tools
- Create multiple canvases per tab
- Customize relationship tool groups and variants

### Timeline

Timeline lives at `/timeline/:tabId`.

- Track major events for a specific tab
- Add event types and rating metrics
- Connect events to characters
- Reorder events visually

### Concepts

Concepts lives at `/concepts`.

- Open the page from a specific tab
- Create root concepts with title, definition, explanation, and color
- Create nested sub-concepts under each root concept
- Reorder sub-concepts within their sibling group
- Focus on one root concept tree at a time

## Key Behaviors

- Local-first: data is stored in browser `localStorage`
- Per-tab organization: timelines, diagrams, tags, and concepts are tied to the active tab
- Proxy-aware counts: proxies are visible where needed, but they do not count as separate characters in UI totals
- Drag-and-drop heavy workflow: tabs, categories, characters, and concept branches can be reorganized visually

## Tech Stack

- React
- Vite
- React Router
- TanStack Query
- Tailwind CSS
- Radix UI
- `@hello-pangea/dnd`
- Framer Motion

## Getting Started

### Requirements

- Node.js 18+
- npm

### Install

```bash
npm install
```

### Run the app

```bash
npm run dev
```

Then open the local Vite URL shown in the terminal.

### Build for production

```bash
npm run build
```

### Preview the production build

```bash
npm run preview
```

## Scripts

- `npm run dev` starts the Vite dev server
- `npm run build` creates a production build
- `npm run preview` previews the production build locally
- `npm run lint` runs ESLint
- `npm run lint:fix` runs ESLint and fixes what it can
- `npm run typecheck` runs TypeScript checking through `jsconfig.json`

## Data Storage

Forger currently stores app data in the browser under `localStorage`.

That means:

- no server setup is required
- data is tied to the current browser profile
- clearing browser storage will remove saved project data

## Current Status

Forger is already a very usable project-planning tool, but it is still evolving quickly. The current version is strongest as a personal local workspace for:

- character organization
- relationship mapping
- timeline planning
- concept structuring

## Future-Friendly Areas

Likely next layers could include:

- export and import
- persistent cloud storage
- richer concept linking
- deeper timeline tooling
- more visual polish and custom themes

## License

Forger is licensed under the MIT License. See [LICENSE](LICENSE) for details.