'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import {
  Plus,
  Trash2,
  Save,
  Eye,
  EyeOff,
  MousePointer,
  Square,
  Move,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';

interface Zone {
  id: string;
  fieldName: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
}

interface TemplateEditorProps {
  imageUrl: string;
  initialZones?: Zone[];
  availableFields: { name: string; label: string }[];
  onSave: (zones: Zone[]) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

const zoneColors = [
  '#3B82F6', // blue
  '#10B981', // green
  '#F59E0B', // amber
  '#EF4444', // red
  '#8B5CF6', // purple
  '#EC4899', // pink
  '#14B8A6', // teal
  '#F97316', // orange
];

export function TemplateEditor({
  imageUrl,
  initialZones = [],
  availableFields,
  onSave,
  onCancel,
  isLoading = false,
}: TemplateEditorProps) {
  const t = useTranslations('ocr');
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  const [zones, setZones] = useState<Zone[]>(initialZones);
  const [selectedZone, setSelectedZone] = useState<string | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawStart, setDrawStart] = useState({ x: 0, y: 0 });
  const [currentDraw, setCurrentDraw] = useState<Zone | null>(null);
  const [tool, setTool] = useState<'select' | 'draw'>('draw');
  const [showZones, setShowZones] = useState(true);
  const [scale, setScale] = useState(1);
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [pendingFieldName, setPendingFieldName] = useState<string>('');

  // Get unused fields
  const usedFields = zones.map((z) => z.fieldName);
  const unusedFields = availableFields.filter(
    (f) => !usedFields.includes(f.name)
  );

