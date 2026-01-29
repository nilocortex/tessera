/**
 * Main Canvas component with pixi-viewport for pan/zoom
 * Integrates tool handlers for painting, filling, and erasing.
 */
import { useEffect, useRef, useState, useCallback } from 'react';
import { Application, useApplication } from '@pixi/react';
import { Viewport } from 'pixi-viewport';
import { useViewportStore, useMapStore, useToolStore } from '../stores';
import { useToolHandler } from '../hooks/useToolHandler';
import { TileMapRenderer } from './TileMapRenderer';
import type { Position } from '../types';

// Import pixi extensions BEFORE using @pixi/react components
import '../pixi';

interface ViewportContainerProps {
  width: number;
  height: number;
}

/**
 * Inner component that sets up the pixi-viewport
 * Must be inside Application context to access app
 */
function ViewportContainer({ width, height }: ViewportContainerProps) {
  const { app } = useApplication();
  const viewportRef = useRef<Viewport | null>(null);
  const { setZoom } = useViewportStore();
  const { map } = useMapStore();
  const activeTool = useToolStore((s) => s.activeTool);
  const { onPointerDown, onPointerMove, onPointerUp } = useToolHandler();

  // Convert screen position to tile position
  const screenToTile = useCallback(
    (screenX: number, screenY: number): Position | null => {
      const viewport = viewportRef.current;
      if (!viewport || !map) return null;

      // Get canvas bounds
      const canvas = app?.canvas;
      if (!canvas) return null;
      const rect = canvas.getBoundingClientRect();

      // Convert to local canvas coords
      const localX = screenX - rect.left;
      const localY = screenY - rect.top;

      // Transform screen coords to world coords via viewport
      const worldPos = viewport.toWorld(localX, localY);

      // Convert to tile coords
      const tileX = Math.floor(worldPos.x / map.tileSize);
      const tileY = Math.floor(worldPos.y / map.tileSize);

      // Bounds check
      if (tileX < 0 || tileX >= map.width || tileY < 0 || tileY >= map.height) {
        return null;
      }

      return { x: tileX, y: tileY };
    },
    [app, map]
  );

  // Handle pointer events
  const handlePointerDown = useCallback(
    (e: PointerEvent) => {
      if (activeTool === 'pan') return; // Let viewport handle pan

      const tilePos = screenToTile(e.clientX, e.clientY);
      if (tilePos) {
        onPointerDown(tilePos);
      }
    },
    [activeTool, screenToTile, onPointerDown]
  );

  const handlePointerMove = useCallback(
    (e: PointerEvent) => {
      if (activeTool === 'pan') return;

      const tilePos = screenToTile(e.clientX, e.clientY);
      if (tilePos) {
        onPointerMove(tilePos);
      }
    },
    [activeTool, screenToTile, onPointerMove]
  );

  const handlePointerUp = useCallback(() => {
    onPointerUp();
  }, [onPointerUp]);

  // Create and setup viewport
  useEffect(() => {
    if (!app || viewportRef.current) return;

    const viewport = new Viewport({
      screenWidth: width,
      screenHeight: height,
      worldWidth: 2000,
      worldHeight: 2000,
      events: app.renderer.events, // CRITICAL: pass renderer events
    });

    // Enable interactions - only drag when pan tool is active
    viewport.pinch().wheel().decelerate();

    // Clamp zoom to 0.25-4x
    viewport.clampZoom({
      minScale: 0.25,
      maxScale: 4,
    });

    // Sync zoom changes to store
    viewport.on('zoomed', () => {
      setZoom(viewport.scale.x);
    });

    // Add viewport to stage
    app.stage.addChild(viewport);
    viewportRef.current = viewport;

    // Cleanup on unmount
    return () => {
      viewport.destroy();
      viewportRef.current = null;
    };
  }, [app, width, height, setZoom]);

  // Toggle drag plugin based on active tool
  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    if (activeTool === 'pan') {
      viewport.drag();
    } else {
      // Disable drag for non-pan tools
      viewport.plugins.remove('drag');
    }
  }, [activeTool]);

  // Handle resize
  useEffect(() => {
    if (viewportRef.current) {
      viewportRef.current.resize(width, height);
    }
  }, [width, height]);

  // Set up event listeners on canvas
  useEffect(() => {
    const canvas = app?.canvas;
    if (!canvas) return;

    canvas.addEventListener('pointerdown', handlePointerDown);
    canvas.addEventListener('pointermove', handlePointerMove);
    canvas.addEventListener('pointerup', handlePointerUp);
    canvas.addEventListener('pointerleave', handlePointerUp);

    return () => {
      canvas.removeEventListener('pointerdown', handlePointerDown);
      canvas.removeEventListener('pointermove', handlePointerMove);
      canvas.removeEventListener('pointerup', handlePointerUp);
      canvas.removeEventListener('pointerleave', handlePointerUp);
    };
  }, [app, handlePointerDown, handlePointerMove, handlePointerUp]);

  return <TileMapRenderer viewport={viewportRef.current} />;
}

interface CanvasProps {
  width?: number;
  height?: number;
}

/**
 * Main Canvas component wrapping PixiJS Application
 */
export function Canvas({ width = 800, height = 600 }: CanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width, height });

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setDimensions({
          width: rect.width || width,
          height: rect.height || height,
        });
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [width, height]);

  return (
    <div ref={containerRef} className="canvas-container" style={{ width: '100%', height: '100%' }}>
      <Application
        width={dimensions.width}
        height={dimensions.height}
        background={0x1a1a2e}
        antialias={true}
      >
        <ViewportContainer width={dimensions.width} height={dimensions.height} />
      </Application>
    </div>
  );
}
