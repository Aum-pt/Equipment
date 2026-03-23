const express = require('express');
const jwt = require('jsonwebtoken');

const router = express.Router();

const FIXED_USER = 'totnpt';
const FIXED_PASS = 'tot@npt73oo';
if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET not configured');
}

const JWT_SECRET = process.env.JWT_SECRET;


router.post('/login', (req, res) => {
  const { username, password } = req.body;

  if (username === FIXED_USER && password === FIXED_PASS) {
    const token = jwt.sign({ user: username }, JWT_SECRET, {
      expiresIn: '8h',
    });

    return res.json({ token });
  }

  res.status(401).json({ message: 'Invalid credentials' });
});

module.exports = router;