  const getNextColor = useCallback(() => {
    const usedColors = zones.map((z) => z.color);
    return (
      zoneColors.find((c) => !usedColors.includes(c)) ||
      zoneColors[zones.length % zoneColors.length]
    );
  }, [zones]);

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    setImageSize({ width: img.naturalWidth, height: img.naturalHeight });
  };

  const getRelativePosition = (e: React.MouseEvent) => {
    if (!imageRef.current) return { x: 0, y: 0 };
    const rect = imageRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    return { x: Math.max(0, Math.min(100, x)), y: Math.max(0, Math.min(100, y)) };
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (tool !== 'draw' || !pendingFieldName) return;
    const pos = getRelativePosition(e);
    setIsDrawing(true);
    setDrawStart(pos);
    setCurrentDraw({
      id: `zone-${Date.now()}`,
      fieldName: pendingFieldName,
      x: pos.x,
      y: pos.y,
      width: 0,
      height: 0,
      color: getNextColor(),
    });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDrawing || !currentDraw) return;
    const pos = getRelativePosition(e);
    const width = pos.x - drawStart.x;
    const height = pos.y - drawStart.y;

    setCurrentDraw({
      ...currentDraw,
      x: width >= 0 ? drawStart.x : pos.x,
      y: height >= 0 ? drawStart.y : pos.y,
      width: Math.abs(width),
      height: Math.abs(height),
    });
  };

  const handleMouseUp = () => {
    if (!isDrawing || !currentDraw) return;
    setIsDrawing(false);

    // Only add zone if it has meaningful size
    if (currentDraw.width > 1 && currentDraw.height > 1) {
      setZones((prev) => [...prev, currentDraw]);
      setSelectedZone(currentDraw.id);
      setPendingFieldName('');
    }
    setCurrentDraw(null);
  };

  const handleZoneClick = (zoneId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (tool === 'select') {
      setSelectedZone(zoneId === selectedZone ? null : zoneId);
    }
  };

  const deleteZone = (zoneId: string) => {
    setZones((prev) => prev.filter((z) => z.id !== zoneId));
    if (selectedZone === zoneId) {
      setSelectedZone(null);
    }
  };

  const updateZoneField = (zoneId: string, fieldName: string) => {
    setZones((prev) =>
      prev.map((z) => (z.id === zoneId ? { ...z, fieldName } : z))
    );
  };

  const handleSave = () => {
    onSave(zones);
  };

  return (
    <div className="flex flex-col h-full bg-gray-100 rounded-lg overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center gap-2 p-3 bg-white border-b">
        {/* Tool Selection */}
        <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-lg">
          <button
            onClick={() => setTool('select')}
            className={`p-2 rounded transition-colors ${
              tool === 'select'
                ? 'bg-white shadow text-blue-600'
                : 'text-gray-600 hover:text-gray-800'
            }`}
            title={t('selectTool') || 'Selectie'}
          >
            <MousePointer className="w-4 h-4" />
          </button>
          <button
            onClick={() => setTool('draw')}
            className={`p-2 rounded transition-colors ${
              tool === 'draw'
                ? 'bg-white shadow text-blue-600'
                : 'text-gray-600 hover:text-gray-800'
            }`}
            title={t('drawTool') || 'Desenare'}
          >
            <Square className="w-4 h-4" />
          </button>
        </div>

        {/* Field Selection for Drawing */}
        {tool === 'draw' && (
          <select
            value={pendingFieldName}
            onChange={(e) => setPendingFieldName(e.target.value)}
            className="px-3 py-2 text-sm border rounded-md bg-white min-w-[180px]"
          >
            <option value="">
              {t('selectFieldToDraw') || 'Selecteaza campul...'}
            </option>
            {unusedFields.map((field) => (
              <option key={field.name} value={field.name}>
                {field.label}
              </option>
            ))}
          </select>
        )}

        <div className="flex-1" />

        {/* View Controls */}
        <button
          onClick={() => setShowZones(!showZones)}
          className={`p-2 rounded transition-colors ${
            showZones ? 'text-blue-600' : 'text-gray-400'
          }`}
          title={showZones ? t('hideZones') || 'Ascunde Zone' : t('showZones') || 'Arata Zone'}
        >
          {showZones ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
        </button>
        <button
          onClick={() => setScale((s) => Math.min(s + 0.25, 2))}
          className="p-2 rounded text-gray-600 hover:text-gray-800"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          onClick={() => setScale((s) => Math.max(s - 0.25, 0.5))}
          className="p-2 rounded text-gray-600 hover:text-gray-800"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <span className="text-sm text-gray-500 w-12 text-right">
          {Math.round(scale * 100)}%
        </span>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Image Canvas */}
        <div
          ref={containerRef}
          className="flex-1 overflow-auto p-4 bg-gray-200"
        >
          <div
            className="relative inline-block"
            style={{ transform: `scale(${scale})`, transformOrigin: 'top left' }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            <img
              ref={imageRef}
              src={imageUrl}
              alt="Template"
              className="max-w-none select-none"
              onLoad={handleImageLoad}
              draggable={false}
            />

            {/* Existing Zones */}
            {showZones &&
              zones.map((zone) => (
                <div
                  key={zone.id}
                  className={`absolute border-2 cursor-pointer transition-all ${
                    selectedZone === zone.id
                      ? 'ring-2 ring-offset-1 ring-blue-400'
                      : ''
                  }`}
                  style={{
                    left: `${zone.x}%`,
                    top: `${zone.y}%`,
                    width: `${zone.width}%`,
                    height: `${zone.height}%`,
                    borderColor: zone.color,
                    backgroundColor: `${zone.color}20`,
                  }}
                  onClick={(e) => handleZoneClick(zone.id, e)}
                >
                  <div
                    className="absolute -top-6 left-0 px-2 py-0.5 text-xs font-medium text-white rounded whitespace-nowrap"
                    style={{ backgroundColor: zone.color }}
                  >
                    {availableFields.find((f) => f.name === zone.fieldName)
                      ?.label || zone.fieldName}
                  </div>
                </div>
              ))}

            {/* Current Drawing */}
            {currentDraw && (
              <div
                className="absolute border-2 border-dashed"
                style={{
                  left: `${currentDraw.x}%`,
                  top: `${currentDraw.y}%`,
                  width: `${currentDraw.width}%`,
                  height: `${currentDraw.height}%`,
                  borderColor: currentDraw.color,
                  backgroundColor: `${currentDraw.color}20`,
                }}
              />
            )}
          </div>
        </div>

        {/* Zones Panel */}
        <div className="w-72 bg-white border-l overflow-y-auto">
          <div className="p-3 border-b bg-gray-50">
            <h4 className="font-medium text-gray-900">
              {t('definedZones') || 'Zone Definite'}
            </h4>
            <p className="text-xs text-gray-500 mt-1">
              {zones.length} / {availableFields.length} {t('fields') || 'campuri'}
            </p>
          </div>

          <div className="p-2 space-y-2">
            {zones.length === 0 ? (
              <div className="text-center py-8 text-gray-500 text-sm">
                <Square className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                <p>{t('noZonesYet') || 'Nicio zona definita'}</p>
                <p className="text-xs mt-1">
                  {t('drawZoneHint') || 'Selectati un camp si desenati zona'}
                </p>
              </div>
            ) : (
              zones.map((zone) => (
                <div
                  key={zone.id}
                  className={`p-3 rounded-lg border transition-all cursor-pointer ${
                    selectedZone === zone.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => setSelectedZone(zone.id)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div
                      className="w-4 h-4 rounded"
                      style={{ backgroundColor: zone.color }}
                    />
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteZone(zone.id);
                      }}
                      className="p-1 text-gray-400 hover:text-red-500"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <select
                    value={zone.fieldName}
                    onChange={(e) => updateZoneField(zone.id, e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    className="w-full px-2 py-1 text-sm border rounded bg-white"
                  >
                    {availableFields.map((field) => (
                      <option
                        key={field.name}
                        value={field.name}
                        disabled={
                          usedFields.includes(field.name) &&
                          field.name !== zone.fieldName
                        }
                      >
                        {field.label}
                      </option>
                    ))}
                  </select>
                  <div className="mt-2 text-xs text-gray-500">
                    x: {zone.x.toFixed(1)}%, y: {zone.y.toFixed(1)}%
                    <br />
                    {zone.width.toFixed(1)}% x {zone.height.toFixed(1)}%
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Footer Actions */}
      <div className="flex items-center justify-between p-3 bg-white border-t">
        <div className="text-sm text-gray-500">
          {tool === 'draw' && pendingFieldName ? (
            <span className="flex items-center gap-2">
              <Square className="w-4 h-4" />
              {t('drawingField') || 'Desenati zona pentru:'}{' '}
              <strong>
                {availableFields.find((f) => f.name === pendingFieldName)?.label}
              </strong>
            </span>
          ) : tool === 'draw' ? (
            <span className="text-yellow-600">
              {t('selectFieldFirst') || 'Selectati un camp pentru a incepe desenarea'}
            </span>
          ) : (
            <span>
              {t('selectZoneToEdit') || 'Click pe o zona pentru a o edita'}
            </span>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 disabled:opacity-50"
          >
            {t('cancel') || 'Anuleaza'}
          </button>
          <button
            onClick={handleSave}
            disabled={isLoading || zones.length === 0}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            {t('saveTemplate') || 'Salveaza Template'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default TemplateEditor;
