import { BrowserRouter, Routes, Route } from "react-router-dom";

function Login() {
  return <h1>Login Page</h1>;
}

function Register() {
  return <h1>Register Page</h1>;
}

function Dashboard() {
  return <h1>Dashboard</h1>;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/dashboard" element={<Dashboard />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;