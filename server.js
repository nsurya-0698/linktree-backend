const express = require('express');
const app = express();
const port = 3000;

const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const cors = require('cors');
const bodyParser = require('body-parser');

// Middleware setup
app.use(cors());
app.use(bodyParser.json());

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

// Basic route to check if the app is working
app.get('/', (req, res) => {
  res.send('Hello, Linktree Clone!!!!');
});

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

// Route to handle user registration with password hashing
app.post('/api/signup', async (req, res) => {
  const { email, password, username, bio } = req.body;

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await pool.query(
      'INSERT INTO users (username, email, password, bio) VALUES ($1, $2, $3, $4) RETURNING *',
      [username, email, hashedPassword, bio]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ error: 'Error creating account' });
  }
});

// Endpoint to create a new link for a specific user
app.post('/api/users/:userId/links', async (req, res) => {
  const { userId } = req.params;
  const { link_title, link_url } = req.body;

  try {
    const result = await pool.query(
      'INSERT INTO links (user_id, link_title, link_url) VALUES ($1, $2, $3) RETURNING *',
      [userId, link_title, link_url]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating link:', error);
    res.status(500).json({ error: 'Error creating link' });
  }
});

// Get all links for a specific user
app.get('/api/users/:userId/links', async (req, res) => {
  const { userId } = req.params;

  try {
    const result = await pool.query('SELECT * FROM links WHERE user_id = $1', [userId]);
    res.json(result.rows);
  } catch (error) {
    console.error('Error getting links:', error);
    res.status(500).json({ error: 'Error getting links' });
  }
});

// Another route to create a new link for a user with order
app.post('/api/users/:userId/links', async (req, res) => {
  const { userId } = req.params;
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

// Route to handle user login
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const userResult = await pool.query('SELECT * FROM users WHERE email = $1', [email]);

    if (userResult.rowCount === 0) {
      return res.status(400).json({ error: 'Invalid email or password' });
    }

    const user = userResult.rows[0];
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid email or password' });
    }

    res.json({ id: user.id, username: user.username, email: user.email, bio: user.bio });
  } catch (error) {
    console.error('Error during login:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
