// Saved Meals utility - stores frequently used meals in localStorage for quick re-use

export interface SavedMeal {
  id: string;
  name: string;
  description: string;
  mealType: string;
  calories: number | null;
  proteinG: number | null;
  carbsG: number | null;
  fatsG: number | null;
  context: string;
  tags: string[];
  createdAt: string;
}

const STORAGE_KEY = "hikma_saved_meals";

export function getSavedMeals(): SavedMeal[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    return JSON.parse(stored);
  } catch {
    return [];
  }
}

export function saveMeal(meal: Omit<SavedMeal, "id" | "createdAt">): SavedMeal {
  const meals = getSavedMeals();
  const newMeal: SavedMeal = {
    ...meal,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  };
  meals.push(newMeal);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(meals));
  return newMeal;
}

export function deleteSavedMeal(id: string): void {
  const meals = getSavedMeals();
  const filtered = meals.filter((m) => m.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
}

export function updateSavedMeal(id: string, updates: Partial<SavedMeal>): SavedMeal | null {
  const meals = getSavedMeals();
  const index = meals.findIndex((m) => m.id === id);
  if (index === -1) return null;

  meals[index] = { ...meals[index], ...updates };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(meals));
  return meals[index];
}
