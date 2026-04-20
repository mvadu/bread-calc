// Bread Calculator - Version 2026-04-20-v6 (sections support)
console.log('Bread Calculator script loaded');

// Data model: sections[], each with name + ingredients[]
let sections = [];

// Backward compat helper: flat ingredients[] -> sections[]
function migrateToSections(data) {
    if (data.sections && Array.isArray(data.sections)) {
        return data.sections;
    }
    if (data.ingredients && Array.isArray(data.ingredients)) {
        return [{ name: 'Dough', type: 'dough', ingredients: data.ingredients }];
    }
    return [{ name: 'Dough', type: 'dough', ingredients: [] }];
}

// Flatten all ingredients across all sections
function getAllIngredients() {
    return sections.flatMap(s => s.ingredients);
}

// Ingredient types
const ingredientTypes = {
    'flour': 'Flour',
    'fluid': 'Fluid',
    'starter': 'Starter',
    'salt': 'Salt',
    'yeast': 'Yeast',
    'fat': 'Fat',
    'sugar': 'Sugar',
    'dairy': 'Dairy',
    'egg': 'Egg',
    'misc': 'Miscellaneous',
    'extra': 'Other extras'
};

// Section types
const sectionTypes = {
    'dough': 'Dough',
    'preferment': 'Pre-ferment',
    'soaker': 'Soaker',
    'tangzhong': 'Tangzhong',
    'topping': 'Topping',
    'filling': 'Filling',
    'other': 'Other'
};

// ========== Initialize ==========

function initializeDefaultRecipe() {
    console.log('Initializing default recipe...');
    sections = [{
        name: 'Dough',
        type: 'dough',
        ingredients: [
            { name: 'bread flour', weight: 500, type: 'flour' },
            { name: 'Whole wheat', weight: 250, type: 'flour' },
            { name: 'Barley flour', weight: 100, type: 'flour' },
            { name: 'Whey protein', weight: 50, type: 'extra' },
            { name: 'Gluten', weight: 20, type: 'flour' },
            { name: 'Psyllium husk', weight: 25, type: 'extra' },
            { name: 'Dry yeast', weight: 25, type: 'yeast' },
            { name: 'water', weight: 620, type: 'fluid' },
            { name: '7 grain', weight: 75, type: 'extra' },
            { name: 'Honey', weight: 75, type: 'sugar', hydration: 18 },
            { name: 'Olive oil', weight: 25, type: 'fat' },
            { name: 'cream cheese', weight: 50, type: 'dairy', hydration: 55 },
            { name: 'starter', weight: 200, type: 'starter', hydration: 80, includeFlour: true },
            { name: 'Super seed', weight: 40, type: 'extra' },
            { name: 'Pumpkin seeds', weight: 50, type: 'extra' },
            { name: 'Sunflower seeds', weight: 50, type: 'extra' },
            { name: 'salt', weight: 18, type: 'salt' }
        ]
    }];
    renderAll();
    console.log('Default recipe initialized');
}

// ========== Section Management ==========

function addSection() {
    const name = prompt('Section name:', 'New Section');
    if (!name || !name.trim()) return;
    sections.push({ name: name.trim(), type: 'dough', ingredients: [] });
    renderAll();
}

function renameSection(sIdx) {
    const current = sections[sIdx].name;
    const newName = prompt('Rename section:', current);
    if (!newName || !newName.trim()) return;
    sections[sIdx].name = newName.trim();
    renderAll();
}

function removeSection(sIdx) {
    if (sections.length <= 1) {
        alert('Cannot remove the last section.');
        return;
    }
    if (sections[sIdx].ingredients.length > 0) {
        if (!confirm(`Delete section "${sections[sIdx].name}" and its ${sections[sIdx].ingredients.length} ingredient(s)?`)) return;
    }
    sections.splice(sIdx, 1);
    renderAll();
}

function moveSectionUp(sIdx) {
    if (sIdx <= 0) return;
    [sections[sIdx - 1], sections[sIdx]] = [sections[sIdx], sections[sIdx - 1]];
    renderAll();
}

function moveSectionDown(sIdx) {
    if (sIdx >= sections.length - 1) return;
    [sections[sIdx], sections[sIdx + 1]] = [sections[sIdx + 1], sections[sIdx]];
    renderAll();
}

// ========== Scale ==========

let previousServings = 2;

function scaleByServings() {
    const newServings = parseInt(document.getElementById('numLoaves').value) || 1;
    if (getAllIngredients().length === 0 || newServings === previousServings) return;

    const scaleFactor = newServings / previousServings;
    sections.forEach(sec => {
        sec.ingredients = sec.ingredients.map(ing => ({ ...ing, weight: ing.weight * scaleFactor }));
    });
    previousServings = newServings;
    renderAll();
}

// ========== Bowl weight ==========

