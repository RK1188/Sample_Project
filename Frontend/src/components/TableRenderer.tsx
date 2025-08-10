import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Group, Rect, Text, Line } from 'react-konva';
import { TableElement, TableCell } from '../types';
import Konva from 'konva';
import { useApp } from '../context/AppContext';

interface TableRendererProps {
  element: TableElement;
  isSelected: boolean;
  isDraggable: boolean;
  onSelect: (e: Konva.KonvaEventObject<MouseEvent>) => void;
  onDragMove: (e: Konva.KonvaEventObject<DragEvent>) => void;
  onDragEnd: (e: Konva.KonvaEventObject<DragEvent>) => void;
  onCellEdit?: (row: number, col: number, content: string) => void;
  onCellSelect?: (row: number, col: number) => void;
  onContextMenu?: (e: Konva.KonvaEventObject<PointerEvent>, row?: number, col?: number) => void;
}

const TableRenderer: React.FC<TableRendererProps> = ({
  element,
  isSelected,
  isDraggable,
  onSelect,
  onDragMove,
  onDragEnd,
  onCellEdit,
  onCellSelect,
  onContextMenu
}) => {
  const { state, dispatch } = useApp();
  const currentSlide = state.presentation.slides[state.presentation.currentSlideIndex];
  const [selectedCell, setSelectedCell] = useState<{ row: number; col: number } | null>(null);
  const [editingCell, setEditingCell] = useState<{ row: number; col: number } | null>(null);
  const [editText, setEditText] = useState('');
  const [resizingColumn, setResizingColumn] = useState<number | null>(null);
  const [resizingRow, setResizingRow] = useState<number | null>(null);
  const [resizeStartPos, setResizeStartPos] = useState<{ x: number; y: number } | null>(null);
  const groupRef = useRef<any>(null);

  const x = element.x || 0;
  const y = element.y || 0;
  const width = element.width || 400;
  const height = element.height || 200;
  const rows = element.rows || 3;
  const columns = element.columns || 3;
  
  // Calculate cell dimensions
  const cellWidths = element.cellWidth || Array(columns).fill(width / columns);
  const cellHeights = element.cellHeight || Array(rows).fill(height / rows);
  
  // Initialize cells if not provided
  const cells = element.cells || Array(rows).fill(null).map(() => 
    Array(columns).fill(null).map(() => ({
      content: '',
      backgroundColor: '#ffffff',
      textColor: '#000000',
      fontSize: 14,
      fontFamily: 'Arial',
      textAlign: 'center' as const,
      verticalAlign: 'middle' as const,
      padding: 5
    }))
  );

  const borderColor = element.borderColor || '#000000';
  const borderWidth = element.borderWidth || 1;
  const borderStyle = element.borderStyle || 'solid';

  // Calculate cumulative positions
  const getColumnX = (col: number) => {
    let xPos = 0;
    for (let i = 0; i < col; i++) {
      xPos += cellWidths[i];
    }
    return xPos;
  };

  const getRowY = (row: number) => {
    let yPos = 0;
    for (let i = 0; i < row; i++) {
      yPos += cellHeights[i];
    }
    return yPos;
  };

  // Common function to start cell editing
  const startCellEdit = useCallback((row: number, col: number, e: Konva.KonvaEventObject<MouseEvent>) => {
    // Don't start editing if already editing
    if (editingCell && editingCell.row === row && editingCell.col === col) return;
    
    // Get the stage and its container
    const stage = e.target.getStage();
    if (!stage) return;
    
    const stageContainer = stage.container();
    const stageRect = stageContainer.getBoundingClientRect();
    
    // Get the stage transform
    const transform = stage.getAbsoluteTransform();
    const scale = transform.getMatrix()[0]; // Get scale from transform matrix
    
    // Calculate the absolute position of the cell accounting for stage transform
    const absX = stageRect.left + (x + getColumnX(col)) * scale;
    const absY = stageRect.top + (y + getRowY(row)) * scale;
    
    // Create a temporary input element
    const currentValue = cells[row][col].content;
    const cell = cells[row][col];
    const input = document.createElement('textarea');
    input.value = currentValue;
    input.style.position = 'fixed';
    input.style.left = `${absX}px`;
    input.style.top = `${absY}px`;
    input.style.width = `${cellWidths[col] * scale}px`;
    input.style.height = `${cellHeights[row] * scale}px`;
    input.style.padding = `${(cell.padding || 5) * scale}px`;
    input.style.border = 'none';
    input.style.borderRadius = '0';
    input.style.fontSize = `${(cell.fontSize || 14) * scale}px`;
    input.style.fontFamily = cell.fontFamily || 'Arial';
    input.style.textAlign = (cell.textAlign || 'center') as any;
    input.style.lineHeight = `${cellHeights[row] * scale - 2 * (cell.padding || 5) * scale}px`;
    input.style.zIndex = '10000';
    input.style.backgroundColor = cell.backgroundColor || '#ffffff';
    input.style.color = cell.textColor || '#000000';
    input.style.boxSizing = 'border-box';
    input.style.outline = '2px solid #4285f4';
    input.style.outlineOffset = '-2px';
    input.style.resize = 'none';
    input.style.overflow = 'hidden';
    input.style.verticalAlign = cell.verticalAlign || 'middle';
    input.style.display = 'flex';
    input.style.alignItems = cell.verticalAlign === 'top' ? 'flex-start' : cell.verticalAlign === 'bottom' ? 'flex-end' : 'center';
    
    document.body.appendChild(input);
    input.focus();
    input.select();
    
    // Mark the cell as editing
    setEditingCell({ row, col });
    
    let isRemoved = false;
    
    const handleSave = () => {
      if (isRemoved) return;
      isRemoved = true;
      
      const newValue = input.value;
      if (onCellEdit) {
        onCellEdit(row, col, newValue);
      }
      if (input.parentNode) {
        document.body.removeChild(input);
      }
      setEditingCell(null);
    };
    
    const handleCancel = () => {
      if (isRemoved) return;
      isRemoved = true;
      
      if (input.parentNode) {
        document.body.removeChild(input);
      }
      setEditingCell(null);
    };
    
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        input.removeEventListener('blur', handleSave);
        handleSave();
        
        // Move to next row, same column
        if (row < rows - 1) {
          setTimeout(() => {
            setSelectedCell({ row: row + 1, col });
            if (onCellSelect) {
              onCellSelect(row + 1, col);
            }
            const syntheticEvent = {
              target: e.target,
              evt: e.evt,
              cancelBubble: false
            } as any;
            startCellEdit(row + 1, col, syntheticEvent);
          }, 10);
        }
      } else if (event.key === 'Escape') {
        event.preventDefault();
        input.removeEventListener('blur', handleSave);
        handleCancel();
      } else if (event.key === 'Tab') {
        event.preventDefault();
        input.removeEventListener('blur', handleSave);
        handleSave();
        
        // Move to next/previous cell
        const nextCol = event.shiftKey ? col - 1 : col + 1;
        let nextRow = row;
        
        // Wrap to next/previous row if needed
        if (nextCol >= columns) {
          nextRow = row + 1;
          if (nextRow < rows) {
            setTimeout(() => {
              setSelectedCell({ row: nextRow, col: 0 });
              if (onCellSelect) {
                onCellSelect(nextRow, 0);
              }
              const syntheticEvent = {
                target: e.target,
                evt: e.evt,
                cancelBubble: false
              } as any;
              startCellEdit(nextRow, 0, syntheticEvent);
            }, 10);
          }
        } else if (nextCol < 0) {
          nextRow = row - 1;
          if (nextRow >= 0) {
            setTimeout(() => {
              setSelectedCell({ row: nextRow, col: columns - 1 });
              if (onCellSelect) {
                onCellSelect(nextRow, columns - 1);
              }
              const syntheticEvent = {
                target: e.target,
                evt: e.evt,
                cancelBubble: false
              } as any;
              startCellEdit(nextRow, columns - 1, syntheticEvent);
            }, 10);
          }
        } else {
          setTimeout(() => {
            setSelectedCell({ row, col: nextCol });
            if (onCellSelect) {
              onCellSelect(row, nextCol);
            }
            const syntheticEvent = {
              target: e.target,
              evt: e.evt,
              cancelBubble: false
            } as any;
            startCellEdit(row, nextCol, syntheticEvent);
          }, 10);
        }
      } else if (event.key === 'ArrowUp' && event.altKey) {
        event.preventDefault();
        if (row > 0) {
          input.removeEventListener('blur', handleSave);
          handleSave();
          setTimeout(() => {
            setSelectedCell({ row: row - 1, col });
            if (onCellSelect) {
              onCellSelect(row - 1, col);
            }
            const syntheticEvent = {
              target: e.target,
              evt: e.evt,
              cancelBubble: false
            } as any;
            startCellEdit(row - 1, col, syntheticEvent);
          }, 10);
        }
      } else if (event.key === 'ArrowDown' && event.altKey) {
        event.preventDefault();
        if (row < rows - 1) {
          input.removeEventListener('blur', handleSave);
          handleSave();
          setTimeout(() => {
            setSelectedCell({ row: row + 1, col });
            if (onCellSelect) {
              onCellSelect(row + 1, col);
            }
            const syntheticEvent = {
              target: e.target,
              evt: e.evt,
              cancelBubble: false
            } as any;
            startCellEdit(row + 1, col, syntheticEvent);
          }, 10);
        }
      } else if (event.key === 'ArrowLeft' && event.altKey) {
        event.preventDefault();
        if (col > 0) {
          input.removeEventListener('blur', handleSave);
          handleSave();
          setTimeout(() => {
            setSelectedCell({ row, col: col - 1 });
            if (onCellSelect) {
              onCellSelect(row, col - 1);
            }
            const syntheticEvent = {
              target: e.target,
              evt: e.evt,
              cancelBubble: false
            } as any;
            startCellEdit(row, col - 1, syntheticEvent);
          }, 10);
        }
      } else if (event.key === 'ArrowRight' && event.altKey) {
        event.preventDefault();
        if (col < columns - 1) {
          input.removeEventListener('blur', handleSave);
          handleSave();
          setTimeout(() => {
            setSelectedCell({ row, col: col + 1 });
            if (onCellSelect) {
              onCellSelect(row, col + 1);
            }
            const syntheticEvent = {
              target: e.target,
              evt: e.evt,
              cancelBubble: false
            } as any;
            startCellEdit(row, col + 1, syntheticEvent);
          }, 10);
        }
      }
    };
    
    input.addEventListener('blur', handleSave);
    input.addEventListener('keydown', handleKeyDown);
  }, [cells, onCellEdit, x, y, cellWidths, cellHeights, getColumnX, getRowY, editingCell, columns, rows, onCellSelect]);

  // Handle cell click - immediately start editing
  const handleCellClick = useCallback((row: number, col: number, e: Konva.KonvaEventObject<MouseEvent>) => {
    e.cancelBubble = true;
    setSelectedCell({ row, col });
    if (onCellSelect) {
      onCellSelect(row, col);
    }
    
    // Immediately start editing when clicking on a cell
    startCellEdit(row, col, e);
  }, [onCellSelect, startCellEdit]);

  // Handle cell double click for editing (same as single click now)
  const handleCellDblClick = useCallback((row: number, col: number, e: Konva.KonvaEventObject<MouseEvent>) => {
    e.cancelBubble = true;
    startCellEdit(row, col, e);
  }, [startCellEdit]);

  // Handle column resize
  const handleColumnResizeStart = useCallback((colIndex: number, e: Konva.KonvaEventObject<MouseEvent>) => {
    e.cancelBubble = true;
    setResizingColumn(colIndex);
    setResizeStartPos({ x: e.evt.clientX, y: e.evt.clientY });
    
    const stage = e.target.getStage();
    if (!stage) return;
    
    // Add stage-level handlers for move and up
    const handleMove = (evt: MouseEvent) => {
      const transform = stage.getAbsoluteTransform();
      const scale = transform.getMatrix()[0];
      
      const deltaX = (evt.clientX - (resizeStartPos?.x || evt.clientX)) / scale;
      const newWidths = [...cellWidths];
      newWidths[colIndex] = Math.max(30, cellWidths[colIndex] + deltaX);
      
      const newWidth = newWidths.reduce((sum, w) => sum + w, 0);
      
      // Update element
      if (currentSlide) {
        dispatch({
          type: 'UPDATE_ELEMENT',
          payload: {
            slideId: currentSlide.id,
            elementId: element.id,
            updates: {
              cellWidth: newWidths,
              width: newWidth
            }
          }
        });
      }
      
      setResizeStartPos({ x: evt.clientX, y: evt.clientY });
    };
    
    const handleUp = () => {
      setResizingColumn(null);
      setResizeStartPos(null);
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
      stage.container().style.cursor = 'default';
    };
    
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
  }, [cellWidths, element.id, dispatch, currentSlide, resizeStartPos]);

  // Handle row resize
  const handleRowResizeStart = useCallback((rowIndex: number, e: Konva.KonvaEventObject<MouseEvent>) => {
    e.cancelBubble = true;
    setResizingRow(rowIndex);
    setResizeStartPos({ x: e.evt.clientX, y: e.evt.clientY });
    
    const stage = e.target.getStage();
    if (!stage) return;
    
    // Add stage-level handlers for move and up
    const handleMove = (evt: MouseEvent) => {
      const transform = stage.getAbsoluteTransform();
      const scale = transform.getMatrix()[0];
      
      const deltaY = (evt.clientY - (resizeStartPos?.y || evt.clientY)) / scale;
      const newHeights = [...cellHeights];
      newHeights[rowIndex] = Math.max(20, cellHeights[rowIndex] + deltaY);
      
      const newHeight = newHeights.reduce((sum, h) => sum + h, 0);
      
      // Update element
      if (currentSlide) {
        dispatch({
          type: 'UPDATE_ELEMENT',
          payload: {
            slideId: currentSlide.id,
            elementId: element.id,
            updates: {
              cellHeight: newHeights,
              height: newHeight
            }
          }
        });
      }
      
      setResizeStartPos({ x: evt.clientX, y: evt.clientY });
    };
    
    const handleUp = () => {
      setResizingRow(null);
      setResizeStartPos(null);
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
      stage.container().style.cursor = 'default';
    };
    
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
  }, [cellHeights, element.id, dispatch, currentSlide, resizeStartPos]);

  // Apply table styling
  const getTableStyle = () => {
    const styles: any = {
      light: {
        headerBg: '#f0f0f0',
        headerText: '#000000',
        cellBg: '#ffffff',
        cellText: '#000000',
        borderColor: '#cccccc'
      },
      medium: {
        headerBg: '#4a86e8',
        headerText: '#ffffff',
        cellBg: '#ffffff',
        cellText: '#000000',
        borderColor: '#4a86e8'
      },
      dark: {
        headerBg: '#333333',
        headerText: '#ffffff',
        cellBg: '#f5f5f5',
        cellText: '#000000',
        borderColor: '#333333'
      },
      accent1: {
        headerBg: '#ff6d00',
        headerText: '#ffffff',
        cellBg: '#fff3e0',
        cellText: '#000000',
        borderColor: '#ff6d00'
      },
      accent2: {
        headerBg: '#00897b',
        headerText: '#ffffff',
        cellBg: '#e0f2f1',
        cellText: '#000000',
        borderColor: '#00897b'
      },
      none: {
        headerBg: '#ffffff',
        headerText: '#000000',
        cellBg: '#ffffff',
        cellText: '#000000',
        borderColor: '#000000'
      }
    };

    return styles[element.tableStyle || 'none'];
  };

  const style = getTableStyle();

  return (
    <Group
      x={x}
      y={y}
      draggable={isDraggable}
      onClick={onSelect}
      onDragMove={onDragMove}
      onDragEnd={onDragEnd}
      rotation={element.rotation || 0}
      opacity={element.opacity || 1}
    >
      {/* Render cells */}
      {cells.map((row, rowIndex) => {
        const rowY = getRowY(rowIndex);
        const rowHeight = cellHeights[rowIndex];
        
        return row.map((cell, colIndex) => {
          const colX = getColumnX(colIndex);
          const colWidth = cellWidths[colIndex];
          
          // Determine cell background
          let cellBg = cell.backgroundColor || style.cellBg;
          let cellTextColor = cell.textColor || style.cellText;
          
          // Apply header styling
          if (element.headerRow && rowIndex === 0) {
            cellBg = style.headerBg;
            cellTextColor = style.headerText;
          }
          if (element.headerColumn && colIndex === 0) {
            cellBg = style.headerBg;
            cellTextColor = style.headerText;
          }
          
          // Apply alternating rows
          if (element.alternatingRows && rowIndex > 0 && rowIndex % 2 === 0) {
            cellBg = '#f9f9f9';
          }

          const isSelectedCell = selectedCell && 
            selectedCell.row === rowIndex && 
            selectedCell.col === colIndex;

          return (
            <React.Fragment key={`cell-${rowIndex}-${colIndex}`}>
              {/* Cell background */}
              <Rect
                x={colX}
                y={rowY}
                width={colWidth}
                height={rowHeight}
                fill={cellBg}
                stroke={isSelectedCell ? '#4285f4' : borderColor}
                strokeWidth={isSelectedCell ? 2 : borderWidth}
                onClick={(e) => handleCellClick(rowIndex, colIndex, e)}
                onDblClick={(e) => handleCellDblClick(rowIndex, colIndex, e)}
                onContextMenu={(e) => {
                  e.cancelBubble = true;
                  if (onContextMenu) {
                    onContextMenu(e, rowIndex, colIndex);
                  }
                }}
              />
              
              {/* Cell text - hide when editing this cell */}
              {!(editingCell && editingCell.row === rowIndex && editingCell.col === colIndex) && (
                <Text
                  x={colX + (cell.padding || 5)}
                  y={rowY + (cell.padding || 5)}
                  width={colWidth - 2 * (cell.padding || 5)}
                  height={rowHeight - 2 * (cell.padding || 5)}
                  text={cell.content}
                  fontSize={cell.fontSize || 14}
                  fontFamily={cell.fontFamily || 'Arial'}
                  fontStyle={cell.fontWeight || 'normal'}
                  fill={cellTextColor}
                  align={cell.textAlign || 'center'}
                  verticalAlign={cell.verticalAlign || 'middle'}
                  listening={false}
                />
              )}
            </React.Fragment>
          );
        });
      })}

      {/* Draw grid lines */}
      {/* Horizontal lines */}
      {Array(rows + 1).fill(0).map((_, i) => {
        const yPos = getRowY(i);
        return (
          <Line
            key={`h-line-${i}`}
            points={[0, yPos, width, yPos]}
            stroke={borderColor}
            strokeWidth={borderWidth}
            dash={borderStyle === 'dashed' ? [5, 5] : borderStyle === 'dotted' ? [2, 2] : undefined}
            listening={false}
          />
        );
      })}

      {/* Vertical lines */}
      {Array(columns + 1).fill(0).map((_, i) => {
        const xPos = getColumnX(i);
        const finalX = i === columns ? width : xPos;
        return (
          <Line
            key={`v-line-${i}`}
            points={[finalX, 0, finalX, height]}
            stroke={borderColor}
            strokeWidth={borderWidth}
            dash={borderStyle === 'dashed' ? [5, 5] : borderStyle === 'dotted' ? [2, 2] : undefined}
            listening={false}
          />
        );
      })}

      {/* Selection border */}
      {isSelected && (
        <Rect
          x={-2}
          y={-2}
          width={width + 4}
          height={height + 4}
          stroke="#4285f4"
          strokeWidth={2}
          fill="transparent"
          listening={false}
        />
      )}

      {/* Column resize handles */}
      {isSelected && Array(columns - 1).fill(0).map((_, i) => {
        const xPos = getColumnX(i + 1);
        return (
          <Rect
            key={`col-resize-${i}`}
            x={xPos - 2}
            y={0}
            width={4}
            height={height}
            fill="transparent"
            stroke={resizingColumn === i ? '#4285f4' : 'transparent'}
            strokeWidth={1}
            onMouseEnter={(e) => {
              const stage = e.target.getStage();
              if (stage) {
                stage.container().style.cursor = 'col-resize';
              }
            }}
            onMouseLeave={(e) => {
              const stage = e.target.getStage();
              if (stage && resizingColumn === null) {
                stage.container().style.cursor = 'default';
              }
            }}
            onMouseDown={(e) => handleColumnResizeStart(i, e)}
          />
        );
      })}

      {/* Row resize handles */}
      {isSelected && Array(rows - 1).fill(0).map((_, i) => {
        const yPos = getRowY(i + 1);
        return (
          <Rect
            key={`row-resize-${i}`}
            x={0}
            y={yPos - 2}
            width={width}
            height={4}
            fill="transparent"
            stroke={resizingRow === i ? '#4285f4' : 'transparent'}
            strokeWidth={1}
            onMouseEnter={(e) => {
              const stage = e.target.getStage();
              if (stage) {
                stage.container().style.cursor = 'row-resize';
              }
            }}
            onMouseLeave={(e) => {
              const stage = e.target.getStage();
              if (stage && resizingRow === null) {
                stage.container().style.cursor = 'default';
              }
            }}
            onMouseDown={(e) => handleRowResizeStart(i, e)}
          />
        );
      })}

    </Group>
  );
};

export default TableRenderer;