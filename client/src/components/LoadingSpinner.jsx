export const LoadingSpinner = ({ size = 24, className = "" }) => {
  return (
    <div className={`inline-flex items-center justify-center ${className}`}>
      <div
        style={{ width: size, height: size }}
        className="animate-spin rounded-full border-2 border-slate-300 border-t-brand"
      />
    </div>
  );
};
