// API helper functions for recipe storage
const API_BASE = '';

async function saveRecipe() {
    const recipeName = document.getElementById('recipeName').value || 'Untitled Recipe';
    const totalWeight = document.getElementById('totalWeight').value;
    const numLoaves = document.getElementById('numLoaves').value;

    if (ingredients.length === 0) {
        alert('Please add ingredients before saving.');
        return;
    }

    const recipe = {
        name: recipeName,
        totalWeight: totalWeight,
        numLoaves: numLoaves,
        ingredients: ingredients
    };

    try {
        const response = await fetch(`${API_BASE}/api/recipes`);
        const savedRecipes = await response.json();
        const existing = savedRecipes.find(r => r.name === recipeName);
        
        if (existing) {
            if (confirm(`A recipe named "${recipeName}" already exists. Overwrite it?`)) {
                await fetch(`${API_BASE}/api/recipes/${existing.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(recipe)
                });
            } else {
                return;
            }
        } else {
            await fetch(`${API_BASE}/api/recipes`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(recipe)
            });
        }
        
        alert(`Recipe "${recipeName}" saved successfully!`);
    } catch (err) {
        console.error('Error saving recipe:', err);
        alert('Failed to save recipe. Please try again.');
    }
}

async function saveAsRecipe() {
    const currentName = document.getElementById('recipeName').value || 'Recipe';
    const totalWeight = document.getElementById('totalWeight').value;
    const numLoaves = document.getElementById('numLoaves').value;

    if (ingredients.length === 0) {
        alert('Please add ingredients before saving.');
        return;
    }

    // Generate default name with current recipe name + MMDD
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const defaultName = `${currentName}+${month}${day}`;

    // Prompt user for new name
    const newName = prompt('Save recipe as:', defaultName);
    
    if (!newName || !newName.trim()) {
        return; // User cancelled or entered empty name
    }

    const recipe = {
        name: newName.trim(),
        totalWeight: totalWeight,
        numLoaves: numLoaves,
        ingredients: ingredients
    };

    try {
        const response = await fetch(`${API_BASE}/api/recipes`);
        const savedRecipes = await response.json();
        const existing = savedRecipes.find(r => r.name === newName.trim());
        
        if (existing) {
            if (confirm(`A recipe named "${newName.trim()}" already exists. Overwrite it?`)) {
                await fetch(`${API_BASE}/api/recipes/${existing.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(recipe)
                });
            } else {
                return;
            }
        } else {
            await fetch(`${API_BASE}/api/recipes`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(recipe)
            });
        }
        
        // Update the current recipe name in the UI
        document.getElementById('recipeName').value = newName.trim();
        document.getElementById('recipeNameText').textContent = newName.trim();
        
        alert(`Recipe "${newName.trim()}" saved successfully!`);
    } catch (err) {
        console.error('Error saving recipe:', err);
        alert('Failed to save recipe. Please try again.');
    }
}

async function openLoadRecipeModal() {
    try {
        const response = await fetch(`${API_BASE}/api/recipes`);
        const savedRecipes = await response.json();
        
        if (savedRecipes.length === 0) {
            alert('No saved recipes found. Save a recipe first!');
            return;
        }

        renderSavedRecipes(savedRecipes);
        document.getElementById('loadRecipeModal').style.display = 'block';
    } catch (err) {
        console.error('Error loading recipes:', err);
        alert('Failed to load recipes. Please try again.');
    }
}

function renderSavedRecipes(recipes) {
    const container = document.getElementById('savedRecipesList');
    
    recipes.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    container.innerHTML = recipes.map((recipe) => {
        const date = new Date(recipe.date);
        const formattedDate = date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        const ingredientCount = recipe.ingredients.length;
        
        return `
            <div class="saved-recipe-item">
                <div class="saved-recipe-info">
                    <div class="saved-recipe-name">${recipe.name}</div>
                    <div class="saved-recipe-meta">
                        📅 ${formattedDate} | 
                        🥖 ${recipe.numLoaves} loaf(s) | 
                        ⚖️ ${recipe.totalWeight}g | 
                        📝 ${ingredientCount} ingredient(s)
                    </div>
                </div>
                <div class="saved-recipe-actions">
                    <button onclick="loadRecipe('${recipe.id}')" class="btn-small">Load</button>
                    <button onclick="deleteRecipe('${recipe.id}')" class="btn-danger btn-small">Delete</button>
                </div>
            </div>
        `;
    }).join('');
}

async function loadRecipe(id) {
    try {
        const response = await fetch(`${API_BASE}/api/recipes/${id}`);
        const recipe = await response.json();
        
        document.getElementById('recipeName').value = recipe.name;
        document.getElementById('totalWeight').value = recipe.totalWeight;
        document.getElementById('numLoaves').value = recipe.numLoaves;
        ingredients = recipe.ingredients;
        
        renderIngredients();
        calculate();
        closeLoadRecipeModal();
        
        alert(`Recipe "${recipe.name}" loaded successfully!`);
    } catch (err) {
        console.error('Error loading recipe:', err);
        alert('Failed to load recipe. Please try again.');
    }
}

async function deleteRecipe(id) {
    try {
        const response = await fetch(`${API_BASE}/api/recipes/${id}`);
        const recipe = await response.json();
        
        if (confirm(`Are you sure you want to delete "${recipe.name}"?`)) {
            await fetch(`${API_BASE}/api/recipes/${id}`, { method: 'DELETE' });
            
            const recipesResponse = await fetch(`${API_BASE}/api/recipes`);
            const savedRecipes = await recipesResponse.json();
            
            if (savedRecipes.length === 0) {
                closeLoadRecipeModal();
            } else {
                renderSavedRecipes(savedRecipes);
            }
        }
    } catch (err) {
        console.error('Error deleting recipe:', err);
        alert('Failed to delete recipe. Please try again.');
    }
}

async function exportRecipes() {
    try {
        window.location.href = `${API_BASE}/api/recipes/export/all`;
    } catch (err) {
        console.error('Error exporting recipes:', err);
        alert('Failed to export recipes. Please try again.');
    }
}

async function importRecipes() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';
    input.onchange = async (e) => {
        const file = e.target.files[0];
        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const importedRecipes = JSON.parse(event.target.result);
                
                const response = await fetch(`${API_BASE}/api/recipes/import`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(importedRecipes)
                });
                
                const result = await response.json();
                alert(`Successfully imported ${result.count} recipe(s)!`);
                await openLoadRecipeModal();
            } catch (err) {
                console.error('Error importing recipes:', err);
                alert('Error importing recipes. Please check the file format.');
            }
        };
        reader.readAsText(file);
    };
    input.click();
}
