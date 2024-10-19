const express = require('express');
const app = express();
const port = 3000;

const { Pool } = require('pg');


const cors = require('cors');
app.use(cors());

// Create a new Pool instance to manage Postgres connections
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'linktree_clone',
  password: '0698',
  port: 5432,
});

// Test the Postgres connection
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('Error connecting to Postgres', err);
  } else {
    console.log('Postgres connected:', res.rows);
  }
});

app.get('/', (req, res) => {
    res.send('Hello, Linktree Clone!');
});


// Middleware to parse incoming JSON data
app.use(express.json());

  // Get all users
  app.get('/api/users', async (req, res) => {
    try {
      const result = await pool.query('SELECT * FROM users');
      res.json(result.rows);
    } catch (error) {
      console.error('Error getting users:', error);
      res.status(500).json({ error: 'Error getting users' });
    }
  });

  // Create a new user
  app.post('/api/users', async (req, res) => {
    const { username, email, bio } = req.body;
    try {
      const result = await pool.query(
        'INSERT INTO users (username, email, bio) VALUES ($1, $2, $3) RETURNING *',
        [username, email, bio]
      );
      res.status(201).json(result.rows[0]);
    } catch (error) {
      console.error('Error creating user:', error);
      res.status(500).json({ error: 'Error creating user' });
    }
  });

  // Get all links for a user
app.get('/api/users/:userId/links', async (req, res) => {
    const userId = req.params.userId;
    try {
        const result = await pool.query('SELECT * FROM links WHERE user_id = $1', [userId]);
        res.json(result.rows);
    } catch (error) {
        console.error('Error getting links:', error);
        res.status(500).json({ error: 'Error getting links' });
    }
});

// Create a new link for a user
app.post('/api/users/:userId/links', async (req, res) => {
    const userId = req.params.userId;
    const { linkTitle, linkUrl, order } = req.body;
    try {
        const result = await pool.query(
            'INSERT INTO links (user_id, link_title, link_url, "order") VALUES ($1, $2, $3, $4) RETURNING *',
            [userId, linkTitle, linkUrl, order]
        );
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Error creating link:', error);
        res.status(500).json({ error: 'Error creating link' });
    }
});


// Start the server
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});


