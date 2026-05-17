import { useEffect, useState } from "react";
import Layout from "../components/Layout";
import API from "../services/api";

import {
  FaClipboardList,
  FaClock,
  FaSpinner,
  FaCheckCircle,
} from "react-icons/fa";

function Dashboard() {
  const user = JSON.parse(
    localStorage.getItem("user")
  );

  const [stats, setStats] =
    useState({
      total: 0,
      pending: 0,
      inProgress: 0,
      resolved: 0,
    });

  const fetchStats = async () => {
    try {
      const response =
        await API.get(
          "/complaints/stats"
        );

      setStats(response.data);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  return (
    <Layout>
      <h1>
        Welcome, {user?.name}
      </h1>

      <p
        style={{
          color: "#666",
          marginBottom: "30px",
        }}
      >
        Role: {user?.role}
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "20px",
        }}
      >
        <div
          style={{
            ...cardStyle,
            background:
              "linear-gradient(135deg, #1e3c72, #2a5298)",
            color: "white",
          }}
        >
          <FaClipboardList size={35} />
          <h3>
            Total Complaints
          </h3>
          <h1>{stats.total}</h1>
        </div>

        <div
          style={{
            ...cardStyle,
            background:
              "linear-gradient(135deg, #f7971e, #ffd200)",
            color: "#333",
          }}
        >
          <FaClock size={35} />
          <h3>Pending</h3>
          <h1>
            {stats.pending}
          </h1>
        </div>

        <div
          style={{
            ...cardStyle,
            background:
              "linear-gradient(135deg, #36d1dc, #5b86e5)",
            color: "white",
          }}
        >
          <FaSpinner size={35} />
          <h3>
            In Progress
          </h3>
          <h1>
            {stats.inProgress}
          </h1>
        </div>

        <div
          style={{
            ...cardStyle,
            background:
              "linear-gradient(135deg, #56ab2f, #a8e063)",
            color: "white",
          }}
        >
          <FaCheckCircle size={35} />
          <h3>Resolved</h3>
          <h1>
            {stats.resolved}
          </h1>
        </div>
      </div>
    </Layout>
  );
}

const cardStyle = {
  borderRadius: "16px",
  padding: "25px",
  boxShadow:
    "0 4px 15px rgba(0,0,0,0.1)",
  textAlign: "center",
};

export default Dashboard;