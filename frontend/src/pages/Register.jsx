import { useState } from "react";
import API from "../services/api";

function Register() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    role: "customer",
  });

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleRegister = async () => {
    try {
      const response = await API.post(
        "/auth/register",
        formData
      );

      alert(response.data.message);

      setFormData({
        name: "",
        email: "",
        password: "",
        role: "customer",
      });
    } catch (error) {
      alert(
        error.response?.data?.message ||
          "Registration Failed"
      );
    }
  };

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        height: "100vh",
        backgroundColor: "#f4f4f4",
      }}
    >
      <div
        style={{
          background: "#fff",
          padding: "30px",
          borderRadius: "10px",
          width: "350px",
          boxShadow: "0 0 10px rgba(0,0,0,0.1)",
        }}
      >
        <h2>Register User</h2>

        <input
          type="text"
          name="name"
          placeholder="Enter Name"
          value={formData.name}
          onChange={handleChange}
          style={{
            width: "100%",
            padding: "10px",
            marginBottom: "15px",
          }}
        />

        <input
          type="email"
          name="email"
          placeholder="Enter Email"
          value={formData.email}
          onChange={handleChange}
          style={{
            width: "100%",
            padding: "10px",
            marginBottom: "15px",
          }}
        />

        <input
          type="password"
          name="password"
          placeholder="Enter Password"
          value={formData.password}
          onChange={handleChange}
          style={{
            width: "100%",
            padding: "10px",
            marginBottom: "15px",
          }}
        />

        <select
          name="role"
          value={formData.role}
          onChange={handleChange}
          style={{
            width: "100%",
            padding: "10px",
            marginBottom: "15px",
          }}
        >
          <option value="admin">admin</option>
          <option value="agent">agent</option>
          <option value="customer">customer</option>
        </select>

        <button
          onClick={handleRegister}
          style={{
            width: "100%",
            padding: "10px",
            backgroundColor: "green",
            color: "#fff",
            border: "none",
            cursor: "pointer",
          }}
        >
          Register
        </button>
      </div>
    </div>
  );
}

export default Register;