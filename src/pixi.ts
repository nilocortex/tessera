/**
 * PixiJS v8 extension setup for @pixi/react
 * MUST be imported before any @pixi/react components
 */
import { extend } from '@pixi/react';
import { Container, Graphics, Sprite, Text } from 'pixi.js';

// Extend @pixi/react with PixiJS components
extend({ Container, Graphics, Sprite, Text });

// Re-export for convenience
export { Container, Graphics, Sprite, Text };
