import React, { useRef, useEffect, useState } from 'react';

// Make jsQR available in the component
declare const jsQR: any;

interface QRScannerProps {
  onScan: (data: string | null) => void;
}

export const QRScanner: React.FC<QRScannerProps> = ({ onScan }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // Fix: Initialize useRef with null to satisfy TypeScript's type requirements for a ref that will hold a number.
  const animationFrameId = useRef<number | null>(null);
  const [status, setStatus] = useState('Requesting camera access...');

  const tick = () => {
    if (videoRef.current && videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');

      canvas.height = video.videoHeight;
      canvas.width = video.videoWidth;
      
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: "dontInvert",
        });

        if (code) {
            // Found a QR code
            onScan(code.data);
            return; // Stop the loop
        }
      }
    }
    animationFrameId.current = requestAnimationFrame(tick);
  };

  useEffect(() => {
    let active = true;
    let mediaStream: MediaStream | null = null;
    
    const startCamera = async () => {
      try {
        mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' }
        });
        if (!active) {
            mediaStream.getTracks().forEach(track => track.stop());
            return;
        }
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
          videoRef.current.setAttribute("playsinline", "true"); // Required for iOS
          videoRef.current.play();
          animationFrameId.current = requestAnimationFrame(tick);
          setStatus('Point your camera at a QR code');
        }
      } catch (err) {
        console.error("Failed to get camera stream", err);
        setStatus('Could not access camera. Please check permissions.');
      }
    };
    
    startCamera();

    return () => {
      // Cleanup: stop animation frame and camera stream
      active = false;
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
      if (mediaStream) {
        mediaStream.getTracks().forEach(track => track.stop());
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // The empty array ensures this effect runs only once on mount

  const handleClose = () => {
    onScan(null); // Pass null to indicate cancellation
  };

  return (
    <div className="qr-scanner-overlay" onClick={handleClose}>
      <div className="qr-scanner-container" onClick={(e) => e.stopPropagation()}>
        <div className="relative">
          <video ref={videoRef} className="qr-scanner-video" />
          <div className="qr-scanner-box"></div>
        </div>
        <div className="p-4 bg-gray-800 text-center">
          <p className="text-gray-300">{status}</p>
        </div>
        <button
          onClick={handleClose}
          className="absolute top-2 right-2 bg-gray-900 bg-opacity-60 rounded-full p-2 text-white hover:bg-opacity-80 transition-colors"
          aria-label="Close scanner"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <canvas ref={canvasRef} style={{ display: 'none' }} />
    </div>
  );
};