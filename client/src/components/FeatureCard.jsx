
export default function FeatureCard({
  icon,
  title,
  description,
  buttonLabel,
  onClick,
  accent = 'indigo',
}) {
  return (
    <article className={`feature-card feature-card-${accent}`}>
      <div className="feature-card-top">
        <span className="feature-card-icon" aria-hidden="true">
          {icon}
        </span>

        <span className="feature-card-arrow" aria-hidden="true">
          ↗
        </span>
      </div>

      <h2>{title}</h2>

      <p>{description}</p>

      <button
        type="button"
        className="feature-card-button"
        onClick={onClick}
      >
        {buttonLabel}
        <span aria-hidden="true">→</span>
      </button>
    </article>
  )
}