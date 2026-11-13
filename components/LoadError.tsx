'use client';
// Shown in place of content that failed to load (API down, no network), with a retry button,
// so a failed request never leaves the page spinning forever.
export default function LoadError({ onRetry, message = 'Мэдээлэл ачаалж чадсангүй.', compact = false }: {
  onRetry: () => void; message?: string; compact?: boolean;
}) {
  return (
    <div className={`load-error${compact ? ' compact' : ''}`} role="alert">
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 9v4M12 17h.01" /><path d="M10.3 3.9 2.4 17.5A2 2 0 0 0 4.1 20.5h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" /></svg>
      <div>
        <b>{message}</b>
        <span>Интернэт холболтоо шалгаад дахин оролдоно уу.</span>
      </div>
      <button type="button" className="btn btn-sm btn-primary" onClick={onRetry}>Дахин оролдох</button>
    </div>
  );
}
