'use client';

import { useState, useRef, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import {
  ZoomIn,
  ZoomOut,
  RotateCw,
  Move,
  Maximize2,
} from 'lucide-react';

interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
  field: string;
  confidence: number;
  value?: string;
}

interface OCRViewerProps {
  imageUrl: string;
  boundingBoxes?: BoundingBox[];
  onBoxClick?: (box: BoundingBox) => void;
  selectedField?: string;
  showConfidence?: boolean;
}

export function OCRViewer({
  imageUrl,
  boundingBoxes = [],
  onBoxClick,
  selectedField,
  showConfidence = true,
}: OCRViewerProps) {
  const t = useTranslations('ocr');
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });

  const handleZoomIn = () => setScale((prev) => Math.min(prev + 0.25, 3));
  const handleZoomOut = () => setScale((prev) => Math.max(prev - 0.25, 0.5));
  const handleRotate = () => setRotation((prev) => (prev + 90) % 360);
  const handleReset = () => {
    setScale(1);
    setRotation(0);
    setPosition({ x: 0, y: 0 });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    setImageSize({ width: img.naturalWidth, height: img.naturalHeight });
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.9) return 'border-green-500 bg-green-500/10';
    if (confidence >= 0.7) return 'border-yellow-500 bg-yellow-500/10';
    return 'border-red-500 bg-red-500/10';
  };

  const getConfidenceBadgeColor = (confidence: number) => {
    if (confidence >= 0.9) return 'bg-green-500 text-white';
    if (confidence >= 0.7) return 'bg-yellow-500 text-black';
    return 'bg-red-500 text-white';
  };

  return (
    <div className="flex flex-col h-full bg-gray-100 rounded-lg overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center gap-2 p-2 bg-white border-b">
        <button
          onClick={handleZoomIn}
          className="p-2 rounded hover:bg-gray-100 text-gray-600"
          title={t('zoomIn') || 'Zoom In'}
        >
          <ZoomIn className="w-5 h-5" />
        </button>
        <button
          onClick={handleZoomOut}
          className="p-2 rounded hover:bg-gray-100 text-gray-600"
          title={t('zoomOut') || 'Zoom Out'}
        >
          <ZoomOut className="w-5 h-5" />
        </button>
        <button
          onClick={handleRotate}
          className="p-2 rounded hover:bg-gray-100 text-gray-600"
          title={t('rotate') || 'Rotate'}
        >
          <RotateCw className="w-5 h-5" />
        </button>
        <button
          onClick={handleReset}
          className="p-2 rounded hover:bg-gray-100 text-gray-600"
          title={t('reset') || 'Reset View'}
        >
          <Maximize2 className="w-5 h-5" />
        </button>
        <div className="flex-1" />
        <span className="text-sm text-gray-500">
          {Math.round(scale * 100)}%
        </span>
      </div>

      {/* Image Container */}
      <div
        ref={containerRef}
        className="flex-1 overflow-hidden cursor-move relative"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{
            transform: `translate(${position.x}px, ${position.y}px)`,
          }}
        >
          <div
            className="relative"
            style={{
              transform: `scale(${scale}) rotate(${rotation}deg)`,
              transformOrigin: 'center center',
            }}
          >
            {/* Document Image */}
            <img
              src={imageUrl}
              alt="Document"
              className="max-w-none select-none"
              onLoad={handleImageLoad}
              draggable={false}
            />

            {/* Bounding Boxes Overlay */}
            {boundingBoxes.map((box, index) => (
              <div
                key={index}
                className={`absolute border-2 cursor-pointer transition-all ${
                  selectedField === box.field
                    ? 'border-blue-500 bg-blue-500/20 ring-2 ring-blue-400'
                    : getConfidenceColor(box.confidence)
                }`}
                style={{
                  left: `${box.x}%`,
                  top: `${box.y}%`,
                  width: `${box.width}%`,
                  height: `${box.height}%`,
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  onBoxClick?.(box);
                }}
              >
                {/* Field Label */}
                <div
                  className={`absolute -top-6 left-0 px-2 py-0.5 text-xs font-medium rounded whitespace-nowrap ${
                    selectedField === box.field
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-700 text-white'
                  }`}
                >
                  {box.field}
                  {showConfidence && (
                    <span
                      className={`ml-2 px-1.5 py-0.5 rounded text-xs ${getConfidenceBadgeColor(
                        box.confidence
                      )}`}
                    >
                      {Math.round(box.confidence * 100)}%
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Move hint */}
      <div className="flex items-center justify-center gap-2 p-2 bg-white border-t text-sm text-gray-500">
        <Move className="w-4 h-4" />
        <span>{t('dragToMove') || 'Drag to move'}</span>
      </div>
    </div>
  );
}

export default OCRViewer;
