import '../styles/ConfirmModal.css';

export default function ConfirmModal({ message, type = 'error', onClose, onConfirm, showCancel = false, details = null }) {
  return (
    <div className="confirm-overlay" onClick={onClose}>
      <div className="confirm-box" onClick={e => e.stopPropagation()}>
        <div className={`confirm-icon confirm-icon-${type}`}>
          {type === 'success' ? '✅' : type === 'error' ? '❌' : '⚠️'}
        </div>
        <div className="confirm-message">{message}</div>

        {details && (
          <div className="confirm-details">
            {details.info && (
              <div className="confirm-info-section">
                {details.info.map((line, i) => (
                  <div key={i} className="confirm-info-line">{line}</div>
                ))}
              </div>
            )}
            {details.items && (
              <div className="confirm-items-section">
                {details.items.map((item, i) => (
                  <div key={i} className="confirm-item-row">
                    <span className="confirm-item-index">{i + 1}.</span>
                    <span className="confirm-item-name">{item.name}</span>
                    <span className="confirm-item-qty">{item.qty} ชิ้น</span>
                  </div>
                ))}
              </div>
            )}
            {details.summary && (
              <div className="confirm-summary">{details.summary}</div>
            )}
          </div>
        )}

        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
          {showCancel && (
            <button className="confirm-btn-cancel" onClick={onClose}>ยกเลิก</button>
          )}
          <button className="confirm-btn" onClick={() => {
            if (onConfirm) onConfirm();
            else onClose();
          }}>ตกลง</button>
        </div>
      </div>
    </div>
  );
}