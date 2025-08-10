import React from 'react';

interface TableContextMenuProps {
  visible: boolean;
  x: number;
  y: number;
  onClose: () => void;
  onInsertRowAbove?: () => void;
  onInsertRowBelow?: () => void;
  onInsertColumnLeft?: () => void;
  onInsertColumnRight?: () => void;
  onDeleteRow?: () => void;
  onDeleteColumn?: () => void;
  onMergeCells?: () => void;
  onSplitCells?: () => void;
}

const TableContextMenu: React.FC<TableContextMenuProps> = ({
  visible,
  x,
  y,
  onClose,
  onInsertRowAbove,
  onInsertRowBelow,
  onInsertColumnLeft,
  onInsertColumnRight,
  onDeleteRow,
  onDeleteColumn,
  onMergeCells,
  onSplitCells
}) => {
  if (!visible) return null;

  React.useEffect(() => {
    const handleClickOutside = () => {
      onClose();
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('click', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('click', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  return (
    <div 
      className="table-context-menu"
      style={{
        position: 'fixed',
        left: x,
        top: y,
        zIndex: 10000,
        background: 'white',
        border: '1px solid #ccc',
        borderRadius: '4px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
        padding: '4px 0',
        minWidth: '180px'
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {onInsertRowAbove && (
        <button
          className="context-menu-item"
          onClick={() => {
            onInsertRowAbove();
            onClose();
          }}
        >
          Insert Row Above
        </button>
      )}
      {onInsertRowBelow && (
        <button
          className="context-menu-item"
          onClick={() => {
            onInsertRowBelow();
            onClose();
          }}
        >
          Insert Row Below
        </button>
      )}
      {onInsertColumnLeft && (
        <button
          className="context-menu-item"
          onClick={() => {
            onInsertColumnLeft();
            onClose();
          }}
        >
          Insert Column Left
        </button>
      )}
      {onInsertColumnRight && (
        <button
          className="context-menu-item"
          onClick={() => {
            onInsertColumnRight();
            onClose();
          }}
        >
          Insert Column Right
        </button>
      )}
      {(onInsertRowAbove || onInsertRowBelow || onInsertColumnLeft || onInsertColumnRight) && 
       (onDeleteRow || onDeleteColumn) && (
        <div className="context-menu-divider" style={{ borderTop: '1px solid #e0e0e0', margin: '4px 0' }} />
      )}
      {onDeleteRow && (
        <button
          className="context-menu-item"
          onClick={() => {
            onDeleteRow();
            onClose();
          }}
        >
          Delete Row
        </button>
      )}
      {onDeleteColumn && (
        <button
          className="context-menu-item"
          onClick={() => {
            onDeleteColumn();
            onClose();
          }}
        >
          Delete Column
        </button>
      )}
      {(onDeleteRow || onDeleteColumn) && (onMergeCells || onSplitCells) && (
        <div className="context-menu-divider" style={{ borderTop: '1px solid #e0e0e0', margin: '4px 0' }} />
      )}
      {onMergeCells && (
        <button
          className="context-menu-item"
          onClick={() => {
            onMergeCells();
            onClose();
          }}
        >
          Merge Cells
        </button>
      )}
      {onSplitCells && (
        <button
          className="context-menu-item"
          onClick={() => {
            onSplitCells();
            onClose();
          }}
        >
          Split Cells
        </button>
      )}
    </div>
  );
};

export default TableContextMenu;