import React, { useState } from 'react';

interface TableModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateTable: (rows: number, columns: number, style: string, options: {
    headerRow: boolean;
    headerColumn: boolean;
    alternatingRows: boolean;
  }) => void;
}

const TableModal: React.FC<TableModalProps> = ({ isOpen, onClose, onCreateTable }) => {
  const [rows, setRows] = useState(3);
  const [columns, setColumns] = useState(3);
  const [tableStyle, setTableStyle] = useState('light');
  const [headerRow, setHeaderRow] = useState(true);
  const [headerColumn, setHeaderColumn] = useState(false);
  const [alternatingRows, setAlternatingRows] = useState(false);

  if (!isOpen) return null;

  const handleCreate = () => {
    onCreateTable(rows, columns, tableStyle, {
      headerRow,
      headerColumn,
      alternatingRows
    });
    onClose();
  };

  const tableStyles = [
    { id: 'none', name: 'No Style', preview: '⬜' },
    { id: 'light', name: 'Light', preview: '🔲' },
    { id: 'medium', name: 'Medium', preview: '🟦' },
    { id: 'dark', name: 'Dark', preview: '⬛' },
    { id: 'accent1', name: 'Accent 1', preview: '🟧' },
    { id: 'accent2', name: 'Accent 2', preview: '🟩' }
  ];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content table-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Insert Table</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        
        <div className="modal-body">
          {/* Table Size */}
          <div className="form-group">
            <label>Table Size</label>
            <div className="table-size-inputs">
              <div className="input-group">
                <label htmlFor="rows">Rows:</label>
                <input
                  id="rows"
                  type="number"
                  min="1"
                  max="20"
                  value={rows}
                  onChange={(e) => setRows(Math.max(1, Math.min(20, parseInt(e.target.value) || 1)))}
                />
              </div>
              <div className="input-group">
                <label htmlFor="columns">Columns:</label>
                <input
                  id="columns"
                  type="number"
                  min="1"
                  max="20"
                  value={columns}
                  onChange={(e) => setColumns(Math.max(1, Math.min(20, parseInt(e.target.value) || 1)))}
                />
              </div>
            </div>
          </div>

          {/* Quick Size Picker */}
          <div className="form-group">
            <label>Quick Size</label>
            <div className="table-size-picker">
              {Array(5).fill(0).map((_, rowIndex) => (
                <div key={`row-${rowIndex}`} className="table-picker-row">
                  {Array(5).fill(0).map((_, colIndex) => (
                    <div
                      key={`cell-${rowIndex}-${colIndex}`}
                      className={`table-picker-cell ${
                        rowIndex < rows && colIndex < columns ? 'selected' : ''
                      }`}
                      onMouseEnter={() => {
                        setRows(rowIndex + 1);
                        setColumns(colIndex + 1);
                      }}
                      onClick={() => {
                        setRows(rowIndex + 1);
                        setColumns(colIndex + 1);
                      }}
                    />
                  ))}
                </div>
              ))}
              <div className="table-size-display">{rows} × {columns} Table</div>
            </div>
          </div>

          {/* Table Style */}
          <div className="form-group">
            <label>Table Style</label>
            <div className="table-styles">
              {tableStyles.map(style => (
                <button
                  key={style.id}
                  className={`style-option ${tableStyle === style.id ? 'selected' : ''}`}
                  onClick={() => setTableStyle(style.id)}
                  title={style.name}
                >
                  <span className="style-icon">{style.preview}</span>
                  <span className="style-name">{style.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Table Options */}
          <div className="form-group">
            <label>Table Options</label>
            <div className="table-options">
              <label className="checkbox-option">
                <input
                  type="checkbox"
                  checked={headerRow}
                  onChange={(e) => setHeaderRow(e.target.checked)}
                />
                <span>Header Row</span>
              </label>
              <label className="checkbox-option">
                <input
                  type="checkbox"
                  checked={headerColumn}
                  onChange={(e) => setHeaderColumn(e.target.checked)}
                />
                <span>First Column</span>
              </label>
              <label className="checkbox-option">
                <input
                  type="checkbox"
                  checked={alternatingRows}
                  onChange={(e) => setAlternatingRows(e.target.checked)}
                />
                <span>Banded Rows</span>
              </label>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={handleCreate}>Insert Table</button>
        </div>
      </div>
    </div>
  );
};

export default TableModal;