function updateBowlWeight() {
    sections.forEach((sec, sIdx) => {
        let secTotal = 0, secChecked = 0;
        sec.ingredients.forEach((ing, iIdx) => {
            const cb = document.getElementById(`check-${sIdx}-${iIdx}`);
            if (cb && cb.checked) {
                secTotal += ing.weight;
                secChecked++;
            }
        });
        const el = document.getElementById(`bowlWeight-${sIdx}`);
        if (el) {
            if (secChecked === 0) {
                el.textContent = '\u{1F963} 0g';
                el.classList.remove('bowl-active');
            } else {
                el.textContent = `\u{1F963} ${secTotal.toFixed(0)}g`;
                el.classList.add('bowl-active');
            }
        }
    });
}

// ========== Modal functions ==========

let addIngredientSectionIndex = 0;

function openAddIngredientModal(sIdx) {
    addIngredientSectionIndex = (sIdx !== undefined) ? sIdx : 0;
    document.getElementById('addIngredientModal').style.display = 'block';
    resetModalForm();
}

function closeAddIngredientModal() {
    document.getElementById('addIngredientModal').style.display = 'none';
}

function resetModalForm() {
    document.getElementById('ingredientWeightRadio').checked = true;
    document.getElementById('ingredientWeight').value = '';
    document.getElementById('ingredientWeight').disabled = false;
    document.getElementById('ingredientPercentage').value = '';
    document.getElementById('ingredientPercentage').disabled = true;
    document.getElementById('ingredientName').value = '';
    document.getElementById('ingredientType').value = 'none';
    document.getElementById('ingredientHydration').value = '100';
    document.getElementById('ingredientIncludeFlour').checked = true;
    hideAllDynamicFields();
}

function hideAllDynamicFields() {
    document.querySelectorAll('.dynamic-field').forEach(el => el.style.display = 'none');
}

function onWeightTypeChange(type) {
    document.getElementById('ingredientWeight').disabled = (type !== 'weight');
    document.getElementById('ingredientPercentage').disabled = (type === 'weight');
}

function onIngredientTypeChange() {
    const type = document.getElementById('ingredientType').value;
    hideAllDynamicFields();
    if (type === 'starter') document.getElementById('starterFields').style.display = 'block';
    else if (type === 'dairy') { document.getElementById('dairyFields').style.display = 'block'; onDairyPresetChange(); }
    else if (type === 'egg') document.getElementById('eggFields').style.display = 'block';
    else if (type === 'misc') document.getElementById('miscFields').style.display = 'block';
    else if (type === 'sugar') { document.getElementById('sugarFields').style.display = 'block'; onSugarPresetChange(); }

    const pg = document.getElementById('percentageGroup');
    pg.style.display = ['flour','fluid','starter','salt','yeast','fat','sugar'].includes(type) ? 'block' : 'none';
}

// Dairy presets
function onDairyPresetChange() {
    const preset = document.getElementById('dairyPreset').value;
    const presets = {
        '0': {protein:3.4,fat:0.1,carbs:5,sugars:5,ash:0.7,salt:0,hydration:90.8},
        '1': {protein:3.4,fat:0.3,carbs:4.8,sugars:4.8,ash:0.7,salt:0,hydration:90.8},
        '2': {protein:3.3,fat:0.5,carbs:4.9,sugars:4.9,ash:0.7,salt:0,hydration:90.6},
        '3': {protein:3.4,fat:1,carbs:4.8,sugars:4.8,ash:0.7,salt:0,hydration:90.1},
        '15':{protein:3.3,fat:2,carbs:4.8,sugars:4.8,ash:0.7,salt:0,hydration:89.2},
        '4': {protein:3.2,fat:3.5,carbs:4.8,sugars:4.8,ash:0.7,salt:0,hydration:87.8},
        '5': {protein:2.8,fat:9,carbs:4.3,sugars:4.3,ash:0.6,salt:0,hydration:83.3},
        '6': {protein:2.7,fat:12,carbs:4.1,sugars:4.1,ash:0.6,salt:0,hydration:80.6},
        '7': {protein:2.3,fat:20,carbs:3.4,sugars:3.4,ash:0.5,salt:0,hydration:73.8},
        '8': {protein:2.1,fat:33,carbs:3.1,sugars:3.1,ash:0.5,salt:0,hydration:61.3},
        '9': {protein:2,fat:38,carbs:2.9,sugars:2.9,ash:0.4,salt:0,hydration:56.7},
        '10':{protein:1.7,fat:50,carbs:2.8,sugars:2.8,ash:0.4,salt:0,hydration:45.1},
        '11':{protein:4.3,fat:3.6,carbs:5,sugars:5,ash:0.7,salt:0,hydration:86.4},
        '12':{protein:4.3,fat:0.1,carbs:5.7,sugars:5.7,ash:0.8,salt:0,hydration:89.1},
        '13':{protein:0.6,fat:81,carbs:0.7,sugars:0.7,ash:3.5,salt:1.5,hydration:14.2},
        '14':{protein:0.9,fat:82,carbs:0.1,sugars:0.1,ash:2,salt:0,hydration:15},
    };
    if (preset !== '-1' && presets[preset]) {
        const v = presets[preset];
        document.getElementById('dairyProtein').value = v.protein;
        document.getElementById('dairyFat').value = v.fat;
        document.getElementById('dairyCarbs').value = v.carbs;
        document.getElementById('dairySugars').value = v.sugars;
        document.getElementById('dairyAsh').value = v.ash;
        document.getElementById('dairySalt').value = v.salt;
        document.getElementById('dairyHydration').value = v.hydration;
    }
}

