import React, { useState } from 'react';

function Sell() {
  const [view, setView] = useState('form'); // Toggle between 'form' or 'listings'
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState("Textbooks");
  const [imageUrl, setImageUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [myListings, setMyListings] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editPrice, setEditPrice] = useState("");
  const [editCategory, setEditCategory] = useState("Textbooks");
  const [editImageUrl, setEditImageUrl] = useState("");

  const fetchMyListings = async () => {
    try {
      const res = await fetch("/api/my-items", {
        credentials: "include"
      });
      if (!res.ok) throw new Error("Failed to fetch listings. Make sure you are logged in.");
      const data = await res.json();
      setMyListings(data);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleViewListings = () => {
    setView('listings');
    setEditingId(null);
    setError("");
    setSuccess("");
    fetchMyListings();
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImageUrl(reader.result); // Convert file to Base64 String URL
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const res = await fetch("/api/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description, price, category, image_url: imageUrl }),
        credentials: "include"
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to list item.");
      }

      setSuccess("Item listed successfully!");
      setTitle("");
      setDescription("");
      setPrice("");
      setCategory("Textbooks");
      setImageUrl("");
      
      // Automatically bring user over to their items
      handleViewListings();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const startEdit = (item) => {
    setEditingId(item.id);
    setEditTitle(item.title || "");
    setEditDescription(item.description || "");
    setEditPrice(item.price ?? "");
    setEditCategory(item.category || "Textbooks");
    setEditImageUrl(item.image_url || "");
    setError("");
    setSuccess("");
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  const saveEdit = async (id) => {
    setError("");
    setSuccess("");
    try {
      const res = await fetch(`/api/items/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          title: editTitle,
          description: editDescription,
          image_url: editImageUrl || null,
          price: Number(editPrice),
          category: editCategory,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to update listing.");
      }
      setSuccess("Listing updated.");
      setEditingId(null);
      fetchMyListings();
    } catch (err) {
      setError(err.message);
    }
  };

  const markAsSold = async (id) => {
    setError("");
    setSuccess("");
    try {
      const res = await fetch(`/api/items/${id}/mark-sold`, {
        method: "PUT",
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to mark listing as sold.");
      }
      setSuccess("Listing marked as sold.");
      fetchMyListings();
    } catch (err) {
      setError(err.message);
    }
  };

  const removeListing = async (id) => {
    setError("");
    setSuccess("");
    try {
      const res = await fetch(`/api/items/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to remove listing.");
      }
      setSuccess("Listing removed.");
      fetchMyListings();
    } catch (err) {
      setError(err.message);
    }
  };

  return(
    <>
      <div className="hero">
        <div className="container">
          <div className="row justify-content-between align-items-center">
            <div className="col-lg-5">
              <div className="intro-excerpt">
                <h1>{view === 'form' ? 'Sell an Item' : 'My Listings'}</h1>
              </div>
            </div>
            <div className="col-lg-7 text-end mt-4">
              {view === 'form' ? (
                <button className="btn btn-secondary" onClick={handleViewListings}>My Listings</button>
              ) : (
                <button className="btn btn-primary" onClick={() => setView('form')}>Create New Listing</button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="untree_co-section product-section before-footer-section">
        <div className="container">
          {error && <div className="alert alert-danger">{error}</div>}
          {success && <div className="alert alert-success">{success}</div>}

          {view === 'form' ? (
            <div className="card p-4 shadow-sm" style={{ maxWidth: '600px', margin: '0 auto' }}>
              <form onSubmit={handleSubmit}>
                <div className="mb-3">
                  <label className="form-label">Title</label>
                  <input type="text" className="form-control" required value={title} onChange={(e) => setTitle(e.target.value)} />
                </div>
                <div className="mb-3">
                  <label className="form-label">Description</label>
                  <textarea className="form-control" rows="3" value={description} onChange={(e) => setDescription(e.target.value)}></textarea>
                </div>
                <div className="mb-3">
                  <label className="form-label">Price ($)</label>
                  <input type="number" step="0.01" className="form-control" required value={price} onChange={(e) => setPrice(e.target.value)} />
                </div>
                <div className="mb-3">
                  <label className="form-label">Category</label>
                  <select className="form-select" value={category} onChange={(e) => setCategory(e.target.value)}>
                    <option value="Textbooks">Textbooks</option>
                    <option value="Clothes">Clothes</option>
                    <option value="Furniture">Furniture</option>
                    <option value="Technology">Technology</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div className="mb-3">
                  <label className="form-label">Image</label>
                  <input type="file" className="form-control" accept="image/*" onChange={handleImageChange} />
                  {imageUrl && <img src={imageUrl} alt="Preview" className="img-thumbnail mt-3" style={{ maxHeight: '200px' }} />}
                </div>
                <button type="submit" className="btn btn-primary w-100" disabled={loading}>
                  {loading ? "Listing..." : "Submit Listing"}
                </button>
              </form>
            </div>
          ) : (
            <div className="row">
              {myListings.length === 0 ? (
                <div className="col-12 text-center py-5">
                  <p className="text-muted fs-4">You have no listings yet.</p>
                </div>
              ) : (
                myListings.map(item => (
                  <div className="col-12 col-md-4 col-lg-3 mb-5" key={item.id}>
                    <div className="product-item h-100">
                      <img src={item.image_url || "/books.png"} className="img-fluid product-thumbnail mb-3" alt={item.title} />
                      <h3 className="product-title">{item.title}</h3>
                      <strong className="product-price">${Number(item.price).toFixed(2)}</strong>
                      <p className="text-muted small mb-0">Seller: {item.seller_username || "Unknown"}</p>
                      <div className="mt-2">
                        {item.is_sold ? (
                          <span className="badge bg-secondary">Sold</span>
                        ) : (
                          <span className="badge bg-success">Active</span>
                        )}
                      </div>

                      {editingId === item.id ? (
                        <div className="mt-3">
                          <input
                            type="text"
                            className="form-control mb-2"
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                            placeholder="Title"
                          />
                          <textarea
                            className="form-control mb-2"
                            value={editDescription}
                            onChange={(e) => setEditDescription(e.target.value)}
                            placeholder="Description"
                            rows="3"
                          />
                          <input
                            type="number"
                            step="0.01"
                            className="form-control mb-2"
                            value={editPrice}
                            onChange={(e) => setEditPrice(e.target.value)}
                            placeholder="Price"
                          />
                          <select
                            className="form-select mb-2"
                            value={editCategory}
                            onChange={(e) => setEditCategory(e.target.value)}
                          >
                            <option value="Textbooks">Textbooks</option>
                            <option value="Clothes">Clothes</option>
                            <option value="Furniture">Furniture</option>
                            <option value="Technology">Technology</option>
                            <option value="Other">Other</option>
                          </select>
                          <input
                            type="text"
                            className="form-control mb-2"
                            value={editImageUrl}
                            onChange={(e) => setEditImageUrl(e.target.value)}
                            placeholder="Image URL"
                          />
                          <div className="d-flex gap-2">
                            <button type="button" className="btn btn-sm btn-primary" onClick={() => saveEdit(item.id)}>
                              Save
                            </button>
                            <button type="button" className="btn btn-sm btn-outline-secondary" onClick={cancelEdit}>
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="d-flex flex-wrap gap-2 mt-3">
                          <button type="button" className="btn btn-sm btn-outline-primary" onClick={() => startEdit(item)}>
                            Edit
                          </button>
                          {!item.is_sold && (
                            <button type="button" className="btn btn-sm btn-outline-success" onClick={() => markAsSold(item.id)}>
                              Mark Sold
                            </button>
                          )}
                          <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => removeListing(item.id)}>
                            Remove
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </>
  )
}

export default Sell;