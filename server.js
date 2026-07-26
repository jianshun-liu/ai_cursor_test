const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./recipes.db');

const app = express();
app.use(express.json());
app.use(express.static('public'));

// Get random recipe by mood
app.get('/api/recipe', (req, res) => {
  const { mood } = req.query;
  db.get(
    'SELECT * FROM recipes WHERE mood = ? ORDER BY RANDOM() LIMIT 1',
    [mood],
    (err, row) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(row || { message: 'No recipes found for this mood' });
    }
  );
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`)); 