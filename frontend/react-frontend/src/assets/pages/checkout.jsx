import React, { useState } from "react";

function Checkout() {
  const [formData, setFormData] = useState({
    fname: "",
    lname: "",
    email: "",
    phone: "",
    location: "",
    notes: "",
    payment_method: "",
    other_payment: "",
  });

  const [showOther, setShowOther] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handlePaymentChange = (e) => {
    const value = e.target.value;

    setFormData((prev) => ({
      ...prev,
      payment_method: value,
    }));

    setShowOther(value === "other");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const response = await fetch("http://localhost:5000/api/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        alert("Order placed successfully!");
        window.location.href = "/thankyou";
      } else {
        alert(data.message || "Something went wrong");
      }
    } catch (error) {
      console.error(error);
      alert("Server error");
    }
  };

  return (
    <div className="container mt-5">
      <h1>Checkout</h1>

      <form onSubmit={handleSubmit}>
        {/* NAME */}
        <input
          className="form-control mt-2"
          name="fname"
          placeholder="First Name"
          onChange={handleChange}
          required
        />

        <input
          className="form-control mt-2"
          name="lname"
          placeholder="Last Name"
          onChange={handleChange}
          required
        />

        {/* EMAIL + PHONE */}
        <input
          className="form-control mt-2"
          name="email"
          placeholder="Email"
          onChange={handleChange}
          required
        />

        <input
          className="form-control mt-2"
          name="phone"
          placeholder="Phone"
          onChange={handleChange}
          required
        />

        {/* LOCATION */}
        <select
          className="form-control mt-2"
          name="location"
          onChange={handleChange}
          required
        >
          <option value="">Select Meet-Up Location</option>
          <option value="willis_library">Willis Library</option>
          <option value="union">Union</option>
          <option value="blb_courtyard">BLB Courtyard</option>
          <option value="eagle_landing">Eagle Landing</option>
        </select>

        {/* NOTES */}
        <textarea
          className="form-control mt-2"
          name="notes"
          placeholder="Order Notes"
          onChange={handleChange}
        />

        {/* PAYMENT */}
        <h4 className="mt-3">Payment Method</h4>

        <label>
          <input
            type="radio"
            value="cash"
            name="payment_method"
            onChange={handlePaymentChange}
          />
          Cash
        </label>

        <br />

        <label>
          <input
            type="radio"
            value="cashapp_zelle"
            name="payment_method"
            onChange={handlePaymentChange}
          />
          Cash App / Zelle
        </label>

        <br />

        <label>
          <input
            type="radio"
            value="other"
            name="payment_method"
            onChange={handlePaymentChange}
          />
          Other
        </label>

        {/* CONDITIONAL FIELD */}
        {showOther && (
          <input
            className="form-control mt-2"
            name="other_payment"
            placeholder="Enter other payment method"
            onChange={handleChange}
          />
        )}

        {/* SUBMIT */}
        <button className="btn btn-dark mt-4" type="submit">
          Place Order
        </button>
      </form>
    </div>
  );
}

export default Checkout;