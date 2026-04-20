# 🍞 Bread Calculator

A self-hosted baker's math calculator for tracking bread experiments at home. Keep your recipes on your own server, tweak formulas between bakes, and never lose a winning ratio again.

Inspired by [Foodgeek's Bread Calculator](https://foodgeek.io/en/bread-calculator/) — a fantastic tool for working out hydration, baker's percentages, and scaling. This project takes that concept and adds persistent storage, multi-section recipes, and a few quality-of-life features for the home baker who likes to tinker.

## What it does

- **Baker's math** — every ingredient shown as a percentage of total flour (the standard way pros think about formulas)
- **Hydration tracking** — automatically accounts for water from starters, dairy, eggs, honey, and other ingredients with partial water content
- **Recipe sections** — split a recipe into Dough, Pre-ferment, Soaker, Tangzhong, or any custom section, each with its own ingredient list
- **Persistent storage** — recipes save to your server as JSON via a simple REST API (no cloud, no accounts, your data stays home)
- **Scale everything** — scale by a single ingredient, by total dough weight, by number of servings, or by a custom multiplier
- **Bowl weight tracker** 🥣 — check off ingredients as you weigh them in; a running total per section shows what's in the bowl so far
- **Share via URL** — generate a link that encodes the full recipe in query params (no server needed on the other end)
- **Import / Export** — bulk download all recipes as JSON, or import from a file
- **Print-friendly** — clean print stylesheet hides the toolbar and action buttons

## What's different from Foodgeek's calculator

| Feature | Foodgeek | This project |
|---------|----------|-------------|
| Recipe storage | Browser only | Server-side JSON API |
| Multiple sections | ✅ | ✅ + rename, reorder, delete |
| Bowl weight tracker | ❌ | ✅ per-section checked-off total |
| Self-hosted | ❌ | ✅ runs on your own hardware |
| Import/Export | ❌ | ✅ bulk JSON |
| Save As / versioning | ❌ | ✅ save copies to track experiments |
| Baking temp & time | ❌ | ✅ stored with recipe |
| Notes | ❌ | ✅ free-text, prints with recipe |
| Sharable URL | ✅ | ✅ with backward compat |

## Quick start

Requires Node.js 18+.

```bash
npm install --production
node server.js
# → http://localhost:3000
```

Recipes are stored in `data/recipes.json`. Back it up however you like.

### Docker

Built to run as a Docker Swarm service (or standalone container):

```yaml
bread-calc:
  image: node:20-alpine
  working_dir: /app
  command: sh -c "npm install --production && node server.js"
  volumes:
    - ./config/bread-calc:/app
    - ./data/bread-calc:/app/data
    - /app/node_modules
  ports:
    - "3000:3000"
```

The config mount has the source code; the data mount keeps `recipes.json` persistent across deploys.

## Ingredient types

| Type | How it's counted |
|------|-----------------|
| Flour | Base — everything else is a percentage of this |
| Fluid | 100% hydration contribution |
| Starter | Split into flour + water by its hydration % |
| Salt | Shown as % of flour |
| Yeast | Shown as % of flour |
| Dairy | Hydration from water content (presets for milk, cream, butter, yoghurt) |
| Sugar | Partial hydration (e.g., honey = 18% water) |
| Egg | ~75% water content |
| Fat | % of flour, no hydration |
| Misc | Custom hydration % |
| Other extras | % of flour (seeds, grains, mix-ins) |

## API

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/recipes` | List all recipes |
| `GET` | `/api/recipes/:id` | Get one recipe |
| `POST` | `/api/recipes` | Create recipe |
| `PUT` | `/api/recipes/:id` | Update recipe |
| `DELETE` | `/api/recipes/:id` | Delete recipe |
| `GET` | `/api/recipes/export/all` | Download all as JSON |
| `POST` | `/api/recipes/import` | Bulk import |
| `GET` | `/api/health` | Health check |

## Running tests

```bash
npm install --save-dev jest supertest
npx jest --forceExit --detectOpenHandles --verbose
```

Tests use an isolated `recipes-test.json` file and include a safety guard that refuses to run if pointed at production data.

## Credits

- [Foodgeek](https://foodgeek.io) for the original bread calculator concept and the baker's math approach
- Built for the kind of person who has a Raspberry Pi in the kitchen and a sourdough starter in the fridge
