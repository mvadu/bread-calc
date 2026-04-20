const express = require('express');
const fs = require('fs').promises;
const path = require('path');

const app = express();
const PORT = 3000;
const RECIPES_FILE = process.env.RECIPES_FILE || path.join(__dirname, 'data', 'recipes.json');

// Middleware
app.use(express.json());
app.use(express.static('public'));

// Ensure data directory exists
async function ensureDataDir() {
    try {
        await fs.mkdir(path.join(__dirname, 'data'), { recursive: true });
        // Initialize recipes file if it doesn't exist
        try {
            await fs.access(RECIPES_FILE);
        } catch {
            await fs.writeFile(RECIPES_FILE, '[]');
        }
    } catch (err) {
        console.error('Error creating data directory:', err);
    }
}

// Get all recipes
app.get('/api/recipes', async (req, res) => {
    try {
        const data = await fs.readFile(RECIPES_FILE, 'utf8');
        const recipes = JSON.parse(data);
        res.json(recipes);
    } catch (err) {
        console.error('Error reading recipes:', err);
        res.status(500).json({ error: 'Failed to load recipes' });
    }
});

// Get single recipe by ID
app.get('/api/recipes/:id', async (req, res) => {
    try {
        const data = await fs.readFile(RECIPES_FILE, 'utf8');
        const recipes = JSON.parse(data);
        const recipe = recipes.find(r => r.id === req.params.id);
        
        if (recipe) {
            res.json(recipe);
        } else {
            res.status(404).json({ error: 'Recipe not found' });
        }
    } catch (err) {
        console.error('Error reading recipe:', err);
        res.status(500).json({ error: 'Failed to load recipe' });
    }
});

// Save new recipe
app.post('/api/recipes', async (req, res) => {
    try {
        const data = await fs.readFile(RECIPES_FILE, 'utf8');
        const recipes = JSON.parse(data);
        
        const newRecipe = {
            id: Date.now().toString(),
            ...req.body,
            date: new Date().toISOString()
        };
        
        recipes.push(newRecipe);
        await fs.writeFile(RECIPES_FILE, JSON.stringify(recipes, null, 2));
        
        res.status(201).json(newRecipe);
    } catch (err) {
        console.error('Error saving recipe:', err);
        res.status(500).json({ error: 'Failed to save recipe' });
    }
});

// Update existing recipe
app.put('/api/recipes/:id', async (req, res) => {
    try {
        const data = await fs.readFile(RECIPES_FILE, 'utf8');
        const recipes = JSON.parse(data);
        
        const index = recipes.findIndex(r => r.id === req.params.id);
        
        if (index === -1) {
            return res.status(404).json({ error: 'Recipe not found' });
        }
        
        recipes[index] = {
            ...recipes[index],
            ...req.body,
            id: req.params.id,
            updatedDate: new Date().toISOString()
        };
        
        await fs.writeFile(RECIPES_FILE, JSON.stringify(recipes, null, 2));
        
        res.json(recipes[index]);
    } catch (err) {
        console.error('Error updating recipe:', err);
        res.status(500).json({ error: 'Failed to update recipe' });
    }
});

// Delete recipe
app.delete('/api/recipes/:id', async (req, res) => {
    try {
        const data = await fs.readFile(RECIPES_FILE, 'utf8');
        let recipes = JSON.parse(data);
        
        const index = recipes.findIndex(r => r.id === req.params.id);
        
        if (index === -1) {
            return res.status(404).json({ error: 'Recipe not found' });
        }
        
        recipes = recipes.filter(r => r.id !== req.params.id);
        await fs.writeFile(RECIPES_FILE, JSON.stringify(recipes, null, 2));
        
        res.json({ message: 'Recipe deleted successfully' });
    } catch (err) {
        console.error('Error deleting recipe:', err);
        res.status(500).json({ error: 'Failed to delete recipe' });
    }
});

// Export all recipes
app.get('/api/recipes/export/all', async (req, res) => {
    try {
        const data = await fs.readFile(RECIPES_FILE, 'utf8');
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename=bread-recipes-${new Date().toISOString().split('T')[0]}.json`);
        res.send(data);
    } catch (err) {
        console.error('Error exporting recipes:', err);
        res.status(500).json({ error: 'Failed to export recipes' });
    }
});

// Import recipes
app.post('/api/recipes/import', async (req, res) => {
    try {
        const data = await fs.readFile(RECIPES_FILE, 'utf8');
        const existingRecipes = JSON.parse(data);
        const importedRecipes = req.body;
        
        // Add IDs to imported recipes if they don't have them
        const recipesWithIds = importedRecipes.map(recipe => ({
            ...recipe,
            id: recipe.id || Date.now().toString() + Math.random().toString(36).substr(2, 9)
        }));
        
        const merged = [...existingRecipes, ...recipesWithIds];
        await fs.writeFile(RECIPES_FILE, JSON.stringify(merged, null, 2));
        
        res.json({ message: `Successfully imported ${importedRecipes.length} recipes`, count: importedRecipes.length });
    } catch (err) {
        console.error('Error importing recipes:', err);
        res.status(500).json({ error: 'Failed to import recipes' });
    }
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Export for testing
module.exports = { app, ensureDataDir, RECIPES_FILE };

// Auto-backup recipes on startup (guard against data loss)
async function backupRecipes() {
    try {
        const data = await fs.readFile(RECIPES_FILE, 'utf8');
        const recipes = JSON.parse(data);
        if (recipes.length > 0) {
            const bakFile = RECIPES_FILE + '.bak';
            await fs.writeFile(bakFile, data);
            console.log(`Backup: ${recipes.length} recipe(s) → ${bakFile}`);
        }
    } catch (e) { /* no file yet, nothing to back up */ }
}

// Start server only when run directly (not when required by tests)
if (require.main === module) {
    ensureDataDir().then(async () => {
        await backupRecipes();
        app.listen(PORT, '0.0.0.0', () => {
            console.log(`Bread Calculator Server running on port ${PORT}`);
            console.log(`Recipes stored in: ${RECIPES_FILE}`);
        });
    });
}
