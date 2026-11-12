/** Page-level loading state: the ProperTech emblem with a light sweep, the wordmark and a running brass line.
 *  Fades in after a short delay so fast loads never flash it. Styles: .page-loader in app/proper.css. */
export default function PageLoader({ label = 'Ачаалж байна…' }: { label?: string }) {
  return (
    <div className="page-loader" role="status" aria-live="polite">
      <span className="pl-mark" aria-hidden="true" />
      <span className="pl-word" aria-hidden="true">Proper<i>Tech</i></span>
      <span className="pl-line" aria-hidden="true" />
      <span className="pl-label">{label}</span>
    </div>
  );
}
