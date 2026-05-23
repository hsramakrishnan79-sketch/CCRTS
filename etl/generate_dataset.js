/**
 * ETL Step 1 — Synthetic Dataset Generator
 * Generates complaints_dataset.csv and feedback_dataset.csv
 * Run: node etl/generate_dataset.js
 */

const fs   = require("fs");
const path = require("path");

// ── Statistical parameters ────────────────────────────────────────────────────
const TOTAL        = 250;
const SLA_HOURS    = { Critical: 4, High: 24, Medium: 48, Low: 72 };

// Priority: Critical 10%, High 20%, Medium 45%, Low 25%
const PRIORITY_POOL = [
  ...Array(25).fill("Critical"),
  ...Array(50).fill("High"),
  ...Array(112).fill("Medium"),
  ...Array(63).fill("Low"),
];

// SLA compliance rates per priority
const SLA_COMPLIANCE = { Critical: 0.85, High: 0.75, Medium: 0.68, Low: 0.55 };

// Active status pool: Open 20%, Assigned 25%, In Progress 25%, Pending 15%, Escalated 15%
const ACTIVE_STATUS_POOL = [
  ...Array(20).fill("Open"),
  ...Array(25).fill("Assigned"),
  ...Array(25).fill("In Progress"),
  ...Array(15).fill("Pending Customer Response"),
  ...Array(15).fill("Escalated"),
];

// Agent workload: Pareto — agent1 40%, agent2 35%, agent3 25%
const AGENT_POOL = [
  ...Array(40).fill("agent1@ccrts.com"),
  ...Array(35).fill("agent2@ccrts.com"),
  ...Array(25).fill("agent3@ccrts.com"),
];

// Feedback rating: 5★ 25%, 4★ 35%, 3★ 20%, 2★ 12%, 1★ 8%
const RATING_POOL = [
  ...Array(25).fill(5),
  ...Array(35).fill(4),
  ...Array(20).fill(3),
  ...Array(12).fill(2),
  ...Array(8).fill(1),
];

// Monthly volume weights (Jan–Dec) — seasonal variation
const MONTHLY_WEIGHTS = [8, 6, 9, 10, 12, 11, 8, 7, 10, 13, 12, 9];

const CUSTOMERS = [
  "anjali@email.com", "rohit@email.com", "meena@email.com",
  "vikram@email.com", "sneha@email.com",
];

// Category distribution (weighted)
const CATEGORY_POOL = [
  ...Array(55).fill("Billing Issues"),
  ...Array(45).fill("Technical Problems"),
  ...Array(35).fill("Product Defects"),
  ...Array(35).fill("Service Disruption"),
  ...Array(35).fill("Delivery Delays"),
  ...Array(25).fill("Customer Service Complaints"),
  ...Array(20).fill("Account Issues"),
];

