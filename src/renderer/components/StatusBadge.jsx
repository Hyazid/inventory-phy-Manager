
const MAP = {
  bon:        { label: 'Bon état',    cls: 'badge-bon'        },
  usage:      { label: 'Usagé',       cls: 'badge-usage'      },
  defectueux: { label: 'Défectueux',  cls: 'badge-defectueux' },
  reforme:    { label: 'Réformé',     cls: 'badge-reforme'    },
};

export default function StatusBadge({ etat }) {
  const { label, cls } = MAP[etat] ?? { label: etat, cls: 'badge-reforme' };
  return <span className={`badge ${cls}`}>{label}</span>;
}