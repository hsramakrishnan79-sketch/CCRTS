export default function SectionCard({ title, children }) {
  return (
    <div className="card mb-24">
      <h3 className="text-primary" style={{ fontSize: "15px", fontWeight: 700, borderBottom: "2px solid #f0f0f0", paddingBottom: "10px", marginBottom: "20px" }}>
        {title}
      </h3>
      {children}
    </div>
  );
}