// ── Description templates per category ────────────────────────────────────────
const DESCRIPTIONS = {
  "Billing Issues": [
    "Was charged twice for invoice {INV}. Requesting immediate refund.",
    "Incorrect amount of Rs.{AMT} deducted without prior notice or consent.",
    "Promotional discount not applied despite valid coupon code {CODE}.",
    "Requesting itemised billing statement for past 3 months for audit purposes.",
    "EMI deduction failed but penalty was charged to account. Ref: {REF}.",
    "Credit note issued last cycle not applied to current invoice.",
    "Overcharged on renewal — quoted Rs.{AMT} but billed Rs.{AMT2}.",
    "Subscription auto-renewed without consent. Requesting cancellation and refund.",
    "GST component incorrectly calculated on invoice {INV}.",
    "Payment processed but account not credited. Transaction ref: {REF}.",
  ],
  "Technical Problems": [
    "Mobile application crashes on iOS {VER} consistently during checkout.",
    "Unable to log in to the portal since yesterday. OTP not being delivered.",
    "API endpoint returns 500 error intermittently affecting integrations.",
    "Dashboard not loading — spinner runs indefinitely on Chrome {VER}.",
    "Export to PDF feature broken — download initiates but file is corrupt.",
    "Two-factor authentication failing. SMS not delivered despite correct number.",
    "Integration with {TOOL} broken after latest platform update.",
    "Search functionality returns empty results for valid existing records.",
    "Session expires every few minutes causing repeated login prompts.",
    "File upload fails silently — no error shown but data not saved.",
  ],
  "Product Defects": [
    "Device display shows dead pixels after {N} weeks of normal use. Under warranty.",
    "Product ceased functioning within {N} days of purchase with no physical damage.",
    "Manufacturing defect observed — {ISSUE}. Photographic evidence available.",
    "Battery depleting {N}x faster than advertised specification.",
    "Product packaging severely damaged on arrival. Contents may be affected.",
    "Colour and finish do not match the product image shown at time of order.",
    "Missing components — {PART} not included in the box.",
    "Unit overheating during standard operation. Potential safety concern.",
    "Serial number on device does not match the one on warranty card.",
    "Product dims/flickers intermittently. Suspected internal fault.",
  ],
  "Service Disruption": [
    "Complete service unavailability since {TIME}. Multiple business users affected.",
    "Intermittent connectivity issues causing critical business disruption.",
    "Scheduled maintenance window exceeded by {N} hours. Services still unavailable.",
    "Automatic failover did not trigger during today's primary outage.",
    "API rate limits exceeded despite usage remaining within contracted plan.",
    "Disaster recovery site inaccessible. Business continuity plan blocked.",
    "Service degradation ongoing for {N} hours. Response times above 10 seconds.",
    "Services unavailable in {REGION} region since early morning.",
    "Notification service down — critical alerts not reaching end users.",
    "Backup service failing silently. Data integrity at risk.",
  ],
  "Delivery Delays": [
    "Order {ORD} was due {N} days ago with no tracking update provided.",
    "Package marked as delivered in system but never physically received.",
    "Delivery rescheduled {N} times without any prior customer communication.",
    "Wrong item delivered against order {ORD}. Requesting exchange.",
    "Partial delivery received — {N} of {TOTAL} ordered items are missing.",
    "Delivery attempted at incorrect address despite correct order details.",
    "Express shipping fee paid but standard delivery timelines applied.",
    "Return pickup not scheduled after {N} days of return request submission.",
    "Courier partner not reachable. Shipment status unknown for {N} days.",
    "Fragile item delivered with significant damage due to poor packaging.",
  ],
  "Customer Service Complaints": [
    "Support agent was dismissive during call on {DATE}. Requesting escalation.",
    "Committed callback within 2 hours — {N} days elapsed with no contact.",
    "Previous complaint closed without resolution. Raising again for review.",
    "Hold time exceeded 45 minutes before call dropped without resolution.",
    "Contradictory information provided across phone, email, and chat channels.",
    "Written commitment from agent not honoured. Reference email {REF}.",
    "Agent promised follow-up within 24 hours — no contact received since.",
    "Inappropriate tone observed during live chat interaction on {DATE}.",
    "Complaint raised 2 weeks ago with no acknowledgement or updates.",
    "Request to speak to supervisor repeatedly denied during support call.",
  ],
  "Account Issues": [
    "Unable to update registered email address — settings page returns error.",
    "Account locked after failed login attempts. Password reset email not received.",
    "Account data merged incorrectly during system migration. History missing.",
    "Duplicate account created. Requesting deduplication and data consolidation.",
    "KYC documents uploaded {N} days ago. Verification status still pending.",
    "Name mismatch between account profile and bank records causing payment failures.",
    "Permission levels not updated {N} days after role change was submitted.",
    "Account not deleted {N} days after formal deletion request was submitted.",
    "Two-step verification recovery codes no longer valid after phone change.",
    "Business account downgraded without authorisation from account admin.",
  ],
};

