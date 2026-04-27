import React from 'react';

interface Stat {
  label: string;
  value: string | number;
}

interface JurisprudenceHeroProps {
  title: string;
  subtitle?: string;
  stats?: Stat[];
  actions?: React.ReactNode;
}

const JurisprudenceHero: React.FC<JurisprudenceHeroProps> = ({
  title,
  subtitle,
  stats = [],
  actions,
}) => {
  return (
    <div className="juris-hero">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 280 }}>
          <h1>{title}</h1>
          {subtitle && <p>{subtitle}</p>}
        </div>
        {actions && <div style={{ display: 'flex', gap: 8 }}>{actions}</div>}
      </div>
      {stats.length > 0 && (
        <div className="juris-hero-stats">
          {stats.map((s) => (
            <div key={s.label} className="juris-hero-stat">
              <span className="label">{s.label}</span>
              <span className="value">{s.value}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default JurisprudenceHero;