function calculateDairyHydration() {
    const p = parseFloat(document.getElementById('dairyProtein').value)||0;
    const f = parseFloat(document.getElementById('dairyFat').value)||0;
    const c = parseFloat(document.getElementById('dairyCarbs').value)||0;
    const a = parseFloat(document.getElementById('dairyAsh').value)||0;
    const s = parseFloat(document.getElementById('dairySalt').value)||0;
    document.getElementById('dairyHydration').value = (100-p-f-c-a-s).toFixed(1);
}

function onSugarPresetChange() {
    const p = document.getElementById('sugarPreset').value;
    if (p==='0') { document.getElementById('sugarCarbs').value=100; document.getElementById('sugarSugars').value=100; document.getElementById('sugarHydration').value=0; }
    else if (p==='1') { document.getElementById('sugarCarbs').value=82; document.getElementById('sugarSugars').value=82; document.getElementById('sugarHydration').value=18; }
}

function calculateSugarHydration() {
    const c = parseFloat(document.getElementById('sugarCarbs').value)||0;
    document.getElementById('sugarHydration').value = (100-c).toFixed(1);
}

function calculateMiscHydration() {
    const p = parseFloat(document.getElementById('miscProtein').value)||0;
    const f = parseFloat(document.getElementById('miscFat').value)||0;
    const c = parseFloat(document.getElementById('miscCarbs').value)||0;
    const a = parseFloat(document.getElementById('miscAsh').value)||0;
    const s = parseFloat(document.getElementById('miscSalt').value)||0;
    document.getElementById('miscHydration').value = (100-p-f-c-a-s).toFixed(1);
}

function confirmAddIngredient() {
    const name = document.getElementById('ingredientName').value.trim();
    const type = document.getElementById('ingredientType').value;
    const weightType = document.querySelector('input[name="weightType"]:checked').value;
    let weight = 0;

    if (weightType === 'weight') {
        weight = parseFloat(document.getElementById('ingredientWeight').value);
    } else {
        const pct = parseFloat(document.getElementById('ingredientPercentage').value);
        const totalFlour = getAllIngredients().filter(i => i.type==='flour').reduce((s,i)=>s+i.weight,0);
        weight = (pct/100)*totalFlour;
    }

    if (!name) { alert('Please enter an ingredient name'); return; }
    if (isNaN(weight)||weight<=0) { alert('Please enter a valid weight or percentage'); return; }
    if (type==='none') { alert('Please select an ingredient type'); return; }

    const ing = { name, weight, type };
    if (type==='starter') { ing.hydration=parseFloat(document.getElementById('ingredientHydration').value)||100; ing.includeFlour=document.getElementById('ingredientIncludeFlour').checked; }
    else if (type==='dairy') { ing.hydration=parseFloat(document.getElementById('dairyHydration').value)||0; ing.protein=parseFloat(document.getElementById('dairyProtein').value)||0; ing.fat=parseFloat(document.getElementById('dairyFat').value)||0; }
    else if (type==='sugar') { ing.hydration=parseFloat(document.getElementById('sugarHydration').value)||0; }
    else if (type==='misc') { ing.hydration=parseFloat(document.getElementById('miscHydration').value)||0; }

    sections[addIngredientSectionIndex].ingredients.push(ing);
    renderAll();
    closeAddIngredientModal();
}

// ========== Edit Ingredient ==========

let editingSIdx = -1, editingIIdx = -1;

function openEditIngredientModal(sIdx, iIdx) {
    editingSIdx = sIdx; editingIIdx = iIdx;
    const ing = sections[sIdx].ingredients[iIdx];
    document.getElementById('editIngredientName').value = ing.name;
    document.getElementById('editIngredientWeight').value = ing.weight;
    document.getElementById('editIngredientType').value = ing.type;
    document.getElementById('editIngredientWeightRadio').checked = true;
    document.getElementById('editIngredientWeight').disabled = false;
    document.getElementById('editIngredientPercentage').disabled = true;
    document.querySelectorAll('#editIngredientModal .dynamic-field').forEach(el => el.style.display='none');
    if (ing.type==='starter') {
        document.getElementById('editStarterFields').style.display='block';
        document.getElementById('editIngredientHydration').value=ing.hydration||100;
        document.getElementById('editIngredientIncludeFlour').checked=ing.includeFlour!==false;
    }
    onEditIngredientTypeChange();
    document.getElementById('editIngredientModal').style.display='block';
}

