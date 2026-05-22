/**
 * Demo seed script — run once: node seed.js
 * Inserts users, complaints, history, feedback, and notifications for demo.
 */

const bcrypt = require("bcryptjs");
const db = require("./config/db");

const hash = (pw) => bcrypt.hashSync(pw, 10);

const daysAgo = (n, extraHours = 0) => {
  const d = new Date();
  d.setHours(d.getHours() - n * 24 - extraHours);
  return d.toISOString().replace("T", " ").slice(0, 19);
};

const slaHours = { Critical: 4, High: 24, Medium: 48, Low: 72 };

const slaFor = (createdStr, priority) => {
  const d = new Date(createdStr);
  d.setHours(d.getHours() + slaHours[priority]);
  return d.toISOString().replace("T", " ").slice(0, 19);
};

// ── clear existing data (roles and categories are kept — seeded by db.js) ────
console.log("Clearing existing data...");
db.exec(`
  DELETE FROM notifications;
  DELETE FROM feedback;
  DELETE FROM complaint_history;
  DELETE FROM complaints;
  DELETE FROM agent_categories;
  DELETE FROM users;
`);

// ── helpers ───────────────────────────────────────────────────────────────────
const getRoleId = (roleName) =>
  db.prepare("SELECT id FROM roles WHERE role_name = ?").get(roleName).id;

const getCatId = (catName) =>
  db.prepare("SELECT id FROM categories WHERE category_name = ?").get(catName).id;

const getUser = (email) =>
  db.prepare("SELECT id FROM users WHERE email = ?").get(email);

// ── USERS ─────────────────────────────────────────────────────────────────────
console.log("Inserting users...");
const insertUser = db.prepare(
  "INSERT INTO users (name, email, phone, password, role_id) VALUES (?, ?, ?, ?, ?)"
);

const userDefs = [
  { name: "Ramakrishnan",  email: "admin@ccrts.com",      phone: "9000000001", role: "admin" },
  { name: "Ananya Sharma", email: "supervisor@ccrts.com", phone: "9000000002", role: "supervisor" },
  { name: "Arjun Mehta",   email: "agent1@ccrts.com",     phone: "9000000003", role: "agent" },
  { name: "Priya Nair",    email: "agent2@ccrts.com",     phone: "9000000004", role: "agent" },
  { name: "Karthik Rajan", email: "agent3@ccrts.com",     phone: "9000000005", role: "agent" },
  { name: "Deepa Iyer",    email: "quality@ccrts.com",    phone: "9000000006", role: "quality" },
  { name: "Anjali Verma",  email: "anjali@email.com",     phone: "9876543210", role: "customer" },
  { name: "Rohit Sharma",  email: "rohit@email.com",      phone: "9876543211", role: "customer" },
  { name: "Meena Pillai",  email: "meena@email.com",      phone: "9876543212", role: "customer" },
  { name: "Vikram Nair",   email: "vikram@email.com",     phone: "9876543213", role: "customer" },
  { name: "Sneha Reddy",   email: "sneha@email.com",      phone: "9876543214", role: "customer" },
];

userDefs.forEach((u) =>
  insertUser.run(u.name, u.email, u.phone, hash("Password@123"), getRoleId(u.role))
);

// ── look up user IDs after insert ─────────────────────────────────────────────
const admin  = getUser("admin@ccrts.com");
const sup    = getUser("supervisor@ccrts.com");
const agent1 = getUser("agent1@ccrts.com");
const agent2 = getUser("agent2@ccrts.com");
const agent3 = getUser("agent3@ccrts.com");
const anjali = getUser("anjali@email.com");
const rohit  = getUser("rohit@email.com");
const meena  = getUser("meena@email.com");
const vikram = getUser("vikram@email.com");
const sneha  = getUser("sneha@email.com");

