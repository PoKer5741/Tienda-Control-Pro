'use client';

export default function Modal({ children, isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
      backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 9999,
      display: 'flex', justifyContent: 'center', alignItems: 'center',
      backdropFilter: 'blur(4px)'
    }}>
      <div style={{
        background: 'var(--x-bg-card)', padding: '25px', borderRadius: '12px',
        border: '1px solid var(--x-border)', width: '90%', maxWidth: '500px',
        maxHeight: '90vh', overflowY: 'auto', position: 'relative'
      }}>
        <button onClick={onClose} style={{
          position: 'absolute', right: '15px', top: '15px', background: 'transparent',
          border: 'none', color: 'var(--x-text-muted)', cursor: 'pointer', fontSize: '20px'
        }}>✕</button>
        {children}
      </div>
    </div>
  );
}