function closeEditIngredientModal() { document.getElementById('editIngredientModal').style.display='none'; editingSIdx=-1; editingIIdx=-1; }

function onEditWeightTypeChange(type) {
    document.getElementById('editIngredientWeight').disabled=(type!=='weight');
    document.getElementById('editIngredientPercentage').disabled=(type==='weight');
}

function onEditIngredientTypeChange() {
    const type = document.getElementById('editIngredientType').value;
    document.querySelectorAll('#editIngredientModal .dynamic-field').forEach(el => el.style.display='none');
    if (type==='starter') document.getElementById('editStarterFields').style.display='block';
    const pg = document.getElementById('editPercentageGroup');
    pg.style.display = ['flour','fluid','starter','salt','yeast','fat','sugar'].includes(type) ? 'block' : 'none';
}

function confirmEditIngredient() {
    const name = document.getElementById('editIngredientName').value.trim();
    const type = document.getElementById('editIngredientType').value;
    const weightType = document.querySelector('input[name="editWeightType"]:checked').value;
    let weight = 0;
    if (weightType==='weight') { weight=parseFloat(document.getElementById('editIngredientWeight').value); }
    else { const pct=parseFloat(document.getElementById('editIngredientPercentage').value); const tf=getAllIngredients().filter(i=>i.type==='flour').reduce((s,i)=>s+i.weight,0); weight=(pct/100)*tf; }

    if (!name) { alert('Please enter an ingredient name'); return; }
    if (isNaN(weight)||weight<=0) { alert('Please enter a valid weight or percentage'); return; }
    if (type==='none') { alert('Please select an ingredient type'); return; }

    const upd = { name, weight, type };
    if (type==='starter') { upd.hydration=parseFloat(document.getElementById('editIngredientHydration').value)||100; upd.includeFlour=document.getElementById('editIngredientIncludeFlour').checked; }

    sections[editingSIdx].ingredients[editingIIdx] = upd;
    renderAll();
    closeEditIngredientModal();
}

// ========== Scale Ingredient ==========

let scalingSIdx = -1, scalingIIdx = -1;

function openScaleIngredientModal(sIdx, iIdx) {
    scalingSIdx = sIdx; scalingIIdx = iIdx;
    const ing = sections[sIdx].ingredients[iIdx];
    document.getElementById('scaleIngredientName').textContent = ing.name;
    document.getElementById('scaleIngredientCurrentWeight').textContent = `${ing.weight}g`;
    document.getElementById('scaleIngredientNewWeight').value = ing.weight;
    document.getElementById('scaleIngredientFactor').textContent = '1.00x';
    document.getElementById('scaleIngredientNewWeight').oninput = function() {
        const f = (parseFloat(this.value)||0) / ing.weight;
        document.getElementById('scaleIngredientFactor').textContent = f.toFixed(2)+'x';
    };
    document.getElementById('scaleIngredientModal').style.display = 'block';
}

function closeScaleIngredientModal() { document.getElementById('scaleIngredientModal').style.display='none'; scalingSIdx=-1; scalingIIdx=-1; }

function confirmScaleIngredient() {
    const cw = sections[scalingSIdx].ingredients[scalingIIdx].weight;
    const nw = parseFloat(document.getElementById('scaleIngredientNewWeight').value);
    if (isNaN(nw)||nw<=0) { alert('Please enter a valid weight'); return; }
    const sf = nw/cw;
    if (confirm(`Scale all ingredients by ${sf.toFixed(2)}x?`)) {
        sections.forEach(sec => { sec.ingredients = sec.ingredients.map(i=>({...i,weight:i.weight*sf})); });
        renderAll();
        closeScaleIngredientModal();
    }
}

// ========== Scale All ==========

function openScaleAllModal() {
    const all = getAllIngredients();
    if (all.length===0) { alert('Please add ingredients before scaling.'); return; }
    const ct = all.reduce((s,i)=>s+i.weight,0);
    document.getElementById('scaleAllCurrentTotal').textContent = `${ct.toFixed(1)}g`;
    document.getElementById('scaleAllNewTotal').value = ct.toFixed(1);
    document.getElementById('scaleAllMultiplier').value = '1';
    document.getElementById('scaleAllResultTotal').textContent = `${ct.toFixed(1)}g`;

    document.getElementById('scaleAllNewTotal').oninput = function() {
        const ct2 = getAllIngredients().reduce((s,i)=>s+i.weight,0);
        const nt = parseFloat(this.value)||0;
        document.getElementById('scaleAllMultiplier').value = (nt/ct2).toFixed(2);
        document.getElementById('scaleAllResultTotal').textContent = `${nt.toFixed(1)}g`;
    };
    document.getElementById('scaleAllMultiplier').oninput = function() {
        const ct2 = getAllIngredients().reduce((s,i)=>s+i.weight,0);
        const m = parseFloat(this.value)||1;
        const nt = ct2*m;
        document.getElementById('scaleAllNewTotal').value = nt.toFixed(1);
        document.getElementById('scaleAllResultTotal').textContent = `${nt.toFixed(1)}g`;
    };
    document.getElementById('scaleAllModal').style.display = 'block';
}

