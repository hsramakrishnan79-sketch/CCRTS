import {
  FaClipboardList,
  FaPlusCircle,
  FaSignOutAlt,
  FaHome,
} from "react-icons/fa";

import { useNavigate } from "react-router-dom";

function Layout({ children }) {
  const navigate = useNavigate();

  const user = JSON.parse(
    localStorage.getItem("user")
  );

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");

    navigate("/");
  };

  return (
    <div
      style={{
        display: "flex",
        minHeight: "100vh",
        background: "#f4f6f9",
      }}
    >
      {/* Sidebar */}
      <div
        style={{
          width: "260px",
          background: "#1e3c72",
          color: "white",
          padding: "30px 20px",
        }}
      >
        <h2
          style={{
            textAlign: "center",
            marginBottom: "40px",
          }}
        >
          CCRTS
        </h2>

        <button
          onClick={() =>
            navigate("/dashboard")
          }
          style={buttonStyle}
        >
          <FaHome />
          Dashboard
        </button>

        <button
          onClick={() =>
            navigate("/create-complaint")
          }
          style={buttonStyle}
        >
          <FaPlusCircle />
          Create Complaint
        </button>

        <button
          onClick={() =>
            navigate("/view-complaints")
          }
          style={buttonStyle}
        >
          <FaClipboardList />
          View Complaints
        </button>

        <button
          onClick={handleLogout}
          style={{
            ...buttonStyle,
            background: "#dc3545",
          }}
        >
          <FaSignOutAlt />
          Logout
        </button>

        <div
          style={{
            marginTop: "40px",
            textAlign: "center",
            opacity: 0.85,
          }}
        >
          <p>
            Logged in as:
          </p>
          <strong>
            {user?.name}
          </strong>

          <p
            style={{
              marginTop: "5px",
              fontSize: "14px",
            }}
          >
            {user?.role}
          </p>
        </div>
      </div>

      {/* Page Content */}
      <div
        style={{
          flex: 1,
          padding: "40px",
        }}
      >
        {children}
      </div>
    </div>
  );
}

const buttonStyle = {
  width: "100%",
  padding: "14px",
  marginBottom: "15px",
  border: "none",
  borderRadius: "8px",
  background: "#29539b",
  color: "white",
  display: "flex",
  alignItems: "center",
  gap: "10px",
  cursor: "pointer",
  fontSize: "15px",
};

export default Layout;