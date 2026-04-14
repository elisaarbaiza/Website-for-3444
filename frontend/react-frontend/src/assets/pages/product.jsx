import { useParams, Link } from "react-router-dom";
import React, { useState, useEffect } from 'react';

function Product() {
  const { id } = useParams();
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Matches the port used in shop.jsx (5000)
    fetch(`http://localhost:5000/items/${id}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch product details");
        return res.json();
      })
      .then((data) => {
        setItem(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [id]);

  return (
    <>
      <div className="hero">
        <div className="container">
          <div className="row justify-content-between">
            <div className="col-lg-5">
              <div className="intro-excerpt">
                <h1>Product Details</h1>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="untree_co-section product-section before-footer-section">
        <div className="container">
          <Link className="btn btn-secondary mb-4" to="/shop">&larr; Back to Shop</Link>
          
          {loading ? (
            <div className="text-center py-5"><p className="text-muted">Loading product...</p></div>
          ) : error ? (
            <div className="text-center py-5"><p className="text-danger">Error: {error}</p></div>
          ) : !item ? (
            <div className="text-center py-5"><p className="text-muted">Product not found.</p></div>
          ) : (
            <div className="row">
              <div className="col-md-6 mb-4">
                {/* Placeholder image, consistent with shop.jsx */ }
                <img src="/books.png" className="img-fluid rounded product-thumbnail" alt={item.title} />
              </div>
              <div className="col-md-6">
                <h2 className="display-5 text-black mb-3">{item.title}</h2>
                <h3 className="product-price text-primary mb-4">${Number(item.price).toFixed(2)}</h3>
                {item.category && <p className="text-muted mb-4"><strong>Category:</strong> {item.category}</p>}
                <p className="lead">{item.description || "No description provided."}</p>
                <button className="btn btn-primary mt-4">Contact Seller</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export default Product;