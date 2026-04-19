import { useState, useEffect } from "react";

const MEETUP_LOCATIONS = [
  { value: "", label: "Select a location" },
  { value: "willis_library", label: "Willis Library" },
  { value: "union", label: "Union" },
  { value: "blb_courtyard", label: "BLB Courtyard" },
  { value: "eagle_landing", label: "Eagle Landing" },
];

const PAYMENT_METHODS = [
  { value: "cash", label: "Cash (In Person)" },
  { value: "digital", label: "Cash App / Zelle" },
  { value: "other", label: "Other:" },
];

// Helper: today's date in YYYY-MM-DD format for the min date attribute
const todayStr = new Date().toISOString().split("T")[0];

export default function Checkout() {
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    meetupLocation: "",
    meetupDate: "",
    meetupTime: "",
    orderNotes: "",
    paymentMethod: "",
    otherPayment: "",
  });

  const [orderItems, setOrderItems] = useState([]);
  const [cartEmpty, setCartEmpty] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    // ---------------------------------------------------------------------------
    // CART INTEGRATION
    // Currently reads from localStorage under the key "eagld_cart".
    // Your cart page should save items there like:
    //   localStorage.setItem("eagld_cart", JSON.stringify([
    //     { id: 1, name: "Top Up T-Shirt", quantity: 1, price: 250.00 },
    //     ...
    //   ]));
    //
    // When your teammate's backend is ready, swap this block for an API call:
    //   const res = await fetch("/api/cart");
    //   const data = await res.json();
    //   setOrderItems(data.items);
    // ---------------------------------------------------------------------------
    try {
      const stored = localStorage.getItem("eagld_cart");
      const parsed = stored ? JSON.parse(stored) : [];
      if (parsed.length === 0) {
        setCartEmpty(true);
      } else {
        setOrderItems(parsed);
      }
    } catch {
      setCartEmpty(true);
    }
  }, []);

  const orderTotal = orderItems.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const validate = () => {
    const newErrors = {};
    if (!form.firstName.trim()) newErrors.firstName = "First name is required.";
    if (!form.lastName.trim()) newErrors.lastName = "Last name is required.";
    if (!form.email.trim() || !/\S+@\S+\.\S+/.test(form.email))
      newErrors.email = "A valid email is required.";
    if (!form.phone.trim()) newErrors.phone = "Phone number is required.";
    if (!form.meetupLocation) newErrors.meetupLocation = "Please select a meet-up location.";
    if (!form.meetupDate) newErrors.meetupDate = "Please select a meet-up date.";
    if (!form.meetupTime) newErrors.meetupTime = "Please select a meet-up time.";
    if (!form.paymentMethod) newErrors.paymentMethod = "Please select a payment method.";
    if (form.paymentMethod === "other" && !form.otherPayment.trim())
      newErrors.otherPayment = "Please specify your payment method.";
    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setLoading(true);
    try {
      // TODO: Replace with your real API endpoint
      // const res = await fetch("/api/orders", {
      //   method: "POST",
      //   headers: { "Content-Type": "application/json" },
      //   body: JSON.stringify({ ...form, items: orderItems }),
      // });
      // if (!res.ok) throw new Error("Order failed");
      // const data = await res.json();

      // Simulate success for now
      await new Promise((r) => setTimeout(r, 800));
      setSubmitted(true);
      // Navigate to thank-you page: window.location.href = "/thankyou";
    } catch (err) {
      alert("Something went wrong placing your order. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div style={styles.successWrapper}>
        <div style={styles.successBox}>
          <div style={styles.checkCircle}>✓</div>
          <h2 style={styles.successTitle}>Order Placed!</h2>
          <p style={styles.successMsg}>
            Thanks, {form.firstName}! We'll be in touch at{" "}
            <strong>{form.email}</strong> to confirm your meet-up at{" "}
            <strong>
              {MEETUP_LOCATIONS.find((l) => l.value === form.meetupLocation)?.label}
            </strong>{" "}
            on <strong>{form.meetupDate}</strong> at <strong>{form.meetupTime}</strong>.
          </p>
          <a href="/shop" style={styles.backBtn}>
            Continue Shopping
          </a>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      {/* Hero */}
      <div style={styles.hero}>
        <div style={styles.heroInner}>
          <h1 style={styles.heroTitle}>Checkout</h1>
        </div>
      </div>

      {/* Main Content */}
      <div style={styles.container}>
        <form onSubmit={handleSubmit} noValidate>
          <div style={styles.grid}>
            {/* LEFT: Billing Details */}
            <div>
              <h2 style={styles.sectionTitle}>Billing Details</h2>
              <div style={styles.card}>
                {/* Name Row */}
                <div style={styles.row}>
                  <Field label="First Name" required error={errors.firstName}>
                    <input
                      style={inputStyle(errors.firstName)}
                      name="firstName"
                      value={form.firstName}
                      onChange={handleChange}
                      placeholder="Jane"
                    />
                  </Field>
                  <Field label="Last Name" required error={errors.lastName}>
                    <input
                      style={inputStyle(errors.lastName)}
                      name="lastName"
                      value={form.lastName}
                      onChange={handleChange}
                      placeholder="Doe"
                    />
                  </Field>
                </div>

                {/* Email / Phone Row */}
                <div style={styles.row}>
                  <Field label="Email Address" required error={errors.email}>
                    <input
                      style={inputStyle(errors.email)}
                      name="email"
                      type="email"
                      value={form.email}
                      onChange={handleChange}
                      placeholder="jane@example.com"
                    />
                  </Field>
                  <Field label="Phone" required error={errors.phone}>
                    <input
                      style={inputStyle(errors.phone)}
                      name="phone"
                      value={form.phone}
                      onChange={handleChange}
                      placeholder="(555) 000-0000"
                    />
                  </Field>
                </div>

                {/* Meet-Up Location */}
                <Field
                  label="Select Your Meet-Up Location"
                  required
                  error={errors.meetupLocation}
                >
                  <select
                    style={inputStyle(errors.meetupLocation)}
                    name="meetupLocation"
                    value={form.meetupLocation}
                    onChange={handleChange}
                  >
                    {MEETUP_LOCATIONS.map((loc) => (
                      <option key={loc.value} value={loc.value}>
                        {loc.label}
                      </option>
                    ))}
                  </select>
                </Field>

                {/* Meet-Up Date & Time */}
                <div style={styles.row}>
                  <Field label="Preferred Meet-Up Date" required error={errors.meetupDate}>
                    <input
                      style={inputStyle(errors.meetupDate)}
                      type="date"
                      name="meetupDate"
                      value={form.meetupDate}
                      min={todayStr}
                      onChange={handleChange}
                    />
                  </Field>
                  <Field label="Preferred Meet-Up Time" required error={errors.meetupTime}>
                    <input
                      style={inputStyle(errors.meetupTime)}
                      type="time"
                      name="meetupTime"
                      value={form.meetupTime}
                      onChange={handleChange}
                    />
                  </Field>
                </div>

                {/* Order Notes */}
                <Field label="Order Notes">
                  <textarea
                    style={{ ...inputStyle(), height: 100, resize: "vertical" }}
                    name="orderNotes"
                    value={form.orderNotes}
                    onChange={handleChange}
                    placeholder="Write your notes here..."
                  />
                </Field>
              </div>
            </div>

            {/* RIGHT: Order Summary */}
            <div>
              <h2 style={styles.sectionTitle}>Your Order</h2>
              <div style={styles.card}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>Product</th>
                      <th style={{ ...styles.th, textAlign: "right" }}>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cartEmpty ? (
                      <tr>
                        <td colSpan={2} style={{ ...styles.td, color: "#9ca3af", fontStyle: "italic" }}>
                          Your cart is empty. <a href="/shop" style={{ color: "#1f2937" }}>Go shopping</a>
                        </td>
                      </tr>
                    ) : orderItems.map((item) => (
                      <tr key={item.id}>
                        <td style={styles.td}>
                          {item.name}{" "}
                          <strong style={{ margin: "0 4px" }}>×</strong>{" "}
                          {item.quantity}
                        </td>
                        <td style={{ ...styles.td, textAlign: "right" }}>
                          ${(item.price * item.quantity).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                    <tr style={{ borderTop: "1px solid #e5e7eb" }}>
                      <td style={{ ...styles.td, fontWeight: 600 }}>
                        Cart Subtotal
                      </td>
                      <td style={{ ...styles.td, textAlign: "right" }}>
                        ${orderTotal.toFixed(2)}
                      </td>
                    </tr>
                    <tr>
                      <td style={{ ...styles.td, fontWeight: 700 }}>
                        Order Total
                      </td>
                      <td
                        style={{
                          ...styles.td,
                          textAlign: "right",
                          fontWeight: 700,
                        }}
                      >
                        ${orderTotal.toFixed(2)}
                      </td>
                    </tr>
                  </tbody>
                </table>

                {/* Payment Method */}
                <div style={styles.paymentBox}>
                  <h3 style={styles.paymentTitle}>Select Payment Method</h3>
                  {errors.paymentMethod && (
                    <p style={styles.error}>{errors.paymentMethod}</p>
                  )}
                  {PAYMENT_METHODS.map((method) => (
                    <label key={method.value} style={styles.radioLabel}>
                      <input
                        type="radio"
                        name="paymentMethod"
                        value={method.value}
                        checked={form.paymentMethod === method.value}
                        onChange={handleChange}
                        style={{ marginRight: 8 }}
                      />
                      {method.label}
                    </label>
                  ))}
                  {form.paymentMethod === "other" && (
                    <div style={{ marginTop: 8 }}>
                      <input
                        style={inputStyle(errors.otherPayment)}
                        name="otherPayment"
                        value={form.otherPayment}
                        onChange={handleChange}
                        placeholder="Enter other payment method"
                      />
                      {errors.otherPayment && (
                        <p style={styles.error}>{errors.otherPayment}</p>
                      )}
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  style={{
                    ...styles.submitBtn,
                    opacity: loading ? 0.7 : 1,
                    cursor: loading ? "not-allowed" : "pointer",
                  }}
                  disabled={loading}
                >
                  {loading ? "Placing Order..." : "Place Order"}
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

// --- Sub-components ---

function Field({ label, required, error, children }) {
  return (
    <div style={{ marginBottom: 16, flex: 1 }}>
      <label style={styles.label}>
        {label}
        {required && <span style={{ color: "#ef4444", marginLeft: 2 }}>*</span>}
      </label>
      {children}
      {error && <p style={styles.error}>{error}</p>}
    </div>
  );
}

// --- Styles ---

const inputBase = {
  width: "100%",
  padding: "10px 12px",
  border: "1px solid #d1d5db",
  borderRadius: 6,
  fontSize: 14,
  outline: "none",
  boxSizing: "border-box",
  fontFamily: "inherit",
  background: "#fff",
  transition: "border-color 0.2s",
};

const inputStyle = (error) => ({
  ...inputBase,
  borderColor: error ? "#ef4444" : "#d1d5db",
});

const styles = {
  page: {
    fontFamily: "'Segoe UI', sans-serif",
    background: "#f9fafb",
    minHeight: "100vh",
    color: "#1f2937",
  },
  hero: {
    background: "#1f2937",
    padding: "40px 0",
    marginBottom: 40,
  },
  heroInner: {
    maxWidth: 1100,
    margin: "0 auto",
    padding: "0 24px",
  },
  heroTitle: {
    color: "#fff",
    fontSize: 36,
    fontWeight: 700,
    margin: 0,
  },
  container: {
    maxWidth: 1100,
    margin: "0 auto",
    padding: "0 24px 60px",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 32,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 700,
    marginBottom: 16,
  },
  card: {
    background: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: 10,
    padding: 28,
  },
  row: {
    display: "flex",
    gap: 16,
  },
  label: {
    display: "block",
    fontSize: 13,
    fontWeight: 600,
    marginBottom: 6,
    color: "#374151",
  },
  error: {
    color: "#ef4444",
    fontSize: 12,
    marginTop: 4,
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    marginBottom: 24,
  },
  th: {
    textAlign: "left",
    paddingBottom: 10,
    borderBottom: "2px solid #1f2937",
    fontSize: 14,
    fontWeight: 700,
  },
  td: {
    padding: "10px 0",
    fontSize: 14,
    borderBottom: "1px solid #f3f4f6",
  },
  paymentBox: {
    border: "1px solid #e5e7eb",
    borderRadius: 8,
    padding: 16,
    marginBottom: 20,
  },
  paymentTitle: {
    fontSize: 15,
    fontWeight: 700,
    marginBottom: 12,
  },
  radioLabel: {
    display: "flex",
    alignItems: "center",
    marginBottom: 10,
    fontSize: 14,
    cursor: "pointer",
  },
  submitBtn: {
    width: "100%",
    padding: "14px 0",
    background: "#1f2937",
    color: "#fff",
    border: "none",
    borderRadius: 8,
    fontSize: 16,
    fontWeight: 700,
    letterSpacing: 0.5,
    transition: "background 0.2s",
  },
  successWrapper: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#f9fafb",
  },
  successBox: {
    background: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: 12,
    padding: 48,
    textAlign: "center",
    maxWidth: 440,
  },
  checkCircle: {
    width: 64,
    height: 64,
    background: "#1f2937",
    color: "#fff",
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 28,
    margin: "0 auto 20px",
  },
  successTitle: {
    fontSize: 28,
    fontWeight: 700,
    marginBottom: 12,
  },
  successMsg: {
    fontSize: 15,
    color: "#6b7280",
    marginBottom: 24,
    lineHeight: 1.6,
  },
  backBtn: {
    display: "inline-block",
    padding: "12px 28px",
    background: "#1f2937",
    color: "#fff",
    borderRadius: 8,
    textDecoration: "none",
    fontWeight: 600,
    fontSize: 14,
  },
};
