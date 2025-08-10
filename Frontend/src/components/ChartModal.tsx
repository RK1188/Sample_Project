import React, { useState } from 'react';
import { ChartData } from '../types';

interface ChartModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateChart: (chartType: string, data: ChartData, options: any) => void;
}

const ChartModal: React.FC<ChartModalProps> = ({ isOpen, onClose, onCreateChart }) => {
  const [selectedChartType, setSelectedChartType] = useState<string>('column');
  const [showDataEditor, setShowDataEditor] = useState(false);
  const [chartData, setChartData] = useState<ChartData>({
    labels: ['Category 1', 'Category 2', 'Category 3', 'Category 4'],
    datasets: [
      {
        label: 'Series 1',
        data: [4.3, 2.5, 3.5, 4.5],
        backgroundColor: '#4285f4',
        borderColor: '#4285f4',
        borderWidth: 1
      },
      {
        label: 'Series 2',
        data: [2.4, 4.4, 1.8, 2.8],
        backgroundColor: '#ea4335',
        borderColor: '#ea4335',
        borderWidth: 1
      },
      {
        label: 'Series 3',
        data: [2, 2, 3, 5],
        backgroundColor: '#fbbc04',
        borderColor: '#fbbc04',
        borderWidth: 1
      }
    ]
  });

  const [chartOptions, setChartOptions] = useState({
    title: 'Chart Title',
    showLegend: true,
    legendPosition: 'bottom' as const,
    showGrid: true,
    showAxes: true,
    xAxisLabel: '',
    yAxisLabel: '',
    showDataLabels: false,
    chartStyle: 'style1'
  });

  if (!isOpen) return null;

  const chartTypes = [
    { id: 'column', name: 'Column', icon: '📊', description: 'Vertical bars to compare values' },
    { id: 'bar', name: 'Bar', icon: '📊', description: 'Horizontal bars to compare values' },
    { id: 'line', name: 'Line', icon: '📈', description: 'Show trends over time' },
    { id: 'pie', name: 'Pie', icon: '🥧', description: 'Show proportions of a whole' },
    { id: 'doughnut', name: 'Doughnut', icon: '🍩', description: 'Pie chart with hollow center' },
    { id: 'area', name: 'Area', icon: '📉', description: 'Line chart with filled area' },
    { id: 'scatter', name: 'Scatter', icon: '⚬', description: 'Show correlation between variables' },
    { id: 'radar', name: 'Radar', icon: '🎯', description: 'Compare multiple variables' }
  ];

  const handleCreate = () => {
    onCreateChart(selectedChartType, chartData, chartOptions);
    onClose();
  };

  const handleDataChange = (rowIndex: number, colIndex: number, value: string) => {
    const newData = { ...chartData };
    
    if (rowIndex === -1) {
      // Editing labels
      newData.labels[colIndex] = value;
    } else {
      // Editing dataset values
      const numValue = parseFloat(value) || 0;
      newData.datasets[rowIndex].data[colIndex] = numValue;
    }
    
    setChartData(newData);
  };

  const handleSeriesNameChange = (index: number, name: string) => {
    const newData = { ...chartData };
    newData.datasets[index].label = name;
    setChartData(newData);
  };

  const addCategory = () => {
    const newData = { ...chartData };
    newData.labels.push(`Category ${newData.labels.length + 1}`);
    newData.datasets.forEach(dataset => {
      dataset.data.push(0);
    });
    setChartData(newData);
  };

  const addSeries = () => {
    const colors = ['#4285f4', '#ea4335', '#fbbc04', '#34a853', '#9333ea', '#ec4899'];
    const newData = { ...chartData };
    const seriesIndex = newData.datasets.length;
    const color = colors[seriesIndex % colors.length];
    
    newData.datasets.push({
      label: `Series ${seriesIndex + 1}`,
      data: new Array(newData.labels.length).fill(0),
      backgroundColor: color,
      borderColor: color,
      borderWidth: 1
    });
    setChartData(newData);
  };

  const removeCategory = (index: number) => {
    if (chartData.labels.length <= 1) return;
    const newData = { ...chartData };
    newData.labels.splice(index, 1);
    newData.datasets.forEach(dataset => {
      dataset.data.splice(index, 1);
    });
    setChartData(newData);
  };

  const removeSeries = (index: number) => {
    if (chartData.datasets.length <= 1) return;
    const newData = { ...chartData };
    newData.datasets.splice(index, 1);
    setChartData(newData);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content chart-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Insert Chart</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        
        <div className="modal-body">
          {!showDataEditor ? (
            <>
              {/* Chart Type Selection */}
              <div className="form-group">
                <label>Select Chart Type</label>
                <div className="chart-types-grid">
                  {chartTypes.map(type => (
                    <div
                      key={type.id}
                      className={`chart-type-card ${selectedChartType === type.id ? 'selected' : ''}`}
                      onClick={() => setSelectedChartType(type.id)}
                    >
                      <div className="chart-icon">{type.icon}</div>
                      <div className="chart-name">{type.name}</div>
                      <div className="chart-description">{type.description}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Chart Options */}
              <div className="form-group">
                <label>Chart Title</label>
                <input
                  type="text"
                  value={chartOptions.title}
                  onChange={(e) => setChartOptions({ ...chartOptions, title: e.target.value })}
                  placeholder="Enter chart title"
                />
              </div>

              <div className="form-group">
                <label>Chart Style</label>
                <select
                  value={chartOptions.chartStyle}
                  onChange={(e) => setChartOptions({ ...chartOptions, chartStyle: e.target.value })}
                >
                  <option value="style1">Style 1 - Classic</option>
                  <option value="style2">Style 2 - Modern</option>
                  <option value="style3">Style 3 - Colorful</option>
                  <option value="style4">Style 4 - Monochrome</option>
                  <option value="style5">Style 5 - Gradient</option>
                </select>
              </div>

              <div className="form-group">
                <label>Options</label>
                <div className="chart-options">
                  <label className="checkbox-option">
                    <input
                      type="checkbox"
                      checked={chartOptions.showLegend}
                      onChange={(e) => setChartOptions({ ...chartOptions, showLegend: e.target.checked })}
                    />
                    <span>Show Legend</span>
                  </label>
                  <label className="checkbox-option">
                    <input
                      type="checkbox"
                      checked={chartOptions.showGrid}
                      onChange={(e) => setChartOptions({ ...chartOptions, showGrid: e.target.checked })}
                    />
                    <span>Show Grid</span>
                  </label>
                  <label className="checkbox-option">
                    <input
                      type="checkbox"
                      checked={chartOptions.showDataLabels}
                      onChange={(e) => setChartOptions({ ...chartOptions, showDataLabels: e.target.checked })}
                    />
                    <span>Show Data Labels</span>
                  </label>
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Data Editor */}
              <div className="chart-data-editor">
                <h3>Edit Chart Data</h3>
                <div className="data-table-wrapper">
                  <table className="chart-data-table">
                    <thead>
                      <tr>
                        <th></th>
                        {chartData.labels.map((label, index) => (
                          <th key={index}>
                            <input
                              type="text"
                              value={label}
                              onChange={(e) => handleDataChange(-1, index, e.target.value)}
                              className="category-input"
                            />
                            <button
                              className="remove-btn"
                              onClick={() => removeCategory(index)}
                              title="Remove category"
                            >
                              ×
                            </button>
                          </th>
                        ))}
                        <th>
                          <button className="add-category-btn" onClick={addCategory}>+</button>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {chartData.datasets.map((dataset, rowIndex) => (
                        <tr key={rowIndex}>
                          <td>
                            <input
                              type="text"
                              value={dataset.label}
                              onChange={(e) => handleSeriesNameChange(rowIndex, e.target.value)}
                              className="series-input"
                            />
                            <button
                              className="remove-btn"
                              onClick={() => removeSeries(rowIndex)}
                              title="Remove series"
                            >
                              ×
                            </button>
                          </td>
                          {dataset.data.map((value, colIndex) => (
                            <td key={colIndex}>
                              <input
                                type="number"
                                step="0.1"
                                value={value}
                                onChange={(e) => handleDataChange(rowIndex, colIndex, e.target.value)}
                                className="data-input"
                              />
                            </td>
                          ))}
                          <td></td>
                        </tr>
                      ))}
                      <tr>
                        <td>
                          <button className="add-series-btn" onClick={addSeries}>+ Add Series</button>
                        </td>
                        <td colSpan={chartData.labels.length + 1}></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="modal-footer">
          {showDataEditor && (
            <button 
              className="btn-secondary" 
              onClick={() => setShowDataEditor(false)}
            >
              ← Back to Chart Type
            </button>
          )}
          {!showDataEditor && (
            <button 
              className="btn-secondary" 
              onClick={() => setShowDataEditor(true)}
            >
              Edit Data →
            </button>
          )}
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={handleCreate}>Insert Chart</button>
        </div>
      </div>
    </div>
  );
};

export default ChartModal;