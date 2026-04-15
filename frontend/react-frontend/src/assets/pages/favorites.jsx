import { Link } from "react-router-dom"; 
import React, { useState, useEffect } from 'react';

function Favorites() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchFavorites = async () => {
      try {
        const res = await fetch("http://localhost:5000/api/favorites", {
          credentials: "include"
        });
        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || "Failed to fetch favorites.");
        }
        const data = await res.json();
        setItems(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchFavorites();
  }, []);

  return(
	<>
		<div className="hero">
			<div className="container">
				<div className="row justify-content-between">
					<div className="col-lg-5">
						<div className="intro-excerpt">
							<h1>My Favorites</h1>
						</div>
					</div>
				</div>
			</div>
		</div>

		<div className="untree_co-section product-section before-footer-section">
			<div className="container">
				{loading ? (
					<div className="text-center py-5"><p className="text-muted">Loading your favorites...</p></div>
				) : error ? (
					<div className="alert alert-danger">{error}</div>
				) : items.length === 0 ? (
					<div className="text-center py-5">
						<p className="fs-4 text-muted">You have no favorite items yet.</p>
						<Link to="/shop" className="btn btn-primary mt-3">Start Shopping</Link>
					</div>
				) : (
					<div className="row">
						{items.map(item => (
							<div className="col-12 col-md-4 col-lg-3 mb-5" key={item.id}>
								<Link className="product-item" to={`/product/${item.id}`}>
									<img src={item.image_url || "/books.png"} className="img-fluid product-thumbnail" alt={item.title} />
									<h3 className="product-title">{item.title}</h3>
									<strong className="product-price">${Number(item.price).toFixed(2)}</strong>
								</Link>
							</div>
						))}
					</div>
				)}
			</div>
		</div>
	</>
	 )
}

export default Favorites;