function closeScaleAllModal() { document.getElementById('scaleAllModal').style.display='none'; }

function confirmScaleAll() {
    const m = parseFloat(document.getElementById('scaleAllMultiplier').value);
    if (isNaN(m)||m<=0) { alert('Please enter a valid multiplier'); return; }
    sections.forEach(sec => { sec.ingredients = sec.ingredients.map(i=>({...i,weight:i.weight*m})); });
    renderAll();
    closeScaleAllModal();
}

// ========== Close modals on outside click ==========

window.onclick = function(event) {
    ['addIngredientModal','editIngredientModal','scaleIngredientModal','scaleAllModal','loadRecipeModal'].forEach(id => {
        const m = document.getElementById(id);
        if (event.target === m) m.style.display = 'none';
    });
};

// ========== Recipe Storage ==========

function buildRecipeData() {
    return {
        name: document.getElementById('recipeName').value || 'Untitled Recipe',
        totalWeight: document.getElementById('totalWeight').value,
        numLoaves: document.getElementById('numLoaves').value,
        bakingTemp: document.getElementById('bakingTemp').value,
        bakingTime: document.getElementById('bakingTime').value,
        notes: document.getElementById('notes').value,
        sections: sections,
        // Keep flat ingredients for backward compat
        ingredients: getAllIngredients()
    };
}

async function saveRecipe() {
    const all = getAllIngredients();
    if (all.length===0) { alert('Please add ingredients before saving.'); return; }
    const recipe = buildRecipeData();
    try {
        const resp = await fetch('/api/recipes');
        const saved = await resp.json();
        const existing = saved.find(r => r.name === recipe.name);
        if (existing) {
            if (!confirm(`A recipe named "${recipe.name}" already exists. Overwrite it?`)) return;
            await fetch(`/api/recipes/${existing.id}`, { method:'PUT', headers:{'Content-Type':'application/json'}, body:JSON.stringify(recipe) });
        } else {
            await fetch('/api/recipes', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(recipe) });
        }
        alert(`Recipe "${recipe.name}" saved successfully!`);
    } catch(e) { console.error(e); alert('Failed to save recipe.'); }
}

async function saveAsRecipe() {
    const all = getAllIngredients();
    if (all.length===0) { alert('Please add ingredients before saving.'); return; }
    const now = new Date();
    const defaultName = `${document.getElementById('recipeName').value||'Recipe'}+${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}`;
    const newName = prompt('Save recipe as:', defaultName);
    if (!newName||!newName.trim()) return;

    const recipe = buildRecipeData();
    recipe.name = newName.trim();
    try {
        const resp = await fetch('/api/recipes');
        const saved = await resp.json();
        const existing = saved.find(r => r.name === newName.trim());
        if (existing) {
            if (!confirm(`A recipe named "${newName.trim()}" already exists. Overwrite it?`)) return;
            await fetch(`/api/recipes/${existing.id}`, { method:'PUT', headers:{'Content-Type':'application/json'}, body:JSON.stringify(recipe) });
        } else {
            await fetch('/api/recipes', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(recipe) });
        }
        document.getElementById('recipeName').value = newName.trim();
        document.getElementById('recipeNameText').textContent = newName.trim();
        alert(`Recipe "${newName.trim()}" saved successfully!`);
    } catch(e) { console.error(e); alert('Failed to save recipe.'); }
}

async function openLoadRecipeModal() {
    try {
        const resp = await fetch('/api/recipes');
        const saved = await resp.json();
        if (saved.length===0) { alert('No saved recipes found. Save a recipe first!'); return; }
        renderSavedRecipes(saved);
        document.getElementById('loadRecipeModal').style.display = 'block';
    } catch(e) { console.error(e); alert('Failed to load recipes.'); }
}

function closeLoadRecipeModal() { document.getElementById('loadRecipeModal').style.display='none'; }

function renderSavedRecipes(recipes) {
    const c = document.getElementById('savedRecipesList');
    recipes.sort((a,b)=>new Date(b.date)-new Date(a.date));
    c.innerHTML = recipes.map(r => {
        const d = new Date(r.date);
        const fd = d.toLocaleDateString()+' '+d.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'});
        const ic = r.ingredients ? r.ingredients.length : (r.sections ? r.sections.reduce((s,sec)=>s+sec.ingredients.length,0) : 0);
        const sc = r.sections ? r.sections.length : 1;
        return `<div class="saved-recipe-item">
            <div class="saved-recipe-info">
                <div class="saved-recipe-name">${r.name}</div>
                <div class="saved-recipe-meta">\u{1F4C5} ${fd} | \u{1F950} ${r.numLoaves} serving(s) | \u{2696}\u{FE0F} ${r.totalWeight}g | ${sc} section(s), ${ic} ingredient(s)</div>
            </div>
            <div class="saved-recipe-actions">
                <button onclick="loadRecipe('${r.id}')" class="btn-small btn-success">Load</button>
                <button onclick="deleteRecipe('${r.id}')" class="btn-danger btn-small">Delete</button>
            </div>
        </div>`;
    }).join('');
}

