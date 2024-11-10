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

// Postgres connection setup
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

// =============================================
// General Routes
// =============================================

// Basic route to check if the app is working
app.get('/', (req, res) => {
  res.send('Hello, Linktree Clone!!!!');
});

// =============================================
// User Routes
// =============================================

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

// Get a specific user by ID
app.get('/api/users/:userId', async (req, res) => {
  const { userId } = req.params;

  try {
    const result = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error getting user:', error);
    res.status(500).json({ error: 'Error getting user' });
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

// Route to generate a custom unique link for the user
app.post('/api/users/:userId/generateLink', async (req, res) => {
  const { userId } = req.params;

  try {
    // Fetch the username from the database
    const userResult = await pool.query('SELECT username FROM users WHERE id = $1', [userId]);
    
    if (userResult.rowCount === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const username = userResult.rows[0].username;
    const timestamp = Date.now(); 
    const customLink = `${username}-${timestamp}-${Math.random().toString(36).substr(2, 6)}`; 

    await pool.query('UPDATE users SET unique_link = $1 WHERE id = $2', [customLink, userId]);

    res.json({ uniqueLink: customLink });
  } catch (error) {
    console.error('Error generating custom link:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// =============================================
// Link Routes
// =============================================

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

// Endpoint to create a new link for a specific user
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

// Route to access links through the unique link
app.get('/api/links/:uniqueLink', async (req, res) => {
  const { uniqueLink } = req.params;

  try {
    const userResult = await pool.query('SELECT id FROM users WHERE unique_link = $1', [uniqueLink]);

    if (userResult.rowCount === 0) {
      return res.status(404).json({ error: 'Link not found' });
    }

    const userId = userResult.rows[0].id;
    const linksResult = await pool.query('SELECT * FROM links WHERE user_id = $1', [userId]);
    res.json(linksResult.rows);
  } catch (error) {
    console.error('Error retrieving links:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// =============================================
// Server Initialization
// =============================================

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});