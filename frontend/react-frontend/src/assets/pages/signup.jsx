import { Link } from "react-router-dom"; 
import React, { useState } from 'react';


function Register() {
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (password !== passwordConfirm) {
      return setError("Passwords do not match.");
    }

    setLoading(true);
    try {
      const res = await fetch("/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, username, bio, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to sign up.");
      }

      setSuccess(data.message);
      setEmail("");
      setUsername("");
      setBio("");
      setPassword("");
      setPasswordConfirm("");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return(
	<>
		
		  <div className="container" style={{ maxWidth: '500px', marginTop: '60px' }}>
			  <h2 className="mb-4 text-center">Sign Up</h2>
			  {error && <div className="alert alert-danger" role="alert">{error}</div>}
			  {success && <div className="alert alert-success" role="alert">{success}</div>}
			  <form id="signupForm" onSubmit={handleSubmit}>
				  <div className="mb-3">
					  <label htmlFor="signupEmail" className="form-label">UNT Email</label>
					  <input type="email" className="form-control" id="signupEmail" placeholder="you@my.unt.edu" required value={email} onChange={(e) => setEmail(e.target.value)} />
				  </div>
          <div className="mb-3">
            <label htmlFor="signupUsername" className="form-label">Username</label>
            <input
              type="text"
              className="form-control"
              id="signupUsername"
              placeholder="e.g. eagle_seller23"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
            <small className="text-muted">3-30 characters: letters, numbers, and underscore.</small>
          </div>
          <div className="mb-3">
            <label htmlFor="signupBio" className="form-label">Bio (optional)</label>
            <textarea
              className="form-control"
              id="signupBio"
              rows="3"
              placeholder="Tell others what you usually sell..."
              value={bio}
              onChange={(e) => setBio(e.target.value)}
            />
          </div>
				  <div className="mb-3">
					  <label htmlFor="signupPassword" className="form-label">Password</label>
					  <input type="password" className="form-control" id="signupPassword" required value={password} onChange={(e) => setPassword(e.target.value)} />
				  </div>
				  <div className="mb-3">
					  <label htmlFor="signupPasswordConfirm" className="form-label">Confirm Password</label>
					  <input type="password" className="form-control" id="signupPasswordConfirm" required value={passwordConfirm} onChange={(e) => setPasswordConfirm(e.target.value)} />
				  </div>
				  <button type="submit" className="btn btn-primary w-100" disabled={loading}>
					{loading ? "Creating..." : "Create account"}
				  </button>
			  </form>
			  <p className="mt-3 text-center">
				  Already have an account? <Link to="/login">Log in</Link>
			  </p>
		  </div>
	  </>
	 )
}

export default Register;