async function loadRecipe(id) {
    try {
        const resp = await fetch(`/api/recipes/${id}`);
        const recipe = await resp.json();
        document.getElementById('recipeName').value = recipe.name;
        document.getElementById('recipeNameText').textContent = recipe.name;
        document.getElementById('totalWeight').value = recipe.totalWeight;
        document.getElementById('numLoaves').value = recipe.numLoaves;
        previousServings = parseInt(recipe.numLoaves)||2;
        document.getElementById('bakingTemp').value = recipe.bakingTemp||'230';
        document.getElementById('bakingTime').value = recipe.bakingTime||'45';
        document.getElementById('notes').value = recipe.notes||'';
        sections = migrateToSections(recipe);
        renderAll();
        closeLoadRecipeModal();
    } catch(e) { console.error(e); alert('Failed to load recipe.'); }
}

async function deleteRecipe(id) {
    try {
        const resp = await fetch(`/api/recipes/${id}`);
        const recipe = await resp.json();
        if (!confirm(`Delete "${recipe.name}"?`)) return;
        await fetch(`/api/recipes/${id}`, { method:'DELETE' });
        const resp2 = await fetch('/api/recipes');
        const saved = await resp2.json();
        if (saved.length===0) closeLoadRecipeModal();
        else renderSavedRecipes(saved);
    } catch(e) { console.error(e); alert('Failed to delete recipe.'); }
}

async function exportRecipes() { window.location.href='/api/recipes/export/all'; }

async function importRecipes() {
    const input = document.createElement('input');
    input.type='file'; input.accept='application/json';
    input.onchange = async(e) => {
        const reader = new FileReader();
        reader.onload = async(ev) => {
            try {
                const imported = JSON.parse(ev.target.result);
                const resp = await fetch('/api/recipes/import', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(imported) });
                const result = await resp.json();
                alert(`Imported ${result.count} recipe(s)!`);
                await openLoadRecipeModal();
            } catch(err) { console.error(err); alert('Error importing.'); }
        };
        reader.readAsText(e.target.files[0]);
    };
    input.click();
}

// ========== Share / URL ==========

function shareRecipe() {
    const params = new URLSearchParams();
    params.set('n', document.getElementById('recipeName').value);
    params.set('w', document.getElementById('totalWeight').value);
    params.set('l', document.getElementById('numLoaves').value);
    params.set('t', document.getElementById('bakingTemp').value);
    params.set('tm', document.getElementById('bakingTime').value);
    params.set('nt', document.getElementById('notes').value);
    params.set('s', JSON.stringify(sections));
    // Also keep flat ingredients for backward compat
    params.set('i', JSON.stringify(getAllIngredients()));
    const url = window.location.origin+window.location.pathname+'?'+params.toString();
    navigator.clipboard.writeText(url).then(()=>alert('Recipe URL copied to clipboard!')).catch(()=>prompt('Copy this URL:',url));
}

// ========== Reset ==========

function resetRecipe() {
    if (!confirm('Reset? This will clear all sections and ingredients.')) return;
    sections = [{ name:'Dough', type:'dough', ingredients:[] }];
    document.getElementById('recipeName').value = 'My Bread Recipe';
    document.getElementById('recipeNameText').textContent = 'My Bread Recipe';
    document.getElementById('totalWeight').value = '1000';
    document.getElementById('numLoaves').value = '2';
    previousServings = 2;
    renderAll();
}

// ========== Recipe Name ==========

function editRecipeName() {
    document.getElementById('recipeNameDisplay').style.display='none';
    document.getElementById('recipeNameEdit').style.display='flex';
    document.getElementById('recipeName').focus();
    document.getElementById('recipeName').select();
}
function saveRecipeName() {
    const n = document.getElementById('recipeName').value.trim()||'My Recipe';
    document.getElementById('recipeName').value=n;
    document.getElementById('recipeNameText').textContent=n;
    document.getElementById('recipeNameDisplay').style.display='flex';
    document.getElementById('recipeNameEdit').style.display='none';
}
function cancelRecipeName() {
    document.getElementById('recipeNameDisplay').style.display='flex';
    document.getElementById('recipeNameEdit').style.display='none';
}

// ========== Inline edits (servings / weight from totals) ==========

function editNumLoaves() {
    const n = prompt('Number of servings:', document.getElementById('numLoaves').value);
    if (!n) return;
    const val = parseInt(n)||1;
    document.getElementById('numLoaves').value = val;
    scaleByServings();
}

