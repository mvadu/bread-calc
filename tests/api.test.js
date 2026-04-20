const request = require('supertest');
const fs = require('fs').promises;
const path = require('path');

// Set test recipes file BEFORE loading server so it picks up the env var
const TEST_RECIPES_FILE = path.join(__dirname, '..', 'data', 'recipes-test.json');
const PROD_RECIPES_FILE = path.join(__dirname, '..', 'data', 'recipes.json');
process.env.RECIPES_FILE = TEST_RECIPES_FILE;

const { app, ensureDataDir, RECIPES_FILE } = require('../server');

// SAFETY GUARD: abort immediately if RECIPES_FILE points at production data
if (path.resolve(RECIPES_FILE) === path.resolve(PROD_RECIPES_FILE)) {
    throw new Error(
        '🚨 REFUSING TO RUN TESTS: RECIPES_FILE points to production recipes.json!\n' +
        'Tests must use an isolated file (e.g. recipes-test.json).\n' +
        'Set process.env.RECIPES_FILE before requiring server.'
    );
}

beforeAll(async () => {
    await ensureDataDir();
    await fs.writeFile(TEST_RECIPES_FILE, '[]');
});

beforeEach(async () => {
    // Reset test data only — never touches production recipes.json
    await fs.writeFile(TEST_RECIPES_FILE, '[]');
});

afterAll(async () => {
    try {
        await fs.unlink(TEST_RECIPES_FILE);
    } catch (e) { /* ignore */ }
});

// ---------- Sample data ----------

const sampleRecipe = {
    name: 'Test Sourdough',
    totalWeight: '1000',
    numLoaves: '2',
    bakingTemp: '230',
    bakingTime: '45',
    notes: 'Test notes',
    ingredients: [
        { name: 'bread flour', weight: 500, type: 'flour' },
        { name: 'water', weight: 350, type: 'fluid' },
        { name: 'salt', weight: 10, type: 'salt' },
        { name: 'starter', weight: 100, type: 'starter', hydration: 100, includeFlour: true }
    ]
};

const sampleRecipe2 = {
    name: 'Rye Bread',
    totalWeight: '800',
    numLoaves: '1',
    ingredients: [
        { name: 'rye flour', weight: 400, type: 'flour' },
        { name: 'water', weight: 300, type: 'fluid' },
        { name: 'salt', weight: 8, type: 'salt' }
    ]
};

// ---------- Tests ----------

describe('Health Check', () => {
    test('GET /api/health returns ok', async () => {
        const res = await request(app).get('/api/health');
        expect(res.status).toBe(200);
        expect(res.body.status).toBe('ok');
        expect(res.body).toHaveProperty('timestamp');
    });
});

describe('GET /api/recipes', () => {
    test('returns empty array when no recipes exist', async () => {
        const res = await request(app).get('/api/recipes');
        expect(res.status).toBe(200);
        expect(res.body).toEqual([]);
    });

    test('returns all saved recipes', async () => {
        // Create two recipes first
        await request(app).post('/api/recipes').send(sampleRecipe);
        await request(app).post('/api/recipes').send(sampleRecipe2);

        const res = await request(app).get('/api/recipes');
        expect(res.status).toBe(200);
        expect(res.body).toHaveLength(2);
        expect(res.body[0].name).toBe('Test Sourdough');
        expect(res.body[1].name).toBe('Rye Bread');
    });
});

