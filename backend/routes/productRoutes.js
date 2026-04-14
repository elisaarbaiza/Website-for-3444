const express = require('express');
const router = express.Router();
const pool = require('../database');

// Get All Products (non-sold)
router.get('/', async (_req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM products WHERE is_sold = FALSE ORDER BY created_at DESC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get Seller Products
router.get('/seller/:seller_id', async (req, res) => {
  try {
    const { seller_id } = req.params;

    const result = await pool.query(
      `SELECT * FROM products WHERE seller_id = $1 ORDER BY created_at DESC`,
      [seller_id]
    );

    res.json(result.rows);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get Single Product
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT * FROM products WHERE id = $1`,
      [id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Product not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create Product
router.post('/', async (req, res) => {
  try {
    const { seller_id, title, description, image_url, price } = req.body;

    const newProduct = await pool.query(
      `INSERT INTO products (seller_id, title, description, image_url, price)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [seller_id, title, description, image_url, price]
    );

    res.status(201).json(newProduct.rows[0]);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Mark product as sold
router.put('/:id/mark-sold', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `UPDATE products
       SET is_sold = TRUE
       WHERE id = $1
       RETURNING *`,
      [id]
    );

    res.json(result.rows[0]);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});


// Update Product
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, image_url, price } = req.body;

    const updated = await pool.query(
      `UPDATE products
       SET title = $1,
           description = $2,
           image_url = $3,
           price = $4
       WHERE id = $5
       RETURNING *`,
      [title, description, image_url, price, id]
    );

    res.json(updated.rows[0]);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});


// Delete Product
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    await pool.query(
      `DELETE FROM products WHERE id = $1`,
      [id]
    );

    res.json({ message: 'Product deleted' });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;

