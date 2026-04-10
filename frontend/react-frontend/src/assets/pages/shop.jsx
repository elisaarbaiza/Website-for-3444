import { Link } from "react-router-dom"; 
import React, { useState, useEffect } from 'react';


function Shop() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch("http://localhost:5000/items")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch items");
        return res.json();
      })
      .then((data) => {
        setItems(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  return(
	<>
  <div class="hero">
    <div class="container">
      <div class="row justify-content-between">
        <div class="col-lg-5">
          <div class="intro-excerpt">
            <h1>Shop</h1>
          </div>
        </div>
      </div>
    </div>
  </div>

  <div class="untree_co-section product-section before-footer-section">
    <div class="container">

      <div class="row mb-4 align-items-center">
        <div class="col-md-4">
          <select id="price-filter" class="form-select">
            <option value="">Filter</option>
            <option value="">Textbooks</option>
            <option value="">Clothes</option>
            <option value="">Furniture</option>
            <option value="">Technology</option>
            <option value="asc">Price: Low to High</option>
            <option value="desc">Price: High to Low</option>
          </select>
        </div>
        <div class="col-md-4 ms-auto text-end">
          <span id="product-count" class="text-muted">{items.length} Products</span>
        </div>
      </div>

      <div class="row" id="product-grid">
        {loading ? (
          <div class="col-12 text-center py-5">
            <p class="text-muted">Loading products...</p>
          </div>
        ) : error ? (
          <div class="col-12 text-center py-5">
            <p class="text-danger">Error: {error}</p>
          </div>
        ) : items.length === 0 ? (
          <div class="col-12 text-center py-5">
            <p class="text-muted">No products found.</p>
          </div>
        ) : (
          items.map((item) => (
            <div class="col-12 col-md-4 col-lg-3 mb-5" key={item.id}>
              <Link class="product-item" to={`/product/${item.id}`}>
                {/* Using a placeholder image since image_url is not in the database schema yet */}
                <img src="books.png" class="img-fluid product-thumbnail" alt={item.title} />
                <h3 class="product-title">{item.title}</h3>
                <strong class="product-price">${Number(item.price).toFixed(2)}</strong>
              </Link>
            </div>
          ))
        )}
      </div>

    </div>
  </div>
	</>
	 )
}

export default Shop;