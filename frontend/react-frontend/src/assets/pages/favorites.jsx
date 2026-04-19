import { Link } from "react-router-dom"; 
import React, { useState, useEffect } from 'react';

function Favorites() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [user, setUser] = useState(null);
  const [removingId, setRemovingId] = useState(null);
  const [addingCartId, setAddingCartId] = useState(null);
  const [toastMessage, setToastMessage] = useState("");

  useEffect(() => {
    const fetchPageData = async () => {
      try {
        const [userRes, favoritesRes] = await Promise.all([
          fetch("/api/me", {
            credentials: "include",
          }),
          fetch("/api/favorites", {
            credentials: "include"
          }),
        ]);

        if (!userRes.ok) {
          const errData = await userRes.json();
          throw new Error(errData.error || "You must be logged in to view favorites.");
        }

        if (!favoritesRes.ok) {
          const errData = await favoritesRes.json();
          throw new Error(errData.error || "Failed to fetch favorites.");
        }

        const [userData, favoritesData] = await Promise.all([
          userRes.json(),
          favoritesRes.json(),
        ]);

        setUser(userData);
        setItems(favoritesData);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchPageData();
  }, []);

  useEffect(() => {
    if (!toastMessage) return undefined;

    const timeout = window.setTimeout(() => setToastMessage(""), 2500);
    return () => window.clearTimeout(timeout);
  }, [toastMessage]);

  const handleRemoveFavorite = async (itemId) => {
    setRemovingId(itemId);
    setError(null);

    try {
      const res = await fetch(`/api/favorites/${itemId}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to remove favorite.");
      }

      setItems((prevItems) => prevItems.filter((item) => item.id !== itemId));
    } catch (err) {
      setError(err.message);
    } finally {
      setRemovingId(null);
    }
  };

  const handleAddToCart = async (productId) => {
    if (!user?.id) {
      setError("You must be logged in to add items to your cart.");
      return;
    }

    setAddingCartId(productId);
    setError(null);

    try {
      const res = await fetch("/cart", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          user_id: user.id,
          product_id: productId,
          quantity: 1,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to add item to cart.");
      }

      setToastMessage("Added to cart.");
    } catch (err) {
      setError(err.message);
    } finally {
      setAddingCartId(null);
    }
  };

  const handleShare = async (itemId) => {
    const shareUrl = `${window.location.origin}/product/${itemId}`;

    try {
      await navigator.clipboard.writeText(shareUrl);
      setToastMessage("Product link copied.");
    } catch (err) {
      setError("Could not copy the product link.");
    }
  };

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
					<div className="d-flex flex-column gap-4">
						{items.map(item => (
							<div className="favorite-item shadow-sm" key={item.id}>
								<div className="row g-4 align-items-start">
									<div className="col-12 col-md-3">
										<Link className="favorite-image-wrap d-block" to={`/product/${item.id}`}>
											<img src={item.image_url || "/books.png"} className="img-fluid favorite-image" alt={item.title} />
										</Link>
									</div>
									<div className="col-12 col-md-6">
										<div className="favorite-copy">
											<Link to={`/product/${item.id}`} className="text-decoration-none">
												<h3 className="favorite-title text-dark mb-2">{item.title}</h3>
											</Link>
											<p className="text-muted mb-2">${Number(item.price).toFixed(2)}</p>
											<p className="mb-4">{item.description || "No description provided."}</p>
											<div className="d-flex flex-wrap gap-2">
												<button
													type="button"
													className="btn btn-primary"
													onClick={() => handleAddToCart(item.id)}
													disabled={addingCartId === item.id}
												>
													{addingCartId === item.id ? "Adding..." : "Add to cart"}
												</button>
												<button
													type="button"
													className="btn btn-outline-secondary"
													onClick={() => handleShare(item.id)}
													aria-label={`Share ${item.title}`}
													title="Share product link"
												>
													<i className="fa-solid fa-share-nodes" aria-hidden="true"></i>
												</button>
											</div>
										</div>
									</div>
									<div className="col-12 col-md-3">
										<div className="d-flex justify-content-md-end">
										<button
											type="button"
											className="btn btn-link favorite-heart p-0"
											onClick={() => handleRemoveFavorite(item.id)}
											disabled={removingId === item.id}
											aria-label={`Remove ${item.title} from favorites`}
											title="Remove from favorites"
										>
											<i className="fa-solid fa-heart"></i>
										</button>
										</div>
									</div>
								</div>
							</div>
						))}
					</div>
				)}
			</div>
		</div>
		{toastMessage ? (
			<div className="favorites-toast" role="status" aria-live="polite">
				<div className="favorites-toast-inner">
					<span>{toastMessage}</span>
				</div>
			</div>
		) : null}
	</>
	 )
}

export default Favorites;
