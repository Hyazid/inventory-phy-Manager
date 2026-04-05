import { useEffect, useState } from 'react';
import { api } from '../lib/api';

export default function BarcodeModal({ code, designation, onClose }) {
  const [imgSrc, setImgSrc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  useEffect(() => {
    api.articles.barcode(code)
      .then(b64 => setImgSrc(`data:image/png;base64,${b64}`))
      .catch(e  => setError(e.message))
      .finally(() => setLoading(false));
  }, [code]);

  // Fermer avec Escape
  useEffect(() => {
    const handler = e => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  function handlePrint() {
    const win = window.open('', '_blank');
    win.document.write(`
      <html><head><title>Code-barre — ${designation}</title>
      <style>
        body { font-family: monospace; text-align: center; padding: 20px; }
        h3   { margin-bottom: 8px; font-size: 14px; }
        img  { max-width: 100%; }
      </style></head>
      <body>
        <h3>${designation}</h3>
        <img src="${imgSrc}" />
        <p style="font-size:12px;color:#666">${code}</p>
        <script>window.onload = () => { window.print(); window.close(); }<\/script>
      </body></html>
    `);
    win.document.close();
  }

  return (
    // Overlay
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={styles.header}>
          <div>
            <div style={{ fontWeight: 600, fontSize: 15 }}>{designation}</div>
            <div style={{ fontSize: 12, color: 'var(--color-muted)', marginTop: 2 }}>{code}</div>
          </div>
          <button style={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        {/* Corps */}
        <div style={styles.body}>
          {loading && <p style={{ color: 'var(--color-muted)' }}>Génération...</p>}
          {error   && <p style={{ color: 'var(--color-danger)' }}>{error}</p>}
          {imgSrc  && (
            <img
              src={imgSrc}
              alt={`Code-barre ${code}`}
              style={{ maxWidth: '100%', borderRadius: 6, border: '1px solid var(--color-border)' }}
            />
          )}
        </div>

        {/* Footer */}
        <div style={styles.footer}>
          <button onClick={onClose}>Fermer</button>
          <button className="btn-primary" onClick={handlePrint} disabled={!imgSrc}>
            🖨 Imprimer
          </button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: 'fixed', inset: 0,
    background: 'rgba(0,0,0,0.45)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 1000,
  },
  modal: {
    background: 'var(--color-surface)',
    borderRadius: 10,
    width: 420,
    maxWidth: '90vw',
    boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
    display: 'flex', flexDirection: 'column',
    overflow: 'hidden',
  },
  header: {
    display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
    padding: '16px 20px',
    borderBottom: '1px solid var(--color-border)',
  },
  closeBtn: {
    background: 'none', border: 'none',
    fontSize: 18, cursor: 'pointer',
    color: 'var(--color-muted)', padding: '0 4px',
  },
  body: {
    padding: '24px 20px',
    display: 'flex', justifyContent: 'center', alignItems: 'center',
    minHeight: 140,
  },
  footer: {
    display: 'flex', justifyContent: 'flex-end', gap: 10,
    padding: '12px 20px',
    borderTop: '1px solid var(--color-border)',
  },
};