describe('POST /api/recipes', () => {
    test('creates a new recipe and returns 201', async () => {
        const res = await request(app)
            .post('/api/recipes')
            .send(sampleRecipe);

        expect(res.status).toBe(201);
        expect(res.body).toHaveProperty('id');
        expect(res.body).toHaveProperty('date');
        expect(res.body.name).toBe('Test Sourdough');
        expect(res.body.ingredients).toHaveLength(4);
    });

    test('assigns a unique ID and date to the recipe', async () => {
        const res = await request(app)
            .post('/api/recipes')
            .send(sampleRecipe);

        expect(typeof res.body.id).toBe('string');
        expect(res.body.id.length).toBeGreaterThan(0);
        expect(new Date(res.body.date).toString()).not.toBe('Invalid Date');
    });

    test('persists the recipe (visible in subsequent GET)', async () => {
        await request(app).post('/api/recipes').send(sampleRecipe);

        const res = await request(app).get('/api/recipes');
        expect(res.body).toHaveLength(1);
        expect(res.body[0].name).toBe('Test Sourdough');
        expect(res.body[0].ingredients).toHaveLength(4);
    });

    test('preserves all recipe fields', async () => {
        const res = await request(app)
            .post('/api/recipes')
            .send(sampleRecipe);

        expect(res.body.totalWeight).toBe('1000');
        expect(res.body.numLoaves).toBe('2');
        expect(res.body.bakingTemp).toBe('230');
        expect(res.body.bakingTime).toBe('45');
        expect(res.body.notes).toBe('Test notes');
    });
});

describe('GET /api/recipes/:id', () => {
    test('returns a single recipe by ID', async () => {
        const created = await request(app)
            .post('/api/recipes')
            .send(sampleRecipe);

        const res = await request(app).get(`/api/recipes/${created.body.id}`);
        expect(res.status).toBe(200);
        expect(res.body.name).toBe('Test Sourdough');
        expect(res.body.id).toBe(created.body.id);
    });

    test('returns 404 for non-existent recipe', async () => {
        const res = await request(app).get('/api/recipes/nonexistent999');
        expect(res.status).toBe(404);
        expect(res.body.error).toBe('Recipe not found');
    });
});

describe('PUT /api/recipes/:id', () => {
    test('updates an existing recipe', async () => {
        const created = await request(app)
            .post('/api/recipes')
            .send(sampleRecipe);

        const res = await request(app)
            .put(`/api/recipes/${created.body.id}`)
            .send({ name: 'Updated Sourdough', numLoaves: '3' });

        expect(res.status).toBe(200);
        expect(res.body.name).toBe('Updated Sourdough');
        expect(res.body.numLoaves).toBe('3');
        // Original fields should still be there
        expect(res.body.totalWeight).toBe('1000');
        expect(res.body).toHaveProperty('updatedDate');
    });

    test('preserves the original ID after update', async () => {
        const created = await request(app)
            .post('/api/recipes')
            .send(sampleRecipe);

        const res = await request(app)
            .put(`/api/recipes/${created.body.id}`)
            .send({ name: 'Renamed' });

        expect(res.body.id).toBe(created.body.id);
    });

    test('returns 404 when updating non-existent recipe', async () => {
        const res = await request(app)
            .put('/api/recipes/nonexistent999')
            .send({ name: 'Ghost' });

        expect(res.status).toBe(404);
        expect(res.body.error).toBe('Recipe not found');
    });

    test('update is persisted (visible in subsequent GET)', async () => {
        const created = await request(app)
            .post('/api/recipes')
            .send(sampleRecipe);

        await request(app)
            .put(`/api/recipes/${created.body.id}`)
            .send({ name: 'Persisted Name' });

        const res = await request(app).get(`/api/recipes/${created.body.id}`);
        expect(res.body.name).toBe('Persisted Name');
    });
});

describe('DELETE /api/recipes/:id', () => {
    test('deletes an existing recipe', async () => {
        const created = await request(app)
            .post('/api/recipes')
            .send(sampleRecipe);

        const res = await request(app).delete(`/api/recipes/${created.body.id}`);
        expect(res.status).toBe(200);
        expect(res.body.message).toBe('Recipe deleted successfully');
    });

    test('recipe is no longer accessible after deletion', async () => {
        const created = await request(app)
            .post('/api/recipes')
            .send(sampleRecipe);

        await request(app).delete(`/api/recipes/${created.body.id}`);

        const res = await request(app).get(`/api/recipes/${created.body.id}`);
        expect(res.status).toBe(404);
    });

    test('only deletes the targeted recipe', async () => {
        const r1 = await request(app).post('/api/recipes').send(sampleRecipe);
        const r2 = await request(app).post('/api/recipes').send(sampleRecipe2);

        await request(app).delete(`/api/recipes/${r1.body.id}`);

        const remaining = await request(app).get('/api/recipes');
        expect(remaining.body).toHaveLength(1);
        expect(remaining.body[0].id).toBe(r2.body.id);
    });

    test('returns 404 when deleting non-existent recipe', async () => {
        const res = await request(app).delete('/api/recipes/nonexistent999');
        expect(res.status).toBe(404);
        expect(res.body.error).toBe('Recipe not found');
    });
});

