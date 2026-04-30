/**
 * Type declarations for the BarcodeDetector API (Shape Detection API)
 * Supported in Chrome/Edge; not available in Firefox/Safari.
 * @see https://developer.mozilla.org/en-US/docs/Web/API/BarcodeDetector
 */

interface DetectedBarcode {
  readonly boundingBox: DOMRectReadOnly;
  readonly cornerPoints: Array<{ x: number; y: number }>;
  readonly format: string;
  readonly rawValue: string;
}

interface BarcodeDetectorOptions {
  formats?: string[];
}

declare class BarcodeDetector {
  constructor(options?: BarcodeDetectorOptions);
  detect(image: ImageBitmapSource): Promise<DetectedBarcode[]>;
  static getSupportedFormats(): Promise<string[]>;
}

interface MediaTrackConstraintSet {
  torch?: boolean;
}