// ── Utilities ─────────────────────────────────────────────────────────────────
const pick  = (arr) => arr[Math.floor(Math.random() * arr.length)];
const rand  = (min, max) => Math.random() * (max - min) + min;
const isoTs = (d) => d.toISOString().replace("T", " ").slice(0, 19);
const addH  = (d, h) => new Date(d.getTime() + h * 3_600_000);

function fillTemplate(tmpl) {
  return tmpl
    .replace("{INV}",    `INV-${Math.floor(rand(1000, 9999))}`)
    .replace("{AMT}",    `${Math.floor(rand(500, 15000))}`)
    .replace("{AMT2}",   `${Math.floor(rand(500, 15000))}`)
    .replace("{CODE}",   `PROMO${Math.floor(rand(100, 999))}`)
    .replace("{REF}",    `REF-${Math.floor(rand(1000, 9999))}`)
    .replace("{VER}",    `${Math.floor(rand(15, 18))}.${Math.floor(rand(0, 5))}`)
    .replace("{TOOL}",   pick(["Salesforce", "Zapier", "Slack", "SAP", "Workday", "HubSpot"]))
    .replace("{ISSUE}",  pick(["loose hinge", "cracked bezel", "faulty charging port", "misaligned screen"]))
    .replace("{PART}",   pick(["charging cable", "user manual", "AC adapter", "warranty card", "remote control"]))
    .replace("{TIME}",   `${Math.floor(rand(6, 11))}:${Math.floor(rand(0, 5)) * 10 || "00"} AM`)
    .replace("{N}",      `${Math.floor(rand(2, 14))}`)
    .replace("{TOTAL}",  `${Math.floor(rand(3, 10))}`)
    .replace("{ORD}",    `ORD-${Math.floor(rand(10000, 99999))}`)
    .replace("{REGION}", pick(["North", "South", "East", "West", "Central"]))
    .replace("{DATE}",   `${Math.floor(rand(1, 28))}/${Math.floor(rand(1, 12))}/2024`);
}

function randomCreatedAt() {
  const totalW = MONTHLY_WEIGHTS.reduce((a, b) => a + b, 0);
  let r = Math.random() * totalW;
  let month = 11;
  for (let i = 0; i < 12; i++) {
    r -= MONTHLY_WEIGHTS[i];
    if (r <= 0) { month = i; break; }
  }
  const now  = new Date();
  let   year = now.getFullYear();
  if (month > now.getMonth()) year -= 1;
  const day  = Math.floor(rand(1, 28));
  const hour = Math.floor(rand(8, 19));
  const min  = Math.floor(rand(0, 59));
  return new Date(year, month, day, hour, min, 0);
}

// Active complaints: created within 10–90% of their SLA window so deadline is always in the future
function activeCreatedAt(priority) {
  const slaH     = SLA_HOURS[priority];
  const hoursAgo = slaH * rand(0.1, 0.9);
  return new Date(Date.now() - hoursAgo * 3_600_000);
}

// ── Generate records ──────────────────────────────────────────────────────────
const complaints = [];
const feedbacks   = [];

const priorities = [...PRIORITY_POOL].sort(() => Math.random() - 0.5);

// Decide which indices are resolved/closed (~60%)
const resolvedSet = new Set();
while (resolvedSet.size < 150) resolvedSet.add(Math.floor(Math.random() * TOTAL));

