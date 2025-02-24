const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./recipes.db');

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS recipes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    ingredients TEXT NOT NULL,
    instructions TEXT NOT NULL,
    mood TEXT NOT NULL
  )`);

  // Insert some sample recipes
  const recipes = [
    { name: 'Comforting Mac & Cheese', ingredients: 'macaroni, cheese, milk, butter', instructions: 'Cook macaroni, melt cheese with milk and butter, mix together', mood: 'sad' },
    { name: 'Energizing Smoothie', ingredients: 'banana, spinach, almond milk, protein powder', instructions: 'Blend all ingredients until smooth', mood: 'tired' },
    { name: 'Spicy Ramen', ingredients: 'ramen noodles, chili oil, egg, green onions', instructions: 'Cook noodles, add toppings, drizzle with chili oil', mood: 'bored' },
    { name: 'Chocolate Cake', ingredients: 'flour, sugar, cocoa powder, eggs, butter', instructions: 'Mix ingredients, bake at 350°F for 30 minutes', mood: 'happy' },
    // New unique recipes
    { name: 'Zesty Lemon Chicken', ingredients: 'chicken breast, lemon, garlic, rosemary', instructions: 'Marinate chicken in lemon and garlic, bake with rosemary', mood: 'energetic' },
    { name: 'Hearty Beef Stew', ingredients: 'beef, potatoes, carrots, onions, beef broth', instructions: 'Brown beef, add vegetables and broth, simmer until tender', mood: 'cozy' },
    { name: 'Refreshing Cucumber Salad', ingredients: 'cucumber, dill, yogurt, lemon juice', instructions: 'Slice cucumber, mix with dill and yogurt, drizzle with lemon juice', mood: 'fresh' },
    { name: 'Decadent Brownies', ingredients: 'chocolate, butter, sugar, eggs, flour', instructions: 'Melt chocolate and butter, mix with sugar and eggs, bake', mood: 'indulgent' }
  ];

  const stmt = db.prepare('INSERT INTO recipes (name, ingredients, instructions, mood) VALUES (?, ?, ?, ?)');
  recipes.forEach(recipe => {
    stmt.run(recipe.name, recipe.ingredients, recipe.instructions, recipe.mood);
  });
  stmt.finalize();
});

db.close(); 