import { Link } from "react-router-dom";
import React, { useState } from 'react';

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("http://localhost:5000/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
        credentials: 'include' // Important for sending/receiving cookies
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to log in.");
      }

      // On successful login, force a full page reload to the homepage to reset state
      window.location.href = "/";
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="container" style={{ maxWidth: '500px', marginTop: '60px' }}>
        <h2 className="mb-4 text-center">Login</h2>
        {error && <div className="alert alert-danger" role="alert">{error}</div>}
        <form id="loginForm" onSubmit={handleSubmit}>
          <div className="mb-3">
            <label htmlFor="loginEmail" className="form-label">UNT Email</label>
            <input type="email" className="form-control" id="loginEmail" placeholder="you@my.unt.edu" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="mb-3">
            <label htmlFor="loginPassword" className="form-label">Password</label>
            <input type="password" className="form-control" id="loginPassword" required value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <button type="submit" className="btn btn-primary w-100" disabled={loading}>
            {loading ? "Logging in..." : "Log in"}
          </button>
        </form>
        <p className="mt-3 text-center">
          Don't have an account? <Link to="/signup">Sign up</Link><br />
          <Link to="/forgot-password">Forgot your password?</Link>
        </p>
      </div>
    </>
  )
}

export default Login;