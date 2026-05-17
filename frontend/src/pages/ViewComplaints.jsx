import { useEffect, useState } from "react";
import API from "../services/api";
import Layout from "../components/Layout";

function ViewComplaints() {
  const [complaints, setComplaints] = useState([]);

  const [search, setSearch] =
  useState("");

const [statusFilter, setStatusFilter] =
  useState("All");

const [priorityFilter, setPriorityFilter] =
  useState("All");

  const fetchComplaints = async () => {
    try {
      const response = await API.get(
        "/complaints/all"
      );

      setComplaints(response.data);
    } catch (error) {
      console.error(error);
      alert("Failed to load complaints");
    }
  };

  useEffect(() => {
    fetchComplaints();
  }, []);

  const updateStatus = async (
    complaintId,
    status
  ) => {
    try {
      await API.put(
        `/complaints/update-status/${complaintId}`,
        { status }
      );

      fetchComplaints();
    } catch (error) {
      alert("Failed to update status");
    }
  };

  const assignAgent = async (
    complaintId,
    assignedTo
  ) => {
    try {
      await API.put(
        `/complaints/assign/${complaintId}`,
        {
          assigned_to: assignedTo,
        }
      );

      fetchComplaints();
    } catch (error) {
      alert("Failed to assign agent");
    }
  };

  const deleteComplaint = async (
    complaintId
  ) => {
    const confirmDelete = window.confirm(
      "Delete this complaint?"
    );

    if (!confirmDelete) return;

    try {
      await API.delete(
        `/complaints/delete/${complaintId}`
      );

      fetchComplaints();
    } catch (error) {
      alert("Failed to delete complaint");
    }
  };

  const getStatusStyle = (status) => {
    switch (status) {
      case "Pending":
        return {
          background: "#fff3cd",
          color: "#856404",
        };

      case "In Progress":
        return {
          background: "#d1ecf1",
          color: "#0c5460",
        };

      case "Resolved":
        return {
          background: "#d4edda",
          color: "#155724",
        };

      default:
        return {};
    }
  };
const filteredComplaints =
  complaints.filter(
    (complaint) => {
      const matchesSearch =
        complaint.complaint_id
          ?.toLowerCase()
          .includes(
            search.toLowerCase()
          ) ||
        complaint.customer_name
          ?.toLowerCase()
          .includes(
            search.toLowerCase()
          ) ||
        complaint.email
          ?.toLowerCase()
          .includes(
            search.toLowerCase()
          );

      const matchesStatus =
        statusFilter === "All" ||
        complaint.status ===
          statusFilter;

      const matchesPriority =
        priorityFilter === "All" ||
        complaint.priority ===
          priorityFilter;

      return (
        matchesSearch &&
        matchesStatus &&
        matchesPriority
      );
    }
  );
  return (
    <Layout>
    <div
      style={{
        padding: "40px",
        background: "#f4f6f9",
        minHeight: "100vh",
      }}
    >
      <h1
        style={{
          marginBottom: "25px",
          color: "#1e3c72",
        }}
      >
        Complaint Management
        <div
  style={{
    display: "flex",
    gap: "15px",
    marginBottom: "25px",
    flexWrap: "wrap",
  }}
>
  <input
    type="text"
    placeholder="Search complaint..."
    value={search}
    onChange={(e) =>
      setSearch(e.target.value)
    }
    style={{
      padding: "12px",
      width: "280px",
      borderRadius: "8px",
      border: "1px solid #ddd",
    }}
  />

  <select
    value={statusFilter}
    onChange={(e) =>
      setStatusFilter(
        e.target.value
      )
    }
    style={{
      padding: "12px",
      borderRadius: "8px",
    }}
  >
    <option value="All">
      All Status
    </option>
    <option value="Pending">
      Pending
    </option>
    <option value="In Progress">
      In Progress
    </option>
    <option value="Resolved">
      Resolved
    </option>
  </select>

  <select
    value={priorityFilter}
    onChange={(e) =>
      setPriorityFilter(
        e.target.value
      )
    }
    style={{
      padding: "12px",
      borderRadius: "8px",
    }}
  >
    <option value="All">
      All Priority
    </option>
    <option value="Low">
      Low
    </option>
    <option value="Medium">
      Medium
    </option>
    <option value="High">
      High
    </option>
  </select>
</div>
      </h1>

      <div
        style={{
          background: "white",
          borderRadius: "12px",
          boxShadow:
            "0 2px 10px rgba(0,0,0,0.1)",
          overflow: "hidden",
        }}
      >
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
          }}
        >
          <thead>
            <tr
              style={{
                background: "#1e3c72",
                color: "white",
              }}
            >
              <th style={thStyle}>
                Complaint ID
              </th>
              <th style={thStyle}>
                Customer
              </th>
              <th style={thStyle}>
                Category
              </th>
              <th style={thStyle}>
                Priority
              </th>
              <th style={thStyle}>
                Status
              </th>
              <th style={thStyle}>
                Assign Agent
              </th>
              <th style={thStyle}>
                Delete
              </th>
            </tr>
          </thead>

          <tbody>
            {complaints.map((complaint) => (
              <tr
                key={complaint.id}
                style={{
                  borderBottom:
                    "1px solid #eee",
                }}
              >
                <td style={tdStyle}>
                  {complaint.complaint_id}
                </td>

                <td style={tdStyle}>
                  {complaint.customer_name}
                </td>

                <td style={tdStyle}>
                  {complaint.category}
                </td>

                <td style={tdStyle}>
                  {complaint.priority}
                </td>

                <td style={tdStyle}>
                  <select
                    value={complaint.status}
                    onChange={(e) =>
                      updateStatus(
                        complaint.complaint_id,
                        e.target.value
                      )
                    }
                    style={{
                      padding: "8px",
                      borderRadius: "8px",
                      border: "none",
                      ...getStatusStyle(
                        complaint.status
                      ),
                    }}
                  >
                    <option value="Pending">
                      Pending
                    </option>

                    <option value="In Progress">
                      In Progress
                    </option>

                    <option value="Resolved">
                      Resolved
                    </option>
                  </select>
                </td>

                <td style={tdStyle}>
                  <input
                    type="text"
                    placeholder="Assign Agent"
                    defaultValue={
                      complaint.assigned_to ||
                      ""
                    }
                    onBlur={(e) =>
                      assignAgent(
                        complaint.complaint_id,
                        e.target.value
                      )
                    }
                    style={{
                      padding: "8px",
                      borderRadius: "8px",
                      width: "140px",
                    }}
                  />
                </td>

                <td style={tdStyle}>
                  <button
                    onClick={() =>
                      deleteComplaint(
                        complaint.complaint_id
                      )
                    }
                    style={{
                      background:
                        "#dc3545",
                      color: "white",
                      border: "none",
                      padding:
                        "10px 14px",
                      borderRadius:
                        "8px",
                    }}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
    </Layout>
  );
}

const thStyle = {
  padding: "16px",
  textAlign: "left",
};

const tdStyle = {
  padding: "16px",
};

export default ViewComplaints;