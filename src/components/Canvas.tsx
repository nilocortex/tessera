/**
 * Main Canvas component with pixi-viewport for pan/zoom
 */
import { useEffect, useRef, useState } from 'react';
import { Application, useApplication } from '@pixi/react';
import { Viewport } from 'pixi-viewport';
import { useViewportStore } from '../stores';
import { TileMapRenderer } from './TileMapRenderer';

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

    // Enable interactions
    viewport
      .drag()
      .pinch()
      .wheel()
      .decelerate();

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

  // Handle resize
  useEffect(() => {
    if (viewportRef.current) {
      viewportRef.current.resize(width, height);
    }
  }, [width, height]);

  // Render TileMapRenderer inside viewport via ref
  useEffect(() => {
    if (!viewportRef.current) return;
    
    // TileMapRenderer will be added as a child
  }, []);

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
