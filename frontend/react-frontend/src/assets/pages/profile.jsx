import { Link } from "react-router-dom";
import React, { useState, useEffect } from 'react';

function Profile() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await fetch("http://localhost:5000/api/me", {
          credentials: "include" // Important to send the session cookie
        });
        if (!res.ok) {
          throw new Error("You are not logged in.");
        }
        const data = await res.json();
        setUser(data);
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
      await fetch("http://localhost:5000/logout", {
        method: "POST",
        credentials: "include"
      });
      // Force a full page reload to login to clear any app state
      window.location.href = "/login";
    } catch (err) {
      console.error("Logout failed", err);
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
                <p className="mb-2"><strong>Email:</strong> <span>{user.email}</span></p>
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