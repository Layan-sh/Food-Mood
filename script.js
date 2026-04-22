const BASE_URL = "https://www.themealdb.com/api/json/v1/1";

const mealForm = document.getElementById("mealForm");
const ingredientInput = document.getElementById("ingredientInput");
const categorySelect = document.getElementById("categorySelect");
const randomBtn = document.getElementById("randomBtn");
const clearBtn = document.getElementById("clearBtn");
const backBtn = document.getElementById("backBtn");

const messageBox = document.getElementById("messageBox");
const resultsContainer = document.getElementById("resultsContainer");
const resultsCount = document.getElementById("resultsCount");

const mainPage = document.getElementById("mainPage");
const detailsPage = document.getElementById("detailsPage");
const detailsHero = document.getElementById("detailsHero");
const ingredientsGrid = document.getElementById("ingredientsGrid");
const instructionsList = document.getElementById("instructionsList");
const youtubeBtn = document.getElementById("youtubeBtn");

let currentMeals = [];

document.addEventListener("DOMContentLoaded", () => {
  loadCategories();
  renderEmptyState();
});

mealForm.addEventListener("submit", handleSearch);

// event type 2
categorySelect.addEventListener("change", () => {
  if (categorySelect.value) {
    showMessage(`Category selected: ${categorySelect.value}`, "info");
  } else if (!ingredientInput.value.trim()) {
    hideMessage();
  }
});

// event type 3
ingredientInput.addEventListener("keyup", (event) => {
  const value = ingredientInput.value.trim();

  if (value) {
    showMessage(`Typing ingredient: ${value}`, "info");
  } else if (!categorySelect.value) {
    hideMessage();
  }

  if (event.key === "Enter") {
    handleSearch(event);
  }
});

randomBtn.addEventListener("click", getRandomMeal);
clearBtn.addEventListener("click", clearResults);
backBtn.addEventListener("click", showMainPage);

async function loadCategories() {
  try {
    const response = await fetch(`${BASE_URL}/list.php?c=list`);
    const data = await response.json();

    if (!data.meals) {
      showMessage("Failed to load meal categories.", "error");
      return;
    }

    data.meals
      .filter(item => item.strCategory !== "Pork")
      .forEach((item) => {
        const option = document.createElement("option");
      option.value = item.strCategory;
      option.textContent = item.strCategory;
      categorySelect.appendChild(option);
    });
  } catch (error) {
    showMessage("Failed to load meal categories.", "error");
  }
}

async function handleSearch(event) {
  event.preventDefault();

  const ingredient = ingredientInput.value.trim();
  const category = categorySelect.value;

  if (!ingredient && !category) {
    showMessage("Please enter an ingredient or choose a category.", "error");
    return;
  }

  showMessage("Loading recipes...", "info");
  resultsContainer.innerHTML = "";
  hideDetailsPage();

  try {
    let meals = [];

    if (ingredient) {
      const ingredientResponse = await fetch(
        `${BASE_URL}/filter.php?i=${encodeURIComponent(ingredient)}`
      );
      const ingredientData = await ingredientResponse.json();
      meals = ingredientData.meals || [];
    }

    if (category) {
      const categoryResponse = await fetch(
        `${BASE_URL}/filter.php?c=${encodeURIComponent(category)}`
      );
      const categoryData = await categoryResponse.json();
      const categoryMeals = categoryData.meals || [];

      if (ingredient) {
        const categoryIds = categoryMeals.map((meal) => meal.idMeal);
        meals = meals.filter((meal) => categoryIds.includes(meal.idMeal));
      } else {
        meals = categoryMeals;
      }
    }

    if (!meals.length) {
      currentMeals = [];
      resultsCount.textContent = "0 recipes found";
      renderEmptyState("No recipes found. Try another ingredient or category.");
      showMessage("No recipes found. Try another ingredient or category.", "error");
      return;
    }

    const limitedMeals = meals.slice(0, 8);
    const detailedMeals = await Promise.all(
      limitedMeals.map(async (meal) => {
        const response = await fetch(`${BASE_URL}/lookup.php?i=${meal.idMeal}`);
        const data = await response.json();
        return data.meals ? data.meals[0] : null;
      })
    );

    currentMeals = detailedMeals
      .filter(Boolean)
      .filter(meal => {
        const text = (
          meal.strCategory +
          meal.strMeal +
          meal.strInstructions +
          JSON.stringify(meal)
        ).toLowerCase();

        return !text.includes("pork") && !text.includes("alcohol");
      });
      
    renderMealCards(currentMeals);
    resultsCount.textContent = `${currentMeals.length} recipe(s) found`;
    showMessage(`Found ${currentMeals.length} recipe(s)!`, "success");
  } catch (error) {
    renderEmptyState("Something went wrong while fetching recipes.");
    showMessage("Something went wrong while fetching recipes.", "error");
  }
}

