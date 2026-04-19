import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

function Cart() {
  const [cartItems, setCartItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchCart = async () => {
    try {
      const res = await fetch("/api/cart", {
        credentials: "include",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to load cart.");
      }
      const data = await res.json();
      setCartItems(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCart();
  }, []);

  const handleRemove = async (cartId) => {
    try {
      const res = await fetch(`/api/cart/${cartId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to remove item.");
      setCartItems((prev) => prev.filter((item) => item.id !== cartId));
    } catch (err) {
      setError(err.message);
    }
  };

  const handleQuantityChange = async (cartId, newQty) => {
    if (newQty < 1) {
      handleRemove(cartId);
      return;
    }
    try {
      const res = await fetch(`/api/cart/${cartId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ quantity: newQty }),
      });
      if (!res.ok) throw new Error("Failed to update quantity.");
      setCartItems((prev) =>
        prev.map((item) =>
          item.id === cartId ? { ...item, quantity: newQty } : item
        )
      );
    } catch (err) {
      setError(err.message);
    }
  };

  const subtotal = cartItems.reduce(
    (sum, item) => sum + parseFloat(item.price) * item.quantity,
    0
  );

  return (
    <>
      <div className="hero">
        <div className="container">
          <div className="row justify-content-between">
            <div className="col-lg-5">
              <div className="intro-excerpt">
                <h1>Cart</h1>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="untree_co-section before-footer-section">
        <div className="container">
          {error && <div className="alert alert-danger">{error}</div>}

          {loading ? (
            <p className="text-muted text-center py-5">Loading cart...</p>
          ) : cartItems.length === 0 ? (
            <div className="text-center py-5">
              <p className="text-muted fs-5">Your cart is empty.</p>
              <Link to="/shop" className="btn btn-primary mt-2">Start Shopping</Link>
            </div>
          ) : (
            <div className="row">
              {/* Cart Table */}
              <div className="col-md-8 mb-5">
                <div className="site-blocks-table">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Image</th>
                        <th>Product</th>
                        <th>Price</th>
                        <th>Quantity</th>
                        <th>Total</th>
                        <th>Remove</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cartItems.map((item) => (
                        <tr key={item.id}>
                          <td>
                            <img
                              src={item.image_url || "/books.png"}
                              alt={item.title}
                              style={{ width: "80px", height: "80px", objectFit: "cover" }}
                              className="img-fluid rounded"
                            />
                          </td>
                          <td className="align-middle">
                            <strong>{item.title}</strong>
                          </td>
                          <td className="align-middle">
                            ${parseFloat(item.price).toFixed(2)}
                          </td>
                          <td className="align-middle">
                            <div className="d-flex align-items-center gap-2">
                              <button
                                className="btn btn-outline-secondary btn-sm"
                                onClick={() => handleQuantityChange(item.id, item.quantity - 1)}
                              >
                                &minus;
                              </button>
                              <span>{item.quantity}</span>
                              <button
                                className="btn btn-outline-secondary btn-sm"
                                onClick={() => handleQuantityChange(item.id, item.quantity + 1)}
                              >
                                +
                              </button>
                            </div>
                          </td>
                          <td className="align-middle">
                            ${(parseFloat(item.price) * item.quantity).toFixed(2)}
                          </td>
                          <td className="align-middle">
                            <button
                              className="btn btn-danger btn-sm"
                              onClick={() => handleRemove(item.id)}
                            >
                              Remove
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <Link to="/shop" className="btn btn-outline-secondary mt-3">
                  &larr; Continue Shopping
                </Link>
              </div>

              {/* Cart Totals */}
              <div className="col-md-4">
                <div className="card p-4 shadow-sm">
                  <h5 className="text-uppercase border-bottom pb-3 mb-3">Cart Totals</h5>
                  <div className="d-flex justify-content-between mb-2">
                    <span>Subtotal</span>
                    <strong>${subtotal.toFixed(2)}</strong>
                  </div>
                  <div className="d-flex justify-content-between mb-4">
                    <span>Total</span>
                    <strong>${subtotal.toFixed(2)}</strong>
                  </div>
                  <Link to="/checkout" className="btn btn-primary w-100">
                    Proceed to Checkout
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export default Cart;
