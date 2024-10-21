const express = require('express');
const app = express();
const port = 3000;

const { Pool } = require('pg');

// Middleware to parse incoming JSON data
const bodyParser = require('body-parser');
app.use(bodyParser.json());

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

//Test if app is working or not
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

  //API route to handle user registration
  app.post('/api/signup', async (req, res) => {
    const { email, password } = req.body;
  
    try {
      const result = await pool.query(
        'INSERT INTO users (email, password) VALUES ($1, $2) RETURNING *',
        [email, password]
      );
      res.status(201).json(result.rows[0]);
    } catch (error) {
      res.status(500).json({ error: 'Error creating account' });
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

// Route to register a new user with hashed password
const bcrypt = require('bcrypt');

app.post('/api/register', async (req, res) => {
  const { username, email, password, bio } = req.body;

  try {
    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Insert the user with the hashed password
    const result = await pool.query(
      'INSERT INTO users (username, email, password, bio) VALUES ($1, $2, $3, $4) RETURNING *',
      [username, email, hashedPassword, bio]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ error: 'Error creating user' });
  }
});

//You need to implement a login route that:
//Checks if the user exists by email.
//Compares the stored hashed password with the provided password using bcrypt.
app.post('/api/login', async (req, res) => {
  try {
    console.log('Request body:', req.body);  // Add this
    const { email, password } = req.body;

    console.log(`Login attempt for email: ${email}`);  // Email should appear here

    const userResult = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    console.log('UserResult:', userResult.rows);  // Log query result

    if (userResult.rowCount === 0) {
      console.log('User not found');
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