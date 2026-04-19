import { Link } from "react-router-dom";
import React, { useState, useEffect } from 'react';

function Profile() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [bioDraft, setBioDraft] = useState("");
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await fetch("/api/me", {
          credentials: "include" // Important to send the session cookie
        });
        if (!res.ok) {
          throw new Error("You are not logged in.");
        }
        const data = await res.json();
        setUser(data);
        setBioDraft(data.bio || "");
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  const handleLogout = async () => {
    try {
      await fetch("/logout", {
        method: "POST",
        credentials: "include"
      });
      // Force a full page reload to login to clear any app state
      window.location.href = "/login";
    } catch (err) {
      console.error("Logout failed", err);
    }
  };

  const handleSaveBio = async () => {
    try {
      setSaveLoading(true);
      setSaveMessage("");
      setError("");

      const res = await fetch("/api/me", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ bio: bioDraft }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to update bio.");
      }

      setUser(data);
      setBioDraft(data.bio || "");
      setSaveMessage("Bio updated.");
    } catch (err) {
      setError(err.message);
    } finally {
      setSaveLoading(false);
    }
  };

  return (
    <>
      <div className="container" style={{ maxWidth: '500px', marginTop: '60px' }}>
        <h2 className="mb-3">My Profile</h2>
        <div className="card">
          <div className="card-body">
            {loading ? (
              <p className="text-muted">Loading profile...</p>
            ) : error || !user ? (
              <div>
                <p className="text-danger">{error || "User not found."}</p>
                <Link to="/login" className="btn btn-primary mt-2">Go to Login</Link>
              </div>
            ) : (
              <>
                <p className="mb-2"><strong>Username:</strong> <span>{user.username || "Not set"}</span></p>
                <p className="mb-2"><strong>Email:</strong> <span>{user.email}</span></p>
                <div className="mb-2">
                  <strong>Bio:</strong>
                  <textarea
                    className="form-control mt-2"
                    rows="3"
                    maxLength="500"
                    value={bioDraft}
                    onChange={(e) => setBioDraft(e.target.value)}
                    placeholder="Tell people a little about yourself..."
                  />
                  <small className="text-muted">{bioDraft.length}/500 characters</small>
                  <div className="mt-2">
                    <button
                      onClick={handleSaveBio}
                      className="btn btn-sm btn-primary"
                      disabled={saveLoading}
                    >
                      {saveLoading ? "Saving..." : "Save Bio"}
                    </button>
                  </div>
                  {saveMessage && <p className="text-success mt-2 mb-0">{saveMessage}</p>}
                </div>
                <p className="mb-4"><strong>User ID:</strong> <span>{user.id}</span></p>
                <button onClick={handleLogout} className="btn btn-danger">Log out</button>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

export default Profile;