for (let i = 0; i < TOTAL; i++) {
  const num         = i + 16;
  const complaintId = `CMP-${String(num).padStart(3, "0")}`;
  const priority    = priorities[i];
  const category    = pick(CATEGORY_POOL);
  const customer    = pick(CUSTOMERS);

  let createdAt, status, resolvedAt, agentEmail;

  if (resolvedSet.has(i)) {
    createdAt               = randomCreatedAt();
    const compliant         = Math.random() < SLA_COMPLIANCE[priority];
    const slaH              = SLA_HOURS[priority];
    resolvedAt              = compliant
      ? addH(createdAt, slaH * rand(0.3, 0.95))
      : addH(createdAt, slaH * rand(1.1, 2.5));

    if (resolvedAt > new Date()) resolvedAt = new Date(Date.now() - 3_600_000);

    status     = Math.random() < 0.6 ? "Closed" : "Resolved";
    agentEmail = pick(AGENT_POOL);

    if (Math.random() < 0.65) {
      feedbacks.push({
        complaint_id:   complaintId,
        customer_email: customer,
        rating:         pick(RATING_POOL),
        submitted_at:   isoTs(addH(resolvedAt, rand(1, 48))),
      });
    }
  } else {
    createdAt  = activeCreatedAt(priority);
    status     = pick(ACTIVE_STATUS_POOL);
    resolvedAt = null;
    agentEmail = status === "Open" ? "" : pick(AGENT_POOL);
  }

  const slaDeadline = addH(createdAt, SLA_HOURS[priority]);

  complaints.push({
    complaint_id:   complaintId,
    customer_email: customer,
    category,
    priority,
    agent_email:    agentEmail,
    description:    fillTemplate(pick(DESCRIPTIONS[category])),
    status,
    created_at:     isoTs(createdAt),
    sla_deadline:   isoTs(slaDeadline),
    resolved_at:    resolvedAt ? isoTs(resolvedAt) : "",
  });
}

// Sort chronologically
complaints.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

// ── Write CSVs ────────────────────────────────────────────────────────────────
const outDir = __dirname;

const escape = (v) => `"${String(v).replace(/"/g, '""')}"`;

const cHeader = "complaint_id,customer_email,category,priority,agent_email,description,status,created_at,sla_deadline,resolved_at";
const cRows   = complaints.map((r) =>
  [r.complaint_id, r.customer_email, r.category, r.priority,
   r.agent_email, escape(r.description),
   r.status, r.created_at, r.sla_deadline, r.resolved_at].join(",")
);
fs.writeFileSync(path.join(outDir, "complaints_dataset.csv"), [cHeader, ...cRows].join("\n"), "utf8");

const fHeader = "complaint_id,customer_email,rating,submitted_at";
const fRows   = feedbacks.map((f) =>
  [f.complaint_id, f.customer_email, f.rating, f.submitted_at].join(",")
);
fs.writeFileSync(path.join(outDir, "feedback_dataset.csv"), [fHeader, ...fRows].join("\n"), "utf8");

// ── Stats summary ─────────────────────────────────────────────────────────────
const pCount = { Critical: 0, High: 0, Medium: 0, Low: 0 };
const sCount = {};
complaints.forEach((r) => { pCount[r.priority]++; sCount[r.status] = (sCount[r.status] || 0) + 1; });

const resolved   = complaints.filter((r) => r.resolved_at);
const breached   = resolved.filter((r) => new Date(r.resolved_at) > new Date(r.sla_deadline));
const compliance = ((resolved.length - breached.length) / resolved.length * 100).toFixed(1);
const rcCount    = complaints.filter((r) => ["Resolved", "Closed"].includes(r.status)).length;

console.log(`\n✅ Dataset generated: ${complaints.length} complaints, ${feedbacks.length} feedback records`);
console.log("\nPriority distribution:");
Object.entries(pCount).forEach(([p, c]) => console.log(`  ${p.padEnd(10)}: ${c} (${(c / complaints.length * 100).toFixed(1)}%)`));
console.log("\nStatus distribution:");
Object.entries(sCount).sort((a, b) => b[1] - a[1]).forEach(([s, c]) =>
  console.log(`  ${s.padEnd(35)}: ${c} (${(c / complaints.length * 100).toFixed(1)}%)`)
);
console.log(`\nSLA Compliance   : ${compliance}% (${resolved.length - breached.length}/${resolved.length} resolved within SLA)`);
console.log(`Feedback records : ${feedbacks.length} (${(feedbacks.length / rcCount * 100).toFixed(1)}% of Resolved/Closed)`);
console.log("\nFiles written:");
console.log("  etl/complaints_dataset.csv");
console.log("  etl/feedback_dataset.csv");
