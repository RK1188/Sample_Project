import React, { useState, useCallback } from 'react';

interface ChartPropertiesEditorProps {
  chartElement: any;
  onUpdateElement: (updates: any) => void;
}

const ChartPropertiesEditor: React.FC<ChartPropertiesEditorProps> = ({ chartElement, onUpdateElement }) => {
  const [editingData, setEditingData] = useState(false);
  const [tempData, setTempData] = useState(chartElement.data);

  const handleDataChange = useCallback((rowIndex: number, colIndex: number, value: string) => {
    const newData = { ...tempData };
    
    if (rowIndex === -1) {
      // Editing labels
      newData.labels[colIndex] = value;
    } else {
      // Editing dataset values
      const numValue = parseFloat(value) || 0;
      newData.datasets[rowIndex].data[colIndex] = numValue;
    }
    
    setTempData(newData);
  }, [tempData]);

  const handleSeriesNameChange = useCallback((index: number, name: string) => {
    const newData = { ...tempData };
    newData.datasets[index].label = name;
    setTempData(newData);
  }, [tempData]);

  const addCategory = useCallback(() => {
    const newData = { ...tempData };
    newData.labels.push(`Category ${newData.labels.length + 1}`);
    newData.datasets.forEach((dataset: any) => {
      dataset.data.push(0);
    });
    setTempData(newData);
  }, [tempData]);

  const addSeries = useCallback(() => {
    const colors = ['#4285f4', '#ea4335', '#fbbc04', '#34a853', '#9333ea', '#ec4899'];
    const newData = { ...tempData };
    const seriesIndex = newData.datasets.length;
    const color = colors[seriesIndex % colors.length];
    
    newData.datasets.push({
      label: `Series ${seriesIndex + 1}`,
      data: new Array(newData.labels.length).fill(0),
      backgroundColor: color,
      borderColor: color,
      borderWidth: 1
    });
    setTempData(newData);
  }, [tempData]);

  const removeCategory = useCallback((index: number) => {
    if (tempData.labels.length <= 1) return;
    const newData = { ...tempData };
    newData.labels.splice(index, 1);
    newData.datasets.forEach((dataset: any) => {
      dataset.data.splice(index, 1);
    });
    setTempData(newData);
  }, [tempData]);

  const removeSeries = useCallback((index: number) => {
    if (tempData.datasets.length <= 1) return;
    const newData = { ...tempData };
    newData.datasets.splice(index, 1);
    setTempData(newData);
  }, [tempData]);

  const applyDataChanges = useCallback(() => {
    onUpdateElement({ data: tempData });
    setEditingData(false);
  }, [tempData, onUpdateElement]);

  const cancelDataChanges = useCallback(() => {
    setTempData(chartElement.data);
    setEditingData(false);
  }, [chartElement.data]);

  return (
    <>
      <div className="property-group">
        <label>Chart Type</label>
        <select
          value={chartElement.chartType || 'column'}
          onChange={(e) => onUpdateElement({ chartType: e.target.value })}
        >
          <option value="column">Column</option>
          <option value="bar">Bar</option>
          <option value="line">Line</option>
          <option value="pie">Pie</option>
          <option value="doughnut">Doughnut</option>
          <option value="area">Area</option>
          <option value="scatter">Scatter</option>
          <option value="radar">Radar</option>
        </select>
      </div>

      <div className="property-group">
        <label>Chart Title</label>
        <input
          type="text"
          value={chartElement.options?.title || ''}
          onChange={(e) => onUpdateElement({ 
            options: { ...chartElement.options, title: e.target.value } 
          })}
          placeholder="Enter chart title"
        />
      </div>

      {/* Chart Data Editor Button */}
      <div className="property-group">
        <label>Chart Data</label>
        <button 
          className="btn-primary" 
          style={{ width: '100%' }}
          onClick={() => setEditingData(!editingData)}
        >
          {editingData ? 'Hide Data Editor' : 'Edit Data'}
        </button>
      </div>

      {/* Inline Data Editor */}
      {editingData && (
        <div className="property-group" style={{ maxHeight: '400px', overflow: 'auto' }}>
          <div className="chart-data-editor-inline">
            <table className="chart-data-table-inline" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ minWidth: '80px', border: '1px solid #e0e0e0', padding: '4px', background: '#f5f5f5' }}></th>
                  {tempData.labels.map((label: string, index: number) => (
                    <th key={index} style={{ minWidth: '80px', position: 'relative', border: '1px solid #e0e0e0', padding: '4px', background: '#f5f5f5' }}>
                      <input
                        type="text"
                        value={label}
                        onChange={(e) => handleDataChange(-1, index, e.target.value)}
                        className="category-input-inline"
                        style={{ width: '100%', border: 'none', background: 'transparent', padding: '2px' }}
                      />
                      {tempData.labels.length > 1 && (
                        <button
                          className="remove-btn-inline"
                          onClick={() => removeCategory(index)}
                          title="Remove category"
                          style={{
                            position: 'absolute',
                            top: '2px',
                            right: '2px',
                            width: '16px',
                            height: '16px',
                            border: 'none',
                            background: '#ea4335',
                            color: 'white',
                            borderRadius: '50%',
                            cursor: 'pointer',
                            fontSize: '10px',
                            lineHeight: '1',
                            padding: 0
                          }}
                        >
                          ×
                        </button>
                      )}
                    </th>
                  ))}
                  <th style={{ width: '30px', border: '1px solid #e0e0e0', padding: '4px', background: '#f5f5f5' }}>
                    <button 
                      onClick={addCategory}
                      style={{
                        width: '24px',
                        height: '24px',
                        border: '1px solid #4285f4',
                        background: 'white',
                        color: '#4285f4',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '16px',
                        lineHeight: '1',
                        padding: 0
                      }}
                    >
                      +
                    </button>
                  </th>
                </tr>
              </thead>
              <tbody>
                {tempData.datasets.map((dataset: any, rowIndex: number) => (
                  <tr key={rowIndex}>
                    <td style={{ position: 'relative', border: '1px solid #e0e0e0', padding: '4px' }}>
                      <input
                        type="text"
                        value={dataset.label}
                        onChange={(e) => handleSeriesNameChange(rowIndex, e.target.value)}
                        className="series-input-inline"
                        style={{ width: '100%', border: 'none', background: 'transparent', padding: '2px' }}
                      />
                      {tempData.datasets.length > 1 && (
                        <button
                          className="remove-btn-inline"
                          onClick={() => removeSeries(rowIndex)}
                          title="Remove series"
                          style={{
                            position: 'absolute',
                            top: '2px',
                            right: '2px',
                            width: '16px',
                            height: '16px',
                            border: 'none',
                            background: '#ea4335',
                            color: 'white',
                            borderRadius: '50%',
                            cursor: 'pointer',
                            fontSize: '10px',
                            lineHeight: '1',
                            padding: 0
                          }}
                        >
                          ×
                        </button>
                      )}
                    </td>
                    {dataset.data.map((value: number, colIndex: number) => (
                      <td key={colIndex} style={{ border: '1px solid #e0e0e0', padding: '4px' }}>
                        <input
                          type="number"
                          step="0.1"
                          value={value}
                          onChange={(e) => handleDataChange(rowIndex, colIndex, e.target.value)}
                          className="data-input-inline"
                          style={{ width: '100%', border: 'none', background: 'transparent', padding: '2px' }}
                        />
                      </td>
                    ))}
                    <td style={{ border: '1px solid #e0e0e0', padding: '4px' }}></td>
                  </tr>
                ))}
                <tr>
                  <td style={{ border: '1px solid #e0e0e0', padding: '4px' }}>
                    <button 
                      onClick={addSeries}
                      style={{
                        padding: '4px 8px',
                        border: '1px solid #4285f4',
                        background: 'white',
                        color: '#4285f4',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '12px'
                      }}
                    >
                      + Series
                    </button>
                  </td>
                  <td colSpan={tempData.labels.length + 1} style={{ border: '1px solid #e0e0e0', padding: '4px' }}></td>
                </tr>
              </tbody>
            </table>
            <div style={{ marginTop: '10px', display: 'flex', gap: '8px' }}>
              <button 
                className="btn-primary"
                onClick={applyDataChanges}
                style={{ flex: 1, padding: '6px 12px', background: '#4285f4', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
              >
                Apply Changes
              </button>
              <button 
                className="btn-secondary"
                onClick={cancelDataChanges}
                style={{ flex: 1, padding: '6px 12px', background: '#f0f0f0', color: '#333', border: '1px solid #ccc', borderRadius: '4px', cursor: 'pointer' }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="property-group">
        <label>Chart Options</label>
        <div className="checkbox-group" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input
              type="checkbox"
              checked={chartElement.options?.showLegend ?? true}
              onChange={(e) => onUpdateElement({ 
                options: { ...chartElement.options, showLegend: e.target.checked } 
              })}
            />
            Show Legend
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input
              type="checkbox"
              checked={chartElement.options?.showGrid ?? true}
              onChange={(e) => onUpdateElement({ 
                options: { ...chartElement.options, showGrid: e.target.checked } 
              })}
            />
            Show Grid
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input
              type="checkbox"
              checked={chartElement.options?.showDataLabels ?? false}
              onChange={(e) => onUpdateElement({ 
                options: { ...chartElement.options, showDataLabels: e.target.checked } 
              })}
            />
            Show Data Labels
          </label>
        </div>
      </div>

      <div className="property-group">
        <label>Chart Style</label>
        <select
          value={chartElement.options?.chartStyle || 'style1'}
          onChange={(e) => onUpdateElement({ 
            options: { ...chartElement.options, chartStyle: e.target.value } 
          })}
        >
          <option value="style1">Style 1 - Classic</option>
          <option value="style2">Style 2 - Modern</option>
          <option value="style3">Style 3 - Colorful</option>
          <option value="style4">Style 4 - Monochrome</option>
          <option value="style5">Style 5 - Gradient</option>
        </select>
      </div>
    </>
  );
};

export default ChartPropertiesEditor;