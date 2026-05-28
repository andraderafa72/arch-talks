type MacWindowControlsProps = {
  isMaximized: boolean;
  onMinimize: () => void;
  onToggleMaximize: () => void;
  onClose: () => void;
};

export function MacWindowControls({
  isMaximized,
  onMinimize,
  onToggleMaximize,
  onClose,
}: MacWindowControlsProps) {
  return (
    <div className="mac-traffic-lights window-no-drag">
      <button
        type="button"
        className="mac-traffic-light mac-traffic-light--close"
        aria-label="Close window"
        onClick={onClose}
      >
        <span className="mac-traffic-light__glyph" aria-hidden="true">
          ×
        </span>
      </button>
      <button
        type="button"
        className="mac-traffic-light mac-traffic-light--minimize"
        aria-label="Minimize window"
        onClick={onMinimize}
      >
        <span className="mac-traffic-light__glyph" aria-hidden="true">
          −
        </span>
      </button>
      <button
        type="button"
        className="mac-traffic-light mac-traffic-light--maximize"
        aria-label={isMaximized ? "Restore window" : "Maximize window"}
        onClick={onToggleMaximize}
      >
        <span className="mac-traffic-light__glyph mac-traffic-light__glyph--maximize" aria-hidden="true">
          {isMaximized ? (
            <svg viewBox="0 0 10 10" width="8" height="8" fill="currentColor" aria-hidden="true">
              <path d="M3 1h6v6H7V3H3V1zm-2 2h6v6H1V3z" />
            </svg>
          ) : (
            "+"
          )}
        </span>
      </button>
    </div>
  );
}
