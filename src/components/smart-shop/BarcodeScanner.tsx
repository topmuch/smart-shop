'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Camera, Keyboard, Zap, ZapOff } from 'lucide-react';
import { Html5Qrcode, Html5QrcodeSupportedFormats, Html5QrcodeScannerState } from 'html5-qrcode';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

interface BarcodeScannerProps {
  onScanDetected: (barcode: string) => void;
  isActive: boolean;
}

type ScannerMode = 'native' | 'html5qrcode';

const HTML5_QRCODE_ELEMENT_ID = 'smart-shop-html5-qr-reader';
const SCAN_THROTTLE_MS = 200;

export function BarcodeScanner({ onScanDetected, isActive }: BarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const detectorRef = useRef<BarcodeDetector | null>(null);
  const animFrameRef = useRef<number>(0);
  const html5QrcodeRef = useRef<Html5Qrcode | null>(null);
  const onScanDetectedRef = useRef(onScanDetected);
  const lastScanTimeRef = useRef<number>(0);
  const [hasCamera, setHasCamera] = useState(true);
  const [lastBarcode, setLastBarcode] = useState<string | null>(null);
  const [flashlightOn, setFlashlightOn] = useState(false);
  const [manualDialogOpen, setManualDialogOpen] = useState(false);
  const [manualBarcode, setManualBarcode] = useState('');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [scannerMode, setScannerMode] = useState<ScannerMode>('native');

  // Keep callback ref up to date
  onScanDetectedRef.current = onScanDetected;

  const stopNativeScanner = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = 0;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    detectorRef.current = null;
  }, []);

  const stopHtml5Qrcode = useCallback(async () => {
    const instance = html5QrcodeRef.current;
    if (instance) {
      try {
        const state = instance.getState();
        if (
          state === Html5QrcodeScannerState.SCANNING ||
          state === Html5QrcodeScannerState.PAUSED
        ) {
          await instance.stop();
        }
        instance.clear();
      } catch {
        // Ignore cleanup errors during teardown
      }
      html5QrcodeRef.current = null;
    }
  }, []);

  // Start/stop camera
  useEffect(() => {
    if (!isActive) {
      stopNativeScanner();
      stopHtml5Qrcode();
      setFlashlightOn(false);
      return;
    }

    let cancelled = false;

    const detectFrame = () => {
      if (!detectorRef.current || !videoRef.current) return;

      detectorRef.current
        .detect(videoRef.current)
        .then((barcodes: { rawValue: string }[]) => {
          const first = barcodes[0];
          if (first) {
            const code = first.rawValue;
            const now = Date.now();
            if (now - lastScanTimeRef.current >= SCAN_THROTTLE_MS) {
              lastScanTimeRef.current = now;
              setLastBarcode(code);
              onScanDetectedRef.current(code);
            }
          }
        })
        .catch(() => {
          // Detection error — continue scanning
        });

      animFrameRef.current = requestAnimationFrame(detectFrame);
    };

    const startWithHtml5Qrcode = async () => {
      try {
        // Ensure the target element exists in the DOM
        const targetEl = document.getElementById(HTML5_QRCODE_ELEMENT_ID);
        if (!targetEl) {
          throw new Error('Scanner container element not found');
        }

        const html5Qrcode = new Html5Qrcode(HTML5_QRCODE_ELEMENT_ID, {
          verbose: false,
          formatsToSupport: [
            Html5QrcodeSupportedFormats.EAN_13,
            Html5QrcodeSupportedFormats.EAN_8,
            Html5QrcodeSupportedFormats.UPC_A,
            Html5QrcodeSupportedFormats.UPC_E,
            Html5QrcodeSupportedFormats.CODE_128,
            Html5QrcodeSupportedFormats.CODE_39,
          ],
        });
        html5QrcodeRef.current = html5Qrcode;

        const config = {
          fps: 10,
          qrbox: { width: 250, height: 150 },
        };

        await html5Qrcode.start(
          { facingMode: 'environment' } as MediaTrackConstraints,
          config,
          (decodedText: string) => {
            const now = Date.now();
            if (now - lastScanTimeRef.current >= SCAN_THROTTLE_MS) {
              lastScanTimeRef.current = now;
              setLastBarcode(decodedText);
              onScanDetectedRef.current(decodedText);
            }
          },
          () => {
            // Expected: most frames won't contain a barcode
          }
        );

        if (cancelled) {
          await stopHtml5Qrcode();
          return;
        }

        setHasCamera(true);
        setScannerMode('html5qrcode');
      } catch (err) {
        if (cancelled) return;
        setCameraError(
          err instanceof Error
            ? err.message.includes('Permission')
              ? 'Permission caméra refusée'
              : err.message.includes('NotFound')
                ? 'Aucune caméra détectée'
                : 'Erreur d\'accès à la caméra'
            : 'Erreur d\'accès à la caméra'
        );
        setHasCamera(false);
      }
    };

    const startCamera = async () => {
      setIsStarting(true);
      setCameraError(null);

      // Check if BarcodeDetector is available
      const hasNativeDetector = 'BarcodeDetector' in window;

      if (hasNativeDetector) {
        // Native BarcodeDetector path
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: {
              facingMode: 'environment',
              width: { ideal: 1280 },
              height: { ideal: 720 },
            },
          });
          if (cancelled) {
            stream.getTracks().forEach((t) => t.stop());
            return;
          }

          streamRef.current = stream;

          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            await videoRef.current.play();
          }

          // Try to create BarcodeDetector
          try {
            detectorRef.current = new (BarcodeDetector as unknown as new (options: { formats: string[] }) => BarcodeDetector)({
              formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39', 'qr_code'],
            });
          } catch {
            detectorRef.current = null;
          }

          if (detectorRef.current) {
            setScannerMode('native');
            detectFrame();
          } else {
            // BarcodeDetector constructor failed — fall back to html5-qrcode
            // Release the stream we just opened; Html5Qrcode manages its own
            stream.getTracks().forEach((t) => t.stop());
            streamRef.current = null;
            if (videoRef.current) {
              videoRef.current.srcObject = null;
            }
            await startWithHtml5Qrcode();
            return;
          }

          setHasCamera(true);
        } catch (err) {
          if (cancelled) return;
          setCameraError(
            err instanceof Error
              ? err.message.includes('Permission')
                ? 'Permission caméra refusée'
                : err.message.includes('NotFound')
                  ? 'Aucune caméra détectée'
                  : 'Erreur d\'accès à la caméra'
              : 'Erreur d\'accès à la caméra'
          );
          setHasCamera(false);
        } finally {
          setIsStarting(false);
        }
      } else {
        // No BarcodeDetector — fall back to Html5Qrcode
        await startWithHtml5Qrcode();
        setIsStarting(false);
      }
    };

    startCamera();

    return () => {
      cancelled = true;
      stopNativeScanner();
      stopHtml5Qrcode();
    };
  }, [isActive, stopNativeScanner, stopHtml5Qrcode]);

  // Toggle flashlight
  const toggleFlashlight = async () => {
    if (scannerMode === 'native') {
      // Native mode: use direct track API
      if (!streamRef.current) return;
      const track = streamRef.current.getVideoTracks()[0];
      if (!track) return;

      try {
        const capabilities = track.getCapabilities() as { torch?: boolean };
        if (capabilities.torch) {
          const newState = !flashlightOn;
          await track.applyConstraints({
            advanced: [{ torch: newState }],
          });
          setFlashlightOn(newState);
        }
      } catch {
        // Flashlight not supported
      }
    } else if (scannerMode === 'html5qrcode') {
      // Html5Qrcode mode: use library's camera capabilities API
      const instance = html5QrcodeRef.current;
      if (!instance) return;

      try {
        const capabilities = instance.getRunningTrackCameraCapabilities();
        const torchCapability = capabilities.torchFeature();
        if (torchCapability.isSupported()) {
          const newState = !flashlightOn;
          await torchCapability.apply(newState);
          setFlashlightOn(newState);
        }
      } catch {
        // Flashlight not supported in this mode
      }
    }
  };

  // Determine if flashlight button should be shown
  const canShowFlashlight =
    (scannerMode === 'native' && streamRef.current !== null) ||
    scannerMode === 'html5qrcode';

  // Manual barcode submit
  const handleManualSubmit = () => {
    const code = manualBarcode.trim();
    if (code) {
      setLastBarcode(code);
      onScanDetected(code);
      setManualBarcode('');
      setManualDialogOpen(false);
    }
  };

  return (
    <div className="relative w-full aspect-[4/3] bg-black rounded-xl overflow-hidden" role="region" aria-label="Scanner de code-barres">
      {/* Camera video — native BarcodeDetector mode */}
      <video
        ref={videoRef}
        className={cn(
          'absolute inset-0 w-full h-full object-cover',
          (scannerMode === 'html5qrcode' || !isActive || cameraError) && 'hidden'
        )}
        playsInline
        muted
      />

      {/* Html5Qrcode camera container — fallback mode */}
      <div
        id={HTML5_QRCODE_ELEMENT_ID}
        className={cn(
          'w-full h-full',
          scannerMode !== 'html5qrcode' && 'opacity-0 pointer-events-none absolute inset-0'
        )}
      />

      {/* Scanning overlay */}
      {isActive && hasCamera && !cameraError && (
        <div className="absolute inset-0 pointer-events-none">
          {/* Corner brackets */}
          <div className="absolute top-8 left-8 h-12 w-12 border-t-2 border-l-2 border-green-500 rounded-tl-lg" />
          <div className="absolute top-8 right-8 h-12 w-12 border-t-2 border-r-2 border-green-500 rounded-tr-lg" />
          <div className="absolute bottom-8 left-8 h-12 w-12 border-b-2 border-l-2 border-green-500 rounded-bl-lg" />
          <div className="absolute bottom-8 right-8 h-12 w-12 border-b-2 border-r-2 border-green-500 rounded-br-lg" />

          {/* Scanning line animation */}
          <motion.div
            className="absolute left-12 right-12 h-0.5 bg-gradient-to-r from-transparent via-green-500 to-transparent"
            initial={{ top: '20%' }}
            animate={{ top: ['20%', '80%', '20%'] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
          />
        </div>
      )}

      {/* Loading state */}
      {isStarting && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80">
          <div className="flex flex-col items-center gap-2 text-white">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-green-500 border-t-transparent" />
            <span className="text-sm">Activation de la caméra...</span>
          </div>
        </div>
      )}

      {/* Error / no camera state */}
      {cameraError && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80">
          <div className="flex flex-col items-center gap-3 text-center p-4">
            <Camera className="h-10 w-10 text-muted-foreground" aria-hidden="true" />
            <p className="text-sm text-white">{cameraError}</p>
          </div>
        </div>
      )}

      {/* Controls overlay */}
      {isActive && (
        <div className="absolute bottom-0 left-0 right-0 flex items-center justify-center gap-3 p-4 bg-gradient-to-t from-black/60 to-transparent">
          <Button
            size="sm"
            variant="secondary"
            className="gap-2"
            onClick={() => setManualDialogOpen(true)}
            aria-label="Saisir le code-barres manuellement"
          >
            <Keyboard className="h-4 w-4" aria-hidden="true" />
            <span className="sm:hidden">Manuel</span>
            <span className="hidden sm:inline">Saisie manuelle</span>
          </Button>

          {canShowFlashlight && (
            <Button
              size="sm"
              variant="secondary"
              className="gap-2"
              onClick={toggleFlashlight}
              aria-label={flashlightOn ? 'Désactiver le flash' : 'Activer le flash'}
            >
              {flashlightOn ? (
                <ZapOff className="h-4 w-4" aria-hidden="true" />
              ) : (
                <Zap className="h-4 w-4" aria-hidden="true" />
              )}
              <span className="hidden sm:inline">
                {flashlightOn ? 'Flash OFF' : 'Flash ON'}
              </span>
            </Button>
          )}
        </div>
      )}

      {/* Last barcode display */}
      {lastBarcode && (
        <div className="absolute top-3 left-3 right-3">
          <div className="bg-black/60 backdrop-blur-sm rounded-lg px-3 py-2 text-center">
            <span className="text-green-400 text-sm font-mono">{lastBarcode}</span>
          </div>
        </div>
      )}

      {/* Manual barcode dialog */}
      <Dialog open={manualDialogOpen} onOpenChange={setManualDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Saisie manuelle</DialogTitle>
            <DialogDescription>
              Entrez le code-barres du produit manuellement.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Label htmlFor="manual-barcode">Code-barres</Label>
            <Input
              id="manual-barcode"
              value={manualBarcode}
              onChange={(e) => setManualBarcode(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleManualSubmit();
              }}
              placeholder="Ex : 3017620422003"
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button onClick={handleManualSubmit} disabled={!manualBarcode.trim()}>
              Scanner
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
