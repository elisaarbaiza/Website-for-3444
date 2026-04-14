import { Link, useLocation } from "react-router-dom"; 
import React, { useState, useEffect } from 'react';

function useQuery() {
  return new URLSearchParams(useLocation().search);
}

function Search() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const query = useQuery();
  const searchTerm = query.get("q") || "";

  useEffect(() => {
    let url = `http://localhost:5000/items?search=${encodeURIComponent(searchTerm)}`;

    fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch search results");
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
  }, [searchTerm]);

  return(
    <>
      <div className="hero">
        <div className="container">
          <div className="row justify-content-between">
            <div className="col-lg-5">
              <div className="intro-excerpt">
                <h1>Search Results for "{searchTerm}"</h1>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="untree_co-section product-section before-footer-section">
        <div className="container">
          <div className="row" id="product-grid">
            {loading ? (
              <div className="col-12 text-center py-5">
                <p className="text-muted">Searching products...</p>
              </div>
            ) : error ? (
              <div className="col-12 text-center py-5">
                <p className="text-danger">Error: {error}</p>
              </div>
            ) : items.length === 0 ? (
              <div className="col-12 text-center py-5">
                <p className="text-muted">No products found matching your search.</p>
              </div>
            ) : (
              items.map((item) => (
                <div className="col-12 col-md-4 col-lg-3 mb-5" key={item.id}>
                  <Link className="product-item" to={`/product/${item.id}`}>
                    <img src="/books.png" className="img-fluid product-thumbnail" alt={item.title} />
                    <h3 className="product-title">{item.title}</h3>
                    <strong className="product-price">${Number(item.price).toFixed(2)}</strong>
                  </Link>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </>
  );
}

export default Search;
