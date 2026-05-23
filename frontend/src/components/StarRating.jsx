export default function StarRating({ rating, size = 18 }) {
  return (
    <span>
      {[1, 2, 3, 4, 5].map((n) => (
        <span key={n} style={{ color: n <= Math.round(rating) ? "#ffc107" : "#ddd", fontSize: `${size}px` }}>★</span>
      ))}
    </span>
  );
}
