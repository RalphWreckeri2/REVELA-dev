/**
 * KpiCard.jsx
 *
 * Reusable metric card for the KPI grid.
 * Used 3+ times on the Overview page; will be reused on Analytics, etc.
 *
 * Props:
 *   icon     — SVG element
 *   iconVariant — "gold" | "red" | "green" (controls icon background/color)
 *   value    — string | number  (the big headline number)
 *   label    — string           (descriptive caption below the value)
 */

const VARIANT_CLASSES = {
  gold:  "kpi-icon--gold",
  red:   "kpi-icon--red",
  green: "kpi-icon--green",
};

export default function KpiCard({ icon, iconVariant = "green", value, label }) {
  return (
    <div className="kpi-card frosted-glass saas-card">
      <div className={`kpi-icon ${VARIANT_CLASSES[iconVariant]}`}>
        {icon}
      </div>
      <div className="kpi-info">
        <h3>{value}</h3>
        <p>{label}</p>
      </div>
    </div>
  );
}