describe('POST /api/recipes/import', () => {
    test('imports an array of recipes', async () => {
        const toImport = [
            { name: 'Imported A', ingredients: [{ name: 'flour', weight: 100, type: 'flour' }] },
            { name: 'Imported B', ingredients: [{ name: 'flour', weight: 200, type: 'flour' }] }
        ];

        const res = await request(app)
            .post('/api/recipes/import')
            .send(toImport);

        expect(res.status).toBe(200);
        expect(res.body.count).toBe(2);

        const all = await request(app).get('/api/recipes');
        expect(all.body).toHaveLength(2);
        expect(all.body[0].name).toBe('Imported A');
        expect(all.body[1].name).toBe('Imported B');
    });

    test('merges with existing recipes', async () => {
        await request(app).post('/api/recipes').send(sampleRecipe);

        const toImport = [
            { name: 'New Import', ingredients: [] }
        ];

        await request(app).post('/api/recipes/import').send(toImport);

        const all = await request(app).get('/api/recipes');
        expect(all.body).toHaveLength(2);
    });

    test('assigns IDs to imported recipes without them', async () => {
        const toImport = [{ name: 'No ID', ingredients: [] }];
        await request(app).post('/api/recipes/import').send(toImport);

        const all = await request(app).get('/api/recipes');
        expect(all.body[0]).toHaveProperty('id');
        expect(all.body[0].id.length).toBeGreaterThan(0);
    });
});

describe('GET /api/recipes/export/all', () => {
    test('exports all recipes as JSON download', async () => {
        await request(app).post('/api/recipes').send(sampleRecipe);
        await request(app).post('/api/recipes').send(sampleRecipe2);

        const res = await request(app).get('/api/recipes/export/all');
        expect(res.status).toBe(200);
        expect(res.headers['content-type']).toMatch(/application\/json/);
        expect(res.headers['content-disposition']).toMatch(/attachment.*bread-recipes/);

        const exported = JSON.parse(res.text);
        expect(exported).toHaveLength(2);
    });

    test('returns empty array when no recipes', async () => {
        const res = await request(app).get('/api/recipes/export/all');
        const exported = JSON.parse(res.text);
        expect(exported).toEqual([]);
    });
});

describe('Full CRUD lifecycle', () => {
    test('create → read → update → read → delete → verify gone', async () => {
        // Create
        const created = await request(app)
            .post('/api/recipes')
            .send(sampleRecipe);
        expect(created.status).toBe(201);
        const id = created.body.id;

        // Read
        const read1 = await request(app).get(`/api/recipes/${id}`);
        expect(read1.body.name).toBe('Test Sourdough');

        // Update
        const updated = await request(app)
            .put(`/api/recipes/${id}`)
            .send({ name: 'Modified Sourdough', numLoaves: '4' });
        expect(updated.body.name).toBe('Modified Sourdough');

        // Read after update
        const read2 = await request(app).get(`/api/recipes/${id}`);
        expect(read2.body.name).toBe('Modified Sourdough');
        expect(read2.body.numLoaves).toBe('4');

        // Delete
        const deleted = await request(app).delete(`/api/recipes/${id}`);
        expect(deleted.status).toBe(200);

        // Verify gone
        const gone = await request(app).get(`/api/recipes/${id}`);
        expect(gone.status).toBe(404);
    });
});
