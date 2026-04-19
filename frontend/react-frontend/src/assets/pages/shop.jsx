import { Link, useLocation } from "react-router-dom"; 
import React, { useState, useEffect } from 'react';


function Shop() {
  const location = useLocation();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState(new URLSearchParams(location.search).get("category") || "");

  useEffect(() => {
    let url = "/items";
    if (filter === "asc" || filter === "desc") {
      url += `?sort=${filter}`;
    } else if (filter) {
      url += `?category=${encodeURIComponent(filter)}`;
    }

    fetch(url)
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
  }, [filter]);

  return(
	<>
  <div className="hero">
    <div className="container">
      <div className="row justify-content-between">
        <div className="col-lg-5">
          <div className="intro-excerpt">
            <h1>Shop</h1>
          </div>
        </div>
      </div>
    </div>
  </div>

  <div className="untree_co-section product-section before-footer-section">
    <div className="container">

      <div className="row mb-4 align-items-center">
        <div className="col-md-4">
          <select id="price-filter" className="form-select" value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="">All Products</option>
            <option value="Textbooks">Textbooks</option>
            <option value="Clothes">Clothes</option>
            <option value="Furniture">Furniture</option>
            <option value="Technology">Technology</option>
            <option value="asc">Price: Low to High</option>
            <option value="desc">Price: High to Low</option>
          </select>
        </div>
        <div className="col-md-4 ms-auto text-end">
          <span id="product-count" className="text-muted">{items.length} Products</span>
        </div>
      </div>

      <div className="row" id="product-grid">
        {loading ? (
          <div className="col-12 text-center py-5">
            <p className="text-muted">Loading products...</p>
          </div>
        ) : error ? (
          <div className="col-12 text-center py-5">
            <p className="text-danger">Error: {error}</p>
          </div>
        ) : items.length === 0 ? (
          <div className="col-12 text-center py-5">
            <p className="text-muted">No products found.</p>
          </div>
        ) : (
          items.map((item) => (
            <div className="col-12 col-md-4 col-lg-3 mb-5" key={item.id}>
              <Link className="product-item" to={`/product/${item.id}`}>
                <img src={item.image_url || "books.png"} className="img-fluid product-thumbnail" alt={item.title} />
                <h3 className="product-title">{item.title}</h3>
                <strong className="product-price">${Number(item.price).toFixed(2)}</strong>
                <p className="text-muted small mb-0">Seller: {item.seller_username || "Unknown"}</p>
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