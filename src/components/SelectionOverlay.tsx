/**
 * Selection overlay component that renders marching ants selection rectangle.
 */
import { useEffect, useRef } from 'react';
import { Graphics } from 'pixi.js';
import { Viewport } from 'pixi-viewport';
import { useSelectionStore, selectSelection, selectIsDragging } from '../stores/selectionStore';
import { useMapStore } from '../stores/mapStore';

const SELECTION_COLOR = 0x4a90d9;
const FLOATING_COLOR = 0x90d94a;
const DASH_LENGTH = 8;
const ANIMATION_SPEED = 100; // ms per frame

interface SelectionOverlayProps {
  viewport: Viewport | null;
}

export function SelectionOverlay({ viewport }: SelectionOverlayProps) {
  const graphicsRef = useRef<Graphics | null>(null);
  const animationRef = useRef<number>(0);
  const dashOffsetRef = useRef(0);
  
  const selection = useSelectionStore(selectSelection);
  const isDragging = useSelectionStore(selectIsDragging);
  const getSelectionBounds = useSelectionStore((s) => s.getSelectionBounds);
  const { map } = useMapStore();
  
  useEffect(() => {
    if (!viewport || !map) return;
    
    const graphics = new Graphics();
    graphics.zIndex = 1000; // Above all layers
    viewport.addChild(graphics);
    graphicsRef.current = graphics;
    
    // Animation loop for marching ants
    let lastTime = 0;
    const animate = (time: number) => {
      if (time - lastTime > ANIMATION_SPEED) {
        dashOffsetRef.current = (dashOffsetRef.current + 1) % (DASH_LENGTH * 2);
        lastTime = time;
        renderSelection();
      }
      animationRef.current = requestAnimationFrame(animate);
    };
    animationRef.current = requestAnimationFrame(animate);
    
    return () => {
      cancelAnimationFrame(animationRef.current);
      graphics.destroy();
      graphicsRef.current = null;
    };
  }, [viewport, map]);
  
  const renderSelection = () => {
    const graphics = graphicsRef.current;
    if (!graphics || !map) return;
    
    graphics.clear();
    
    const bounds = getSelectionBounds();
    if (!bounds) return;
    
    const { tileSize } = map;
    const x = bounds.x * tileSize;
    const y = bounds.y * tileSize;
    const width = bounds.width * tileSize;
    const height = bounds.height * tileSize;
    
    const color = selection?.floating ? FLOATING_COLOR : SELECTION_COLOR;
    
    // Draw dashed rectangle (marching ants)
    drawDashedRect(graphics, x, y, width, height, color, dashOffsetRef.current);
    
    // If floating, also render the tile preview background
    if (selection?.floating) {
      graphics.rect(x, y, width, height).fill({ color: color, alpha: 0.2 });
    }
  };
  
  // Re-render when selection changes
  useEffect(() => {
    renderSelection();
  }, [selection, isDragging, map]);
  
  return null;
}

function drawDashedRect(
  graphics: Graphics,
  x: number, y: number,
  width: number, height: number,
  color: number,
  offset: number
) {
  // Top edge
  drawDashedLine(graphics, x, y, x + width, y, DASH_LENGTH, DASH_LENGTH, offset, color);
  // Right edge
  drawDashedLine(graphics, x + width, y, x + width, y + height, DASH_LENGTH, DASH_LENGTH, offset, color);
  // Bottom edge
  drawDashedLine(graphics, x + width, y + height, x, y + height, DASH_LENGTH, DASH_LENGTH, offset, color);
  // Left edge
  drawDashedLine(graphics, x, y + height, x, y, DASH_LENGTH, DASH_LENGTH, offset, color);
}

function drawDashedLine(
  graphics: Graphics,
  x1: number, y1: number,
  x2: number, y2: number,
  dashLength: number, gapLength: number,
  offset: number,
  color: number
) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const length = Math.sqrt(dx * dx + dy * dy);
  
  if (length === 0) return;
  
  const unitX = dx / length;
  const unitY = dy / length;
  
  const totalDash = dashLength + gapLength;
  let pos = offset % totalDash;
  
  while (pos < length) {
    const startPos = Math.max(0, pos);
    const endPos = Math.min(length, pos + dashLength);
    
    if (endPos > startPos && startPos < length) {
      graphics
        .moveTo(x1 + unitX * startPos, y1 + unitY * startPos)
        .lineTo(x1 + unitX * endPos, y1 + unitY * endPos)
        .stroke({ width: 2, color, alpha: 1 });
    }
    
    pos += totalDash;
  }
}
