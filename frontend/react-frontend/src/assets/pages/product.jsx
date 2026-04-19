import { useParams, Link } from "react-router-dom";
import React, { useState, useEffect } from 'react';

function Product() {
  const { id } = useParams();
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [user, setUser] = useState(null);
  const [isFavorite, setIsFavorite] = useState(false);
  const [favoriteLoading, setFavoriteLoading] = useState(false);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await fetch("http://localhost:5000/api/me", {
          credentials: "include",
        });
        if (res.ok) {
          const data = await res.json();
          setUser(data);
        }
      } catch (err) {
        // Not logged in, which is fine. The favorite button just won't show.
      }
    };

    fetchUser();

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

  useEffect(() => {
    if (user && item) {
      setIsFavorite(user.favorite_items?.includes(item.id));
    }
  }, [user, item]);

  const handleFavoriteToggle = async () => {
    if (!user) {
      setError("You must be logged in to manage favorites.");
      return;
    }
    setFavoriteLoading(true);
    setError(null);

    const method = isFavorite ? "DELETE" : "POST";
    try {
      const res = await fetch(`http://localhost:5000/api/favorites/${item.id}`, {
        method,
        credentials: "include",
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Could not update favorites.");
      }
      // Toggle state on success and update user object
      setIsFavorite(!isFavorite);
      setUser(prevUser => ({ ...prevUser, favorite_items: isFavorite ? prevUser.favorite_items.filter(favId => favId !== item.id) : [...prevUser.favorite_items, item.id] }));
    } catch (err) {
      setError(err.message);
    } finally {
      setFavoriteLoading(false);
    }
  };

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
                <img src={item.image_url || "books.png"} className="img-fluid product-thumbnail" alt={item.title} />
              </div>
              <div className="col-md-6">
                <h2 className="display-5 text-black mb-3">{item.title}</h2>
                <h3 className="product-price text-primary mb-4">${Number(item.price).toFixed(2)}</h3>
                {item.category && <p className="text-muted mb-2"><strong>Category:</strong> {item.category}</p>}
                <p className="text-muted mb-4"><strong>Seller:</strong> {item.seller_username || "Unknown"}</p>
                <p className="lead">{item.description || "No description provided."}</p>
                <Link
                  to={`/messages?sellerId=${item.seller_id}`}
                  className="btn btn-primary mt-4"
                >
                  Contact Seller
                </Link>
                {user && (
                  <button className={`btn ${isFavorite ? 'btn-success' : 'btn-outline-success'} mt-4 ms-2`} onClick={handleFavoriteToggle} disabled={favoriteLoading}>
                    <i className="fa-solid fa-heart me-2" aria-hidden="true"></i>
                    {isFavorite ? 'Favorited' : 'Add to Favorites'}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export default Product;