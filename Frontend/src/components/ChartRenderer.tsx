import React, { useRef, useEffect, useState } from 'react';
import { Group, Rect, Text, Line, Wedge, Circle, Path } from 'react-konva';
import { ChartElement } from '../types';
import Konva from 'konva';

interface ChartRendererProps {
  element: ChartElement;
  isSelected: boolean;
  isDraggable: boolean;
  onSelect: (e: Konva.KonvaEventObject<MouseEvent>) => void;
  onDragMove: (e: Konva.KonvaEventObject<DragEvent>) => void;
  onDragEnd: (e: Konva.KonvaEventObject<DragEvent>) => void;
  onDoubleClick?: () => void;
}

const ChartRenderer: React.FC<ChartRendererProps> = ({
  element,
  isSelected,
  isDraggable,
  onSelect,
  onDragMove,
  onDragEnd,
  onDoubleClick
}) => {
  const x = element.x || 0;
  const y = element.y || 0;
  const width = element.width || 400;
  const height = element.height || 300;
  const { data, options, chartType } = element;

  // Calculate chart dimensions with padding
  const padding = 40;
  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2;
  const chartX = padding;
  const chartY = padding;

  // Color palette
  const defaultColors = [
    '#4285f4', '#ea4335', '#fbbc04', '#34a853', 
    '#9333ea', '#ec4899', '#f97316', '#06b6d4'
  ];

  const getColor = (index: number) => {
    const colors = options?.colors || defaultColors;
    return colors[index % colors.length];
  };

  // Find max value for scaling
  const maxValue = Math.max(
    ...data.datasets.flatMap(dataset => dataset.data)
  );

  const renderColumnChart = () => {
    const elements: React.ReactNode[] = [];
    const barWidth = chartWidth / (data.labels.length * (data.datasets.length + 1));
    const scale = chartHeight / maxValue;

    // Draw axes
    elements.push(
      <Line
        key="x-axis"
        points={[chartX, chartY + chartHeight, chartX + chartWidth, chartY + chartHeight]}
        stroke="#666"
        strokeWidth={1}
      />,
      <Line
        key="y-axis"
        points={[chartX, chartY, chartX, chartY + chartHeight]}
        stroke="#666"
        strokeWidth={1}
      />
    );

    // Draw grid lines if enabled
    if (options?.showGrid) {
      for (let i = 0; i <= 5; i++) {
        const yPos = chartY + (chartHeight / 5) * i;
        elements.push(
          <Line
            key={`grid-${i}`}
            points={[chartX, yPos, chartX + chartWidth, yPos]}
            stroke="#e0e0e0"
            strokeWidth={0.5}
            dash={[2, 2]}
          />
        );
      }
    }

    // Draw bars
    data.labels.forEach((label, categoryIndex) => {
      const categoryX = chartX + (categoryIndex * chartWidth) / data.labels.length;
      
      data.datasets.forEach((dataset, seriesIndex) => {
        const value = dataset.data[categoryIndex];
        const barHeight = value * scale;
        const barX = categoryX + barWidth * seriesIndex + barWidth / 2;
        const barY = chartY + chartHeight - barHeight;

        elements.push(
          <Rect
            key={`bar-${categoryIndex}-${seriesIndex}`}
            x={barX}
            y={barY}
            width={barWidth * 0.8}
            height={barHeight}
            fill={dataset.backgroundColor as string || getColor(seriesIndex)}
            stroke={dataset.borderColor as string || getColor(seriesIndex)}
            strokeWidth={dataset.borderWidth || 0}
          />
        );

        // Data labels
        if (options?.showDataLabels) {
          elements.push(
            <Text
              key={`label-${categoryIndex}-${seriesIndex}`}
              x={barX}
              y={barY - 5}
              width={barWidth * 0.8}
              text={value.toFixed(1)}
              fontSize={10}
              fill="#333"
              align="center"
            />
          );
        }
      });

      // Category labels
      elements.push(
        <Text
          key={`category-${categoryIndex}`}
          x={categoryX}
          y={chartY + chartHeight + 5}
          width={chartWidth / data.labels.length}
          text={label}
          fontSize={11}
          fill="#666"
          align="center"
        />
      );
    });

    return elements;
  };

  const renderLineChart = () => {
    const elements: React.ReactNode[] = [];
    const pointSpacing = chartWidth / (data.labels.length - 1);
    const scale = chartHeight / maxValue;

    // Draw axes and grid (same as column chart)
    elements.push(
      <Line
        key="x-axis"
        points={[chartX, chartY + chartHeight, chartX + chartWidth, chartY + chartHeight]}
        stroke="#666"
        strokeWidth={1}
      />,
      <Line
        key="y-axis"
        points={[chartX, chartY, chartX, chartY + chartHeight]}
        stroke="#666"
        strokeWidth={1}
      />
    );

    if (options?.showGrid) {
      for (let i = 0; i <= 5; i++) {
        const yPos = chartY + (chartHeight / 5) * i;
        elements.push(
          <Line
            key={`grid-${i}`}
            points={[chartX, yPos, chartX + chartWidth, yPos]}
            stroke="#e0e0e0"
            strokeWidth={0.5}
            dash={[2, 2]}
          />
        );
      }
    }

    // Draw lines and points for each dataset
    data.datasets.forEach((dataset, seriesIndex) => {
      const points: number[] = [];
      
      dataset.data.forEach((value, index) => {
        const xPos = chartX + index * pointSpacing;
        const yPos = chartY + chartHeight - (value * scale);
        points.push(xPos, yPos);

        // Draw point
        elements.push(
          <Circle
            key={`point-${seriesIndex}-${index}`}
            x={xPos}
            y={yPos}
            radius={3}
            fill={dataset.backgroundColor as string || getColor(seriesIndex)}
            stroke={dataset.borderColor as string || getColor(seriesIndex)}
            strokeWidth={1}
          />
        );

        // Data labels
        if (options?.showDataLabels) {
          elements.push(
            <Text
              key={`label-${seriesIndex}-${index}`}
              x={xPos - 15}
              y={yPos - 15}
              text={value.toFixed(1)}
              fontSize={10}
              fill="#333"
            />
          );
        }
      });

      // Draw line
      elements.push(
        <Line
          key={`line-${seriesIndex}`}
          points={points}
          stroke={dataset.borderColor as string || getColor(seriesIndex)}
          strokeWidth={dataset.borderWidth || 2}
          tension={dataset.tension || 0}
        />
      );
    });

    // Category labels
    data.labels.forEach((label, index) => {
      elements.push(
        <Text
          key={`category-${index}`}
          x={chartX + index * pointSpacing - 20}
          y={chartY + chartHeight + 5}
          width={40}
          text={label}
          fontSize={11}
          fill="#666"
          align="center"
        />
      );
    });

    return elements;
  };

  const renderPieChart = () => {
    const elements: React.ReactNode[] = [];
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) / 3;
    
    // Calculate total for percentages
    const total = data.datasets[0].data.reduce((sum, value) => sum + value, 0);
    let currentAngle = -90; // Start from top

    data.datasets[0].data.forEach((value, index) => {
      const percentage = value / total;
      const angle = percentage * 360;
      
      elements.push(
        <Wedge
          key={`pie-${index}`}
          x={centerX}
          y={centerY}
          radius={radius}
          angle={angle}
          rotation={currentAngle}
          fill={getColor(index)}
          stroke="#fff"
          strokeWidth={2}
        />
      );

      // Data labels
      if (options?.showDataLabels) {
        const labelAngle = currentAngle + angle / 2;
        const labelRadius = radius * 0.7;
        const labelX = centerX + Math.cos((labelAngle * Math.PI) / 180) * labelRadius;
        const labelY = centerY + Math.sin((labelAngle * Math.PI) / 180) * labelRadius;
        
        elements.push(
          <Text
            key={`pie-label-${index}`}
            x={labelX - 20}
            y={labelY - 8}
            width={40}
            text={`${(percentage * 100).toFixed(0)}%`}
            fontSize={12}
            fill="#fff"
            align="center"
          />
        );
      }

      currentAngle += angle;
    });

    // Legend for pie chart
    if (options?.showLegend) {
      const legendY = centerY + radius + 20;
      data.labels.forEach((label, index) => {
        const legendX = centerX - 80 + (index % 2) * 160;
        const legendItemY = legendY + Math.floor(index / 2) * 20;
        
        elements.push(
          <Rect
            key={`legend-box-${index}`}
            x={legendX}
            y={legendItemY}
            width={12}
            height={12}
            fill={getColor(index)}
          />,
          <Text
            key={`legend-text-${index}`}
            x={legendX + 16}
            y={legendItemY}
            text={label}
            fontSize={11}
            fill="#666"
          />
        );
      });
    }

    return elements;
  };

  const renderDoughnutChart = () => {
    const elements: React.ReactNode[] = [];
    const centerX = width / 2;
    const centerY = height / 2;
    const outerRadius = Math.min(width, height) / 3;
    const innerRadius = outerRadius * 0.5;
    
    // Calculate total for percentages
    const total = data.datasets[0].data.reduce((sum, value) => sum + value, 0);
    let currentAngle = -90; // Start from top

    data.datasets[0].data.forEach((value, index) => {
      const percentage = value / total;
      const angle = percentage * 360;
      
      elements.push(
        <Wedge
          key={`doughnut-${index}`}
          x={centerX}
          y={centerY}
          radius={outerRadius}
          innerRadius={innerRadius}
          angle={angle}
          rotation={currentAngle}
          fill={getColor(index)}
          stroke="#fff"
          strokeWidth={2}
        />
      );

      currentAngle += angle;
    });

    // Center text (total or title)
    elements.push(
      <Text
        key="center-text"
        x={centerX - 30}
        y={centerY - 8}
        width={60}
        text={total.toFixed(0)}
        fontSize={20}
        fill="#333"
        align="center"
        fontStyle="bold"
      />
    );

    return elements;
  };

  const renderChart = () => {
    switch (chartType) {
      case 'column':
        return renderColumnChart();
      case 'bar':
        // Bar chart is just horizontal column chart
        return renderColumnChart(); // TODO: Implement horizontal version
      case 'line':
        return renderLineChart();
      case 'area':
        // Area chart is line chart with fill
        return renderLineChart(); // TODO: Add area fill
      case 'pie':
        return renderPieChart();
      case 'doughnut':
        return renderDoughnutChart();
      default:
        return renderColumnChart();
    }
  };

  return (
    <Group
      x={x}
      y={y}
      draggable={isDraggable}
      onClick={onSelect}
      onDblClick={onDoubleClick}
      onDragMove={onDragMove}
      onDragEnd={onDragEnd}
      rotation={element.rotation || 0}
      opacity={element.opacity || 1}
    >
      {/* Background */}
      <Rect
        x={0}
        y={0}
        width={width}
        height={height}
        fill="#ffffff"
        stroke={isSelected ? '#4285f4' : '#e0e0e0'}
        strokeWidth={isSelected ? 2 : 1}
      />

      {/* Chart Title */}
      {options?.title && (
        <Text
          x={0}
          y={5}
          width={width}
          text={options.title}
          fontSize={options.titleFontSize || 16}
          fill="#333"
          align="center"
          fontStyle="bold"
        />
      )}

      {/* Render the chart */}
      {renderChart()}

      {/* Legend (for non-pie charts) */}
      {options?.showLegend && chartType !== 'pie' && chartType !== 'doughnut' && (
        <Group x={padding} y={height - 25}>
          {data.datasets.map((dataset, index) => (
            <Group key={`legend-${index}`} x={index * 100}>
              <Rect
                x={0}
                y={0}
                width={12}
                height={12}
                fill={dataset.backgroundColor as string || getColor(index)}
              />
              <Text
                x={16}
                y={0}
                text={dataset.label}
                fontSize={11}
                fill="#666"
              />
            </Group>
          ))}
        </Group>
      )}
    </Group>
  );
};

export default ChartRenderer;