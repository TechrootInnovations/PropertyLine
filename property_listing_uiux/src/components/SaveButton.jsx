export default function SaveButton({
  saving = false,
  children,
  loadingLabel = 'Saving…',
  className = 'btn btn-primary',
  type = 'button',
  disabled = false,
  ...props
}) {
  return (
    <button
      type={type}
      className={`${className}${saving ? ' is-loading' : ''}`}
      disabled={disabled || saving}
      aria-busy={saving}
      {...props}
    >
      {saving && <span className="btn-spinner" aria-hidden="true" />}
      <span>{saving ? loadingLabel : children}</span>
    </button>
  );
}
