export default function ScoreRing({ score }) {
  const value = Math.max(0, Math.min(10, score));
  const radius = 34;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - value / 10);
  const tone = value >= 8 ? "good" : value >= 5 ? "mid" : "low";

  return (
    <div className={`score-ring score-${tone}`} title={`Critic score: ${value}/10`}>
      <svg viewBox="0 0 80 80" width="80" height="80">
        <circle className="ring-bg" cx="40" cy="40" r={radius} />
        <circle
          className="ring-fg"
          cx="40"
          cy="40"
          r={radius}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform="rotate(-90 40 40)"
        />
      </svg>
      <div className="score-text">
        <strong>{Number.isInteger(value) ? value : value.toFixed(1)}</strong>
        <span>/10</span>
      </div>
    </div>
  );
}
