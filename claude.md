# Bread Calculator

A professional baker's math calculator with recipe storage, inspired by [foodgeek.io/en/bread-calculator](https://foodgeek.io/en/bread-calculator/).

## Architecture

```
bread-calc/
├── server.js          # Express API server (port 3000)
├── package.json
├── data/              # Persistent recipe storage (JSON file)
│   └── recipes.json
├── public/            # Frontend (served as static files)
│   ├── index.html     # Main page — toolbar, sections, modals
│   ├── styles.css     # Clean, minimal theme (foodgeek-inspired)
│   ├── app.js         # Client-side logic — rendering, calculations, modals
│   └── api-storage.js # (Legacy) API helper functions
└── tests/
    └── api.test.js    # Backend API test suite (Jest + Supertest)
```

## Deployment

Runs as a Docker Swarm service (`apps_bread-calc`) using `node:20-alpine`:

```yaml
bread-calc:
  image: node:20-alpine
  working_dir: /app
  command: sh -c "npm install --production && node server.js"
  volumes:
    - ../volumes/data/bread-calc:/app/data       # Persistent data
    - ../volumes/config/bread-calc:/app           # App source
    - /app/node_modules                           # Anonymous volume for deps
```

- **Config mount** (`/app`): source code from `volumes/config/bread-calc`
- **Data mount** (`/app/data`): separate persistent volume for `recipes.json`
- **node_modules**: anonymous volume so `npm install` inside the container doesn't conflict with the bind mount

The service runs on a swarm worker node (not necessarily the manager where config files are edited).

## UI Design

Mimics the foodgeek bread calculator layout:

- **Top toolbar** (dark `#2c3e50`): New, Scale, Link, Print, Load, Save, Save As
- **Recipe header**: Editable recipe name + quantity selector
- **Baking extras**: Compact inline fields for temp/time
- **Dynamic sections**: Multiple ingredient sections (Dough, Pre-ferment, Soaker, Tangzhong, etc.) — each with its own ingredient table, bowl weight tracker, and add/rename/delete/reorder controls
- **Ingredient table columns**: checkbox, name, weight, type, baker's %, actions (scale/edit/delete)
- **Bowl weight**: Per-section running total of checked-off ingredients (🥣 indicator)
- **Totals panel**: Grid of summary cards — dough weight, servings, flour, pre-fermented flour, fluid, salt, hydration
- **Notes section**: Textarea with print support
- **Modals**: Add/Edit ingredient, Scale (single + all), Load recipe (with import/export)

### Data Model

Recipes use a sections-based data model:

```json
{
  "name": "My Sourdough",
  "sections": [
    { "name": "Dough", "type": "dough", "ingredients": [{"name": "flour", "weight": 500, "type": "flour"}, ...] },
    { "name": "Levain", "type": "preferment", "ingredients": [...] }
  ],
  "ingredients": [...]  // flat array kept for backward compat
}
```

**Backward compatibility**: Old recipes with only `ingredients[]` (no `sections`) are auto-migrated to `{ sections: [{ name: 'Dough', ingredients: [...] }] }` via `migrateToSections()`. Saved recipes always include both `sections` and flat `ingredients` for URL sharing compatibility.

### Ingredient Types

| Type | Baker's Math Role |
|------|-------------------|
| Flour | Base (100%) |
| Fluid | Contributes to hydration |
| Starter | Split into flour + water by hydration % |
| Salt | Shown as % of flour |
| Dairy | Partial hydration based on composition |
| Sugar | Partial hydration (e.g., honey 18%) |
| Egg | ~75% water content |
| Fat, Misc, Extra | Percentage of flour, custom hydration |
| Yeast | Percentage of flour |

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | Health check |
| GET | `/api/recipes` | List all recipes |
| GET | `/api/recipes/:id` | Get single recipe |
| POST | `/api/recipes` | Create recipe |
| PUT | `/api/recipes/:id` | Update recipe |
| DELETE | `/api/recipes/:id` | Delete recipe |
| GET | `/api/recipes/export/all` | Download all as JSON |
| POST | `/api/recipes/import` | Bulk import recipes |

## Running Tests

Tests use **Jest** and **Supertest**. Since the service runs on a swarm worker, exec into the container on that node:

```bash
# Find the container on the swarm node where it's running
CONTAINER=$(docker ps --filter "name=apps_bread-calc" --format '{{.Names}}')

# Install test deps (needed since production install skips devDependencies)
docker exec $CONTAINER sh -c "cd /app && npm install --save-dev jest supertest"

# Run the full test suite
docker exec $CONTAINER sh -c "cd /app && npx jest --forceExit --detectOpenHandles --verbose"
```

### Test Coverage

23 tests across 8 suites:

- **Health Check** — `/api/health` returns ok
- **GET /api/recipes** — empty list, populated list
- **POST /api/recipes** — creation, ID assignment, persistence, field preservation
- **GET /api/recipes/:id** — found, 404
- **PUT /api/recipes/:id** — update, ID preservation, 404, persistence
- **DELETE /api/recipes/:id** — deletion, verified gone, selective delete, 404
- **POST /api/recipes/import** — bulk import, merge, auto-ID assignment
- **GET /api/recipes/export/all** — JSON download, empty export
- **Full CRUD lifecycle** — create → read → update → read → delete → verify gone

### ⚠️ CRITICAL: Test Data Isolation

Tests **MUST NEVER** read from or write to the production `recipes.json`. Safeguards in place:

1. **`server.js`** reads `process.env.RECIPES_FILE` — defaults to `data/recipes.json` in production, overridden to `data/recipes-test.json` in tests
2. **`api.test.js`** sets `process.env.RECIPES_FILE` before importing the server, and has a **safety guard** that throws if `RECIPES_FILE` resolves to the production path
3. **Auto-backup**: Server copies `recipes.json` → `recipes.json.bak` on every startup (if recipes exist)

**When writing new tests or refactoring**: Never call `fs.writeFile` on the production `RECIPES_FILE`. Always verify `RECIPES_FILE !== 'recipes.json'` in test setup.

### `server.js` Testability

The server exports `{ app, ensureDataDir, RECIPES_FILE }` via `module.exports` and only starts listening when `require.main === module`, allowing Supertest to spin up the app without binding to a port.