// ── AGENT-CATEGORY MAPPINGS ───────────────────────────────────────────────────
console.log("Inserting agent-category mappings...");
const insertMapping = db.prepare(
  "INSERT OR IGNORE INTO agent_categories (agent_id, category_id) VALUES (?, ?)"
);
[
  // Arjun Mehta: Billing Issues, Technical Problems, Product Defects
  [agent1.id, getCatId("Billing Issues")],
  [agent1.id, getCatId("Technical Problems")],
  [agent1.id, getCatId("Product Defects")],
  // Priya Nair: Billing Issues, Service Disruption, Customer Service Complaints
  [agent2.id, getCatId("Billing Issues")],
  [agent2.id, getCatId("Service Disruption")],
  [agent2.id, getCatId("Customer Service Complaints")],
  // Karthik Rajan: Delivery Delays, Technical Problems, Account Issues
  [agent3.id, getCatId("Delivery Delays")],
  [agent3.id, getCatId("Technical Problems")],
  [agent3.id, getCatId("Account Issues")],
].forEach(([aid, cid]) => insertMapping.run(aid, cid));

// ── COMPLAINTS ────────────────────────────────────────────────────────────────
console.log("Inserting complaints...");
const insertComplaint = db.prepare(`
  INSERT INTO complaints
    (complaint_id, customer_id, category_id, priority,
     assigned_to, description, status, sla_deadline, resolved_at, created_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const complaintsData = [
  // Resolved / Closed
  {
    id: "CMP-001", custId: anjali.id, cat: "Billing Issues", priority: "High",
    agentId: agent1.id, status: "Resolved",
    desc: "Was charged twice for the same invoice #INV-2024-0891 in March. Need immediate refund.",
    daysAgo: 15, resolvedDaysAgo: 12,
  },
  {
    id: "CMP-002", custId: rohit.id, cat: "Service Disruption", priority: "Critical",
    agentId: agent2.id, status: "Resolved",
    desc: "Complete service outage on our end since 6 AM. Multiple users affected. URGENT.",
    daysAgo: 20, resolvedDaysAgo: 19,
  },
  {
    id: "CMP-003", custId: meena.id, cat: "Delivery Delays", priority: "Medium",
    agentId: agent3.id, status: "Closed",
    desc: "Order #ORD-7823 was supposed to arrive 5 days ago. No tracking update available.",
    daysAgo: 25, resolvedDaysAgo: 22,
  },
  {
    id: "CMP-004", custId: vikram.id, cat: "Product Defects", priority: "High",
    agentId: agent1.id, status: "Resolved",
    desc: "Laptop screen has dead pixels appeared after just 2 weeks of use. Under warranty.",
    daysAgo: 18, resolvedDaysAgo: 14,
  },
  {
    id: "CMP-005", custId: sneha.id, cat: "Billing Issues", priority: "Low",
    agentId: agent2.id, status: "Closed",
    desc: "Requesting itemised bill for last 3 months for tax purposes.",
    daysAgo: 30, resolvedDaysAgo: 28,
  },
  {
    id: "CMP-006", custId: anjali.id, cat: "Customer Service Complaints", priority: "Medium",
    agentId: agent2.id, status: "Resolved",
    desc: "Agent was rude during last call. Would like this escalated to management.",
    daysAgo: 12, resolvedDaysAgo: 10,
  },

  // Active complaints
  {
    id: "CMP-007", custId: rohit.id, cat: "Technical Problems", priority: "High",
    agentId: agent1.id, status: "In Progress",
    desc: "Mobile app crashes consistently on iOS 17.4 when trying to checkout. Reproducible every time.",
    daysAgo: 3, resolvedDaysAgo: null,
  },
  {
    id: "CMP-008", custId: meena.id, cat: "Billing Issues", priority: "Critical",
    agentId: agent2.id, status: "Escalated",
    desc: "Account was debited ₹15,000 without any service being rendered. This is fraud.",
    daysAgo: 2, resolvedDaysAgo: null,
  },
  {
    id: "CMP-009", custId: vikram.id, cat: "Delivery Delays", priority: "Medium",
    agentId: agent3.id, status: "Assigned",
    desc: "Package marked as delivered but never received. Neighbours confirm they didn't take it.",
    daysAgo: 1, resolvedDaysAgo: null,
  },
  {
    id: "CMP-010", custId: sneha.id, cat: "Product Defects", priority: "High",
    agentId: agent1.id, status: "Pending Customer Response",
    desc: "Headphones stopped working after 3 months. Left ear unit completely silent.",
    daysAgo: 4, resolvedDaysAgo: null,
  },
  {
    id: "CMP-011", custId: anjali.id, cat: "Technical Problems", priority: "Low",
    agentId: null, status: "Open",
    desc: "Cannot change account email address. Settings page throws an error 500.",
    daysAgo: 0.5, resolvedDaysAgo: null,
  },
  {
    id: "CMP-012", custId: rohit.id, cat: "Customer Service Complaints", priority: "Medium",
    agentId: agent2.id, status: "In Progress",
    desc: "Subscription plan was not downgraded as requested last week. Still being charged premium.",
    daysAgo: 2, resolvedDaysAgo: null,
  },
  {
    id: "CMP-013", custId: meena.id, cat: "Billing Issues", priority: "High",
    agentId: null, status: "Open",
    desc: "Promotional discount of 20% was not applied during checkout despite having valid coupon code.",
    daysAgo: 0.2, resolvedDaysAgo: null,
  },
  {
    id: "CMP-014", custId: vikram.id, cat: "Technical Problems", priority: "Critical",
    agentId: agent3.id, status: "Escalated",
    desc: "API keys for business integration stopped working. Our entire production system is down.",
    daysAgo: 1.5, resolvedDaysAgo: null,
  },
  {
    id: "CMP-015", custId: sneha.id, cat: "Delivery Delays", priority: "Low",
    agentId: agent3.id, status: "Assigned",
    desc: "Request to change delivery address for upcoming order before it ships.",
    daysAgo: 0.8, resolvedDaysAgo: null,
  },
];

complaintsData.forEach((c) => {
  const created  = daysAgo(c.daysAgo);
  const sla      = slaFor(created, c.priority);
  const resolved = c.resolvedDaysAgo != null ? daysAgo(c.resolvedDaysAgo) : null;
  insertComplaint.run(
    c.id, c.custId, getCatId(c.cat), c.priority,
    c.agentId ?? null, c.desc, c.status, sla, resolved, created
  );
});

// ── COMPLAINT HISTORY ─────────────────────────────────────────────────────────
console.log("Inserting complaint history...");
const insertHistory = db.prepare(`
  INSERT INTO complaint_history (complaint_id, changed_by, old_status, new_status, note, changed_at)
  VALUES (?, ?, ?, ?, ?, ?)
`);

const histories = [
  // CMP-001 (Resolved)
  ["CMP-001", agent1.id, null,          "Open",        "Complaint received from customer.",                                               daysAgo(15)],
  ["CMP-001", agent1.id, "Open",        "Assigned",    "Assigned to Arjun Mehta for investigation.",                                      daysAgo(14, 20)],
  ["CMP-001", agent1.id, "Assigned",    "In Progress", "Contacted billing team. Verifying duplicate charge.",                             daysAgo(14)],
  ["CMP-001", agent1.id, "In Progress", "Resolved",    "Duplicate charge confirmed. Refund of ₹2,450 processed. Ref: REF-8821.",          daysAgo(12)],

  // CMP-002 (Resolved Critical)
  ["CMP-002", agent2.id, null,          "Open",        "Critical outage reported.",                                                        daysAgo(20)],
  ["CMP-002", agent2.id, "Open",        "Assigned",    "Assigned to Priya Nair — critical priority.",                                      daysAgo(20, 22)],
  ["CMP-002", agent2.id, "Assigned",    "In Progress", "Infrastructure team alerted. Investigating root cause.",                           daysAgo(19, 20)],
  ["CMP-002", agent2.id, "In Progress", "Resolved",    "Root cause: expired SSL certificate on load balancer. Renewed. Service restored.", daysAgo(19)],

  // CMP-003 (Closed)
  ["CMP-003", agent3.id, null,          "Open",        "Delivery delay reported.",                                           daysAgo(25)],
  ["CMP-003", agent3.id, "Open",        "Assigned",    "Assigned to Karthik Rajan.",                                         daysAgo(24)],
  ["CMP-003", agent3.id, "Assigned",    "In Progress", "Contacted logistics partner for tracking update.",                   daysAgo(23)],
  ["CMP-003", agent3.id, "In Progress", "Resolved",    "Package located at regional hub. Delivered on 2nd attempt.",         daysAgo(22)],
  ["CMP-003", agent3.id, "Resolved",    "Closed",      "Customer confirmed receipt. Case closed.",                           daysAgo(20)],

  // CMP-007 (In Progress)
  ["CMP-007", agent1.id, null,       "Open",        "App crash reported on iOS.",                                                   daysAgo(3)],
  ["CMP-007", agent1.id, "Open",     "Assigned",    "Assigned to Arjun Mehta.",                                                    daysAgo(2, 20)],
  ["CMP-007", agent1.id, "Assigned", "In Progress", "Reproduced the crash locally on iOS 17.4. Filing bug with mobile team.",      daysAgo(2)],

  // CMP-008 (Escalated)
  ["CMP-008", agent2.id, null,       "Open",      "Fraudulent debit reported.",                                                          daysAgo(2)],
  ["CMP-008", agent2.id, "Open",     "Assigned",  "Assigned to Priya Nair — critical billing case.",                                     daysAgo(1, 22)],
  ["CMP-008", agent2.id, "Assigned", "Escalated", "Escalated to supervisor: transaction under financial review. Amount: ₹15,000.",       daysAgo(1)],

  // CMP-009 (Assigned)
  ["CMP-009", agent3.id, null,   "Open",     "Non-delivery complaint filed.", daysAgo(1)],
  ["CMP-009", agent3.id, "Open", "Assigned", "Assigned to Karthik Rajan.",   daysAgo(1, 10)],

  // CMP-010 (Pending Customer Response)
  ["CMP-010", agent1.id, null,          "Open",                      "Headphone fault reported.",                                          daysAgo(4)],
  ["CMP-010", agent1.id, "Open",        "Assigned",                  "Assigned to Arjun Mehta.",                                           daysAgo(3, 20)],
  ["CMP-010", agent1.id, "Assigned",    "In Progress",               "Troubleshooting started. Requested purchase proof.",                  daysAgo(3)],
  ["CMP-010", agent1.id, "In Progress", "Pending Customer Response", "Waiting for purchase receipt to process warranty claim.",             daysAgo(2)],

  // CMP-014 (Escalated Critical)
  ["CMP-014", agent3.id, null,       "Open",      "API failure reported.",                                                                daysAgo(1.5)],
  ["CMP-014", agent3.id, "Open",     "Assigned",  "Assigned to Karthik Rajan — critical.",                                               daysAgo(1.5, 8)],
  ["CMP-014", agent3.id, "Assigned", "Escalated", "Escalated: production system impact confirmed. Involving senior engineering.",          daysAgo(1)],
];

histories.forEach((h) => insertHistory.run(...h));

// ── FEEDBACK ──────────────────────────────────────────────────────────────────
console.log("Inserting feedback...");
const insertFeedback = db.prepare(`
  INSERT INTO feedback (complaint_id, customer_id, rating, comments, submitted_at)
  VALUES (?, ?, ?, ?, ?)
`);

const feedbacks = [
  ["CMP-001", anjali.id, 4, "Quick resolution! Happy with the refund but took a day longer than expected.", daysAgo(11)],
  ["CMP-002", rohit.id,  5, "Excellent response to a critical issue. Restored within hours. Very impressed.", daysAgo(18)],
  ["CMP-003", meena.id,  3, "Issue resolved but communication could have been better during the process.", daysAgo(19)],
  ["CMP-004", vikram.id, 4, "Replacement was arranged quickly. Good service overall.", daysAgo(13)],
  ["CMP-005", sneha.id,  5, "Got the itemised bill within 24 hours. Very efficient!", daysAgo(27)],
  ["CMP-006", anjali.id, 2, "Eventually escalated, but took too long. The initial experience was poor.", daysAgo(9)],
];

feedbacks.forEach((f) => insertFeedback.run(...f));

// ── NOTIFICATIONS ─────────────────────────────────────────────────────────────
console.log("Inserting notifications...");
const insertNotif = db.prepare(`
  INSERT INTO notifications (user_id, complaint_id, message, is_read, created_at)
  VALUES (?, ?, ?, ?, ?)
`);

const notifs = [
  // For agent1 (Arjun Mehta)
  [agent1.id, "CMP-007", "New complaint CMP-007 assigned to you: App crash on iOS 17.4.", 1, daysAgo(2, 20)],
  [agent1.id, "CMP-010", "New complaint CMP-010 assigned to you: Headphone unit silent.", 1, daysAgo(3, 20)],
  [agent3.id, "CMP-015", "New complaint CMP-015 assigned to you: Delivery address change request.", 0, daysAgo(0.8)],

  // For agent2 (Priya Nair)
  [agent2.id, "CMP-008", "New complaint CMP-008 assigned to you: URGENT — unauthorised debit ₹15,000.", 1, daysAgo(1, 22)],
  [agent2.id, "CMP-012", "New complaint CMP-012 assigned to you: Subscription not downgraded.", 1, daysAgo(2)],
  [agent2.id, "CMP-008", "CMP-008 has been escalated to supervisor.", 0, daysAgo(1)],

  // For agent3 (Karthik Rajan)
  [agent3.id, "CMP-009", "New complaint CMP-009 assigned to you: Package not delivered.", 0, daysAgo(1, 10)],
  [agent3.id, "CMP-014", "New complaint CMP-014 assigned to you: CRITICAL — API keys down.", 1, daysAgo(1.5, 8)],
  [agent3.id, "CMP-014", "CMP-014 has been escalated. Production system impact confirmed.", 0, daysAgo(1)],

  // For supervisor (Ananya Sharma)
  [sup.id, "CMP-008", "Escalation: CMP-008 — Fraudulent debit of ₹15,000 needs supervisor review.", 0, daysAgo(1)],
  [sup.id, "CMP-014", "Escalation: CMP-014 — Critical API outage affecting business client.", 0, daysAgo(1)],
  [sup.id, "CMP-002", "SLA Alert: CMP-002 was resolved before breach. Good performance.", 1, daysAgo(19)],

  // For admin (Ramakrishnan)
  [admin.id, "CMP-008", "Critical complaint CMP-008 escalated: Fraudulent debit reported.", 0, daysAgo(1)],
  [admin.id, "CMP-014", "Critical complaint CMP-014 escalated: Full production outage.", 0, daysAgo(1)],
  [admin.id, null, "New user registered: Sneha Reddy (customer).", 1, daysAgo(30)],

  // For customers
  [anjali.id, "CMP-011", "Your complaint CMP-011 has been received. We'll respond within 72 hours.", 0, daysAgo(0.5)],
  [anjali.id, "CMP-001", "Your complaint CMP-001 has been resolved. Please submit your feedback.", 1, daysAgo(12)],
  [rohit.id,  "CMP-007", "Your complaint CMP-007 is currently In Progress. Our team is investigating.", 0, daysAgo(2)],
  [meena.id,  "CMP-013", "Your complaint CMP-013 has been received. We'll respond within 24 hours.", 0, daysAgo(0.2)],
  [vikram.id, "CMP-014", "Your complaint CMP-014 is being handled with highest priority.", 0, daysAgo(1.5)],
  [sneha.id,  "CMP-010", "Your complaint CMP-010: We need your purchase receipt to proceed.", 0, daysAgo(2)],
];

notifs.forEach((n) => insertNotif.run(...n));

// ── summary ───────────────────────────────────────────────────────────────────
console.log("\n✅ Seed complete!\n");
console.log("Demo login credentials (password for all: Password@123)");
console.log("─────────────────────────────────────────────────────");
console.log("  admin@ccrts.com       → admin        (Ramakrishnan)");
console.log("  supervisor@ccrts.com  → supervisor   (Ananya Sharma)");
console.log("  agent1@ccrts.com      → agent        (Arjun Mehta)");
console.log("  agent2@ccrts.com      → agent        (Priya Nair)");
console.log("  agent3@ccrts.com      → agent        (Karthik Rajan)");
console.log("  quality@ccrts.com     → quality      (Deepa Iyer)");
console.log("  anjali@email.com      → customer     (Anjali Verma)");
console.log("  rohit@email.com       → customer     (Rohit Sharma)");
console.log("  meena@email.com       → customer     (Meena Pillai)");
console.log("  vikram@email.com      → customer     (Vikram Nair)");
console.log("  sneha@email.com       → customer     (Sneha Reddy)");
console.log("─────────────────────────────────────────────────────");
console.log("  15 complaints | 28 history entries | 6 feedback | 21 notifications");