function editTotalWeight() {
    const all = getAllIngredients();
    const ct = all.reduce((s,i)=>s+i.weight,0);
    const n = prompt('New total dough weight (g):', ct.toFixed(0));
    if (!n) return;
    const target = parseFloat(n);
    if (!target||target<=0) return;
    const sf = target/ct;
    sections.forEach(sec => { sec.ingredients = sec.ingredients.map(i=>({...i,weight:i.weight*sf})); });
    renderAll();
}

// ========== Remove / Add ingredient ==========

function addIngredient(sIdx) { openAddIngredientModal(sIdx); }

function removeIngredient(sIdx, iIdx) {
    sections[sIdx].ingredients.splice(iIdx, 1);
    renderAll();
}

// ========== Rendering ==========

function renderAll() {
    renderSections();
    calculate();
}

function renderSections() {
    const container = document.getElementById('sectionsContainer');
    if (!container) return;

    container.innerHTML = sections.map((sec, sIdx) => {
        const secWeight = sec.ingredients.reduce((s,i)=>s+i.weight,0);

        // Ingredient table
        const allIngs = getAllIngredients();
        const totalFlour = allIngs.filter(i=>i.type==='flour').reduce((s,i)=>s+i.weight,0)
            + allIngs.filter(i=>i.type==='starter'&&i.includeFlour!==false&&i.hydration).reduce((s,i)=>s+i.weight/(1+i.hydration/100),0);

        let tableHtml = '';
        if (sec.ingredients.length > 0) {
            const rows = sec.ingredients.map((ing, iIdx) => {
                const pct = totalFlour>0 ? ((ing.weight/totalFlour)*100).toFixed(1) : '\u2014';
                const typeName = ingredientTypes[ing.type]||ing.type;
                let meta = '';
                if (ing.type==='starter'&&ing.hydration) meta=`${ing.hydration}% hyd`;
                return `<tr>
                    <td><input type="checkbox" class="ing-checkbox" id="check-${sIdx}-${iIdx}" title="Mark as added" onchange="updateBowlWeight()"></td>
                    <td class="ing-name">${ing.name}${meta?` <span class="ing-meta">(${meta})</span>`:''}</td>
                    <td class="num">${ing.weight.toFixed(1)}g</td>
                    <td class="ing-type">${typeName}</td>
                    <td class="num">${pct}%</td>
                    <td class="ing-actions">
                        <button onclick="openScaleIngredientModal(${sIdx},${iIdx})" title="Scale">\u2696\uFE0F</button>
                        <button onclick="openEditIngredientModal(${sIdx},${iIdx})" title="Edit">\u270F\uFE0F</button>
                        <button class="btn-danger" onclick="removeIngredient(${sIdx},${iIdx})" title="Delete">\u{1F5D1}\uFE0F</button>
                    </td>
                </tr>`;
            }).join('');

            tableHtml = `<table class="ingredient-table">
                <thead><tr>
                    <th style="width:32px"></th>
                    <th>Ingredient</th>
                    <th class="num">Weight</th>
                    <th>Type</th>
                    <th class="num">Baker's %</th>
                    <th style="width:90px"></th>
                </tr></thead>
                <tbody>${rows}</tbody>
            </table>`;
        } else {
            tableHtml = '<p style="color:#999;text-align:center;padding:20px;">No ingredients yet.</p>';
        }

        // Section move buttons
        const moveUp = sIdx > 0 ? `<button onclick="moveSectionUp(${sIdx})" title="Move up" style="background:none;border:none;cursor:pointer;color:#888;font-size:0.85em;">\u25B2</button>` : '';
        const moveDown = sIdx < sections.length-1 ? `<button onclick="moveSectionDown(${sIdx})" title="Move down" style="background:none;border:none;cursor:pointer;color:#888;font-size:0.85em;">\u25BC</button>` : '';

        return `<div class="section" id="section-${sIdx}">
            <div class="section-header">
                <div style="display:flex;align-items:center;gap:8px;">
                    <h2 style="cursor:pointer;" onclick="renameSection(${sIdx})" title="Click to rename">${sec.name}</h2>
                    <span style="display:flex;flex-direction:column;gap:0;">${moveUp}${moveDown}</span>
                </div>
                <span class="section-header-right">
                    <span class="bowl-weight" id="bowlWeight-${sIdx}" title="Checked-off total">\u{1F963} 0g</span>
                    <span class="section-weight">Section: ${secWeight.toFixed(0)}g</span>
                    ${sections.length > 1 ? `<button onclick="removeSection(${sIdx})" title="Remove section" style="background:none;border:none;cursor:pointer;color:#e74c3c;font-size:1em;">\u2716</button>` : ''}
                </span>
            </div>
            <div class="section-body">${tableHtml}</div>
            <div class="section-footer">
                <button onclick="addIngredient(${sIdx})">+ Add ingredient</button>
            </div>
        </div>`;
    }).join('');

    updateBowlWeight();
}

// ========== Calculate ==========

function calculate() {
    const allIngs = getAllIngredients();
    const currentTotal = allIngs.reduce((s,i)=>s+i.weight,0);
    document.getElementById('totalWeight').value = Math.round(currentTotal);
    const numLoaves = parseInt(document.getElementById('numLoaves').value)||1;

    let totalFlour = 0, totalWater = 0;
    allIngs.forEach(ing => {
        if (ing.type==='flour') totalFlour+=ing.weight;
        else if (ing.type==='fluid') totalWater+=ing.weight;
        else if (ing.type==='starter'&&ing.hydration) {
            const sf=ing.weight/(1+ing.hydration/100); const sw=ing.weight-sf;
            if (ing.includeFlour!==false) totalFlour+=sf;
            totalWater+=sw;
        }
        else if (ing.type==='dairy'&&ing.hydration) totalWater+=ing.weight*(ing.hydration/100);
        else if (ing.type==='egg') totalWater+=ing.weight*0.75;
        else if (ing.type==='sugar'&&ing.hydration) totalWater+=ing.weight*(ing.hydration/100);
        else if (ing.type==='misc'&&ing.hydration) totalWater+=ing.weight*(ing.hydration/100);
    });

    const hydration = totalFlour>0 ? (totalWater/totalFlour)*100 : 0;
    renderResults(currentTotal, numLoaves, hydration, totalFlour, totalWater);
}

function renderResults(totalWeight, numLoaves, hydration, totalFlour, totalWater) {
    const wpl = totalWeight/numLoaves;
    const allIngs = getAllIngredients();
    const totalSalt = allIngs.filter(i=>i.type==='salt').reduce((s,i)=>s+i.weight,0);
    const saltPct = totalFlour>0 ? ((totalSalt/totalFlour)*100).toFixed(1) : '0';
    const pff = allIngs.filter(i=>i.type==='starter'&&i.includeFlour!==false&&i.hydration).reduce((s,i)=>s+i.weight/(1+i.hydration/100),0);

    document.getElementById('results').innerHTML = `
        <div class="totals-grid">
            <div class="total-item"><div class="total-label">Dough Weight</div><div class="total-value editable-value" onclick="editTotalWeight()">${totalWeight.toFixed(0)}g</div><div class="total-sub">${wpl.toFixed(0)}g per serving</div></div>
            <div class="total-item"><div class="total-label">Servings</div><div class="total-value editable-value" onclick="editNumLoaves()">${numLoaves}</div></div>
            <div class="total-item"><div class="total-label">Total Flour</div><div class="total-value">${totalFlour.toFixed(0)}g</div></div>
            <div class="total-item"><div class="total-label">Pre-fermented Flour</div><div class="total-value">${pff.toFixed(0)}g</div></div>
            <div class="total-item"><div class="total-label">Total Fluid</div><div class="total-value">${totalWater.toFixed(0)}g</div></div>
            <div class="total-item"><div class="total-label">Salt</div><div class="total-value">${totalSalt.toFixed(0)}g <span class="total-sub">(${saltPct}%)</span></div></div>
            <div class="total-item"><div class="total-label">Dough Hydration</div><div class="total-value">${hydration.toFixed(1)}%</div></div>
        </div>`;
    document.getElementById('totalWeight').value = Math.round(totalWeight);
}

// ========== Init ==========

window.addEventListener('DOMContentLoaded', () => {
    console.log('=== DOM LOADED ===');
    const params = new URLSearchParams(window.location.search);

    // Try sections from URL first
    const sectionsData = params.get('s');
    const ingredientData = params.get('i');

    if (sectionsData) {
        try {
            sections = JSON.parse(decodeURIComponent(sectionsData));
        } catch(e) { console.error(e); }
    } else if (ingredientData) {
        try {
            const ings = JSON.parse(decodeURIComponent(ingredientData));
            sections = [{ name:'Dough', type:'dough', ingredients:ings }];
        } catch(e) { console.error(e); }
    }

    if (sections.length > 0 && getAllIngredients().length > 0) {
        if (params.has('n')) { const n=decodeURIComponent(params.get('n')); document.getElementById('recipeName').value=n; document.getElementById('recipeNameText').textContent=n; }
        if (params.has('w')) document.getElementById('totalWeight').value=params.get('w');
        if (params.has('l')) document.getElementById('numLoaves').value=params.get('l');
        if (params.has('t')) document.getElementById('bakingTemp').value=params.get('t');
        if (params.has('tm')) document.getElementById('bakingTime').value=params.get('tm');
        if (params.has('nt')) document.getElementById('notes').value=decodeURIComponent(params.get('nt'));
        renderAll();
    } else {
        initializeDefaultRecipe();
    }

    const initialName = document.getElementById('recipeName').value;
    document.getElementById('recipeNameText').textContent = initialName;
    previousServings = parseInt(document.getElementById('numLoaves').value)||2;
});

setTimeout(() => { if (getAllIngredients().length===0) initializeDefaultRecipe(); }, 100);
