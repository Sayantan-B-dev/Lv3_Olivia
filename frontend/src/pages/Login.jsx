import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import api from "../api/axiosClient";
import { socket } from "../socket";
import "../styles/login.css";

export default function Login() {
  const navigate = useNavigate();

  const [email, setEmail]     = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]       = useState("");

  async function handleLogin(e) {
    e.preventDefault();
    setError("");

    try {
      const res = await api.post("/auth/login", {
        email,
        password
      });

      localStorage.setItem("user", JSON.stringify(res.data.user));

      socket.connect();  // ⬅ IMPORTANT

      navigate("/");

    } catch (err) {
      setError(err.response?.data?.message || "Login failed");
    }
  }

  return (
    <div className="page login-page">
      <form className="form" onSubmit={handleLogin}>
        <h2>Login</h2>

        {error && <p style={{ color: "red" }}>{error}</p>}

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
        />

        <button type="submit">Login</button>

        <p>
          Don't have an account? <Link to="/register">Register</Link>
        </p>
      </form>
    </div>
  );
}