function renderMealCards(meals) {
  resultsContainer.innerHTML = "";

  meals.forEach((meal) => {
    const ingredientsPreview = getIngredientsWithMeasures(meal)
      .slice(0, 3)
      .map((item) => item.name)
      .join(", ");

    const card = document.createElement("article");
    card.className = "recipe-card";

    card.innerHTML = `
      <div class="recipe-image-wrap">
        <img src="${meal.strMealThumb}" alt="${meal.strMeal}">
        <span class="category-badge">${meal.strCategory}</span>
      </div>

      <div class="recipe-content">
        <h3>${meal.strMeal}</h3>

        <div class="meta">
          <div class="meta-item"><strong>Category:</strong> ${meal.strCategory}</div>
          <div class="meta-item"><strong>Area:</strong> ${meal.strArea}</div>
        </div>

        <p class="preview-text"><strong>Ingredients:</strong> ${ingredientsPreview}${getIngredientsWithMeasures(meal).length > 3 ? "..." : ""}</p>

        <button class="view-btn">View Recipe</button>
      </div>
    `;

    card.querySelector(".view-btn").addEventListener("click", () => {
      renderMealDetails(meal);
    });

    resultsContainer.appendChild(card);
  });
}

function renderMealDetails(meal) {
  const ingredients = getIngredientsWithMeasures(meal);

  detailsHero.style.backgroundImage = `url('${meal.strMealThumb}')`;
  detailsHero.innerHTML = `
    <div class="details-overlay"></div>
    <div class="details-hero-content">
      <h1>${meal.strMeal}</h1>
      <div class="details-tags">
        <span class="details-tag tag-orange">${meal.strCategory}</span>
        <span class="details-tag tag-green">${meal.strArea}</span>
      </div>
    </div>
  `;

  ingredientsGrid.innerHTML = ingredients
    .map(
      (item) => `
        <div class="ingredient-item">
          <span class="ingredient-dot"></span>
          <span><strong>${item.name}</strong>${item.measure ? ` — ${item.measure}` : ""}</span>
        </div>
      `
    )
    .join("");

  const steps = splitInstructions(meal.strInstructions);

  instructionsList.innerHTML = steps
    .map(
      (step, index) => `
        <div class="step-item">
          <div class="step-number">${index + 1}</div>
          <div class="step-text">${step}</div>
        </div>
      `
    )
    .join("");

  if (meal.strYoutube && meal.strYoutube.trim() !== "") {
    youtubeBtn.href = meal.strYoutube;
    youtubeBtn.classList.remove("hidden");
  } else {
    youtubeBtn.classList.add("hidden");
  }

  mainPage.classList.add("hidden");
  detailsPage.classList.remove("hidden");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function getIngredientsWithMeasures(meal) {
  const ingredients = [];

  for (let i = 1; i <= 20; i++) {
    const ingredient = meal[`strIngredient${i}`];
    const measure = meal[`strMeasure${i}`];

    if (ingredient && ingredient.trim() !== "") {
      ingredients.push({
        name: ingredient.trim(),
        measure: measure ? measure.trim() : ""
      });
    }
  }

  return ingredients;
}

function splitInstructions(text) {
  if (!text) return ["No instructions available."];

  const cleanLines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line !== "");

  if (cleanLines.length > 1) {
    return cleanLines.map((line) => line.replace(/^Step\s*\d+[:.-]?\s*/i, ""));
  }

  return text
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length > 0)
    .map((sentence) => sentence.replace(/^Step\s*\d+[:.-]?\s*/i, ""));
}

async function getRandomMeal() {
  try {
    showMessage("Loading a random meal...", "info");
    hideDetailsPage();

    const response = await fetch(`${BASE_URL}/random.php`);
    const data = await response.json();

    if (!data.meals || !data.meals.length) {
      showMessage("No random meal was returned.", "error");
      return;
    }

    currentMeals = [data.meals[0]];
    renderMealCards(currentMeals);
    resultsCount.textContent = "1 random recipe found";
    showMessage("Here's a random meal for you!", "success");
  } catch (error) {
    showMessage("Failed to load a random meal.", "error");
  }
}

function clearResults() {
  currentMeals = [];
  ingredientInput.value = "";
  categorySelect.value = "";
  resultsCount.textContent = "No recipes yet";
  hideDetailsPage();
  renderEmptyState();
  showMessage("Results cleared.", "info");
}

function renderEmptyState(customText = "Search by ingredient or category to discover delicious meals!") {
  resultsContainer.innerHTML = `
    <div class="empty-box">
      <div class="empty-icon">🧑‍🍳</div>
      <h3>No recipes yet</h3>
      <p>${customText}</p>
    </div>
  `;
}

function showMainPage() {
  detailsPage.classList.add("hidden");
  mainPage.classList.remove("hidden");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function hideDetailsPage() {
  detailsPage.classList.add("hidden");
  mainPage.classList.remove("hidden");
}

function showMessage(text, type) {
  messageBox.textContent = text;
  messageBox.className = `message ${type}`;
}

function hideMessage() {
  messageBox.textContent = "";
  messageBox.className = "message hidden";
}