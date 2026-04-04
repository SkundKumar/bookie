"use client"

const LoadingOverlay = () => {
  return (
    <div className="loading-wrapper" role="status" aria-live="polite" aria-label="Submitting book">
      <div className="glass-form loading-shadow-wrapper">
        <div className="loading-shadow">
          <div className="loading-animation h-10 w-10 rounded-full border-2 border-white/35 border-t-white" />
          <h3 className="loading-title">Preparing your book</h3>
          <div className="loading-progress">
            <div className="loading-progress-item">
              <span className="loading-progress-status" />
              <span className="text-[var(--text-secondary)]">Uploading and validating files...</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default LoadingOverlay
