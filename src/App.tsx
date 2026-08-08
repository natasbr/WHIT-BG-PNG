/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Download, Film, Image as ImageIcon, Loader2, X } from 'lucide-react';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { Dropzone } from './components/Dropzone';
import { convertToWhiteBackground } from './utils/imageUtils';
import { createMp4 } from './utils/videoUtils';

export default function App() {
  const [files, setFiles] = useState<File[]>([]);
  const [timeMs, setTimeMs] = useState<number>(500);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('');

  const handleFilesDrop = (droppedFiles: File[]) => {
    // Sort files by name if possible to maintain sequence
    const sorted = [...droppedFiles].sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));
    setFiles(prev => [...prev, ...sorted]);
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const processImages = async (): Promise<Blob[]> => {
    const processed: Blob[] = [];
    for (let i = 0; i < files.length; i++) {
      setStatus(`Processing image ${i + 1} of ${files.length}...`);
      setProgress((i / files.length) * 0.5); // First 50% for image processing
      try {
        const blob = await convertToWhiteBackground(files[i]);
        processed.push(blob);
      } catch (e) {
        console.error(`Failed to process ${files[i].name}`, e);
      }
    }
    return processed;
  };

  const handleDownloadZip = async () => {
    if (files.length === 0) return;
    setIsProcessing(true);
    setProgress(0);
    setStatus('Starting image processing...');
    
    try {
      const processed = await processImages();
      
      setStatus('Creating ZIP file...');
      setProgress(0.7);
      
      const zip = new JSZip();
      processed.forEach((blob, i) => {
        zip.file(`${i + 1}.png`, blob);
      });
      
      const zipBlob = await zip.generateAsync({ 
        type: 'blob',
        onupdate: (metadata) => {
          setProgress(0.7 + (metadata.percent / 100) * 0.3);
        }
      });
      
      saveAs(zipBlob, 'processed_images.zip');
      setStatus('Done!');
      setProgress(1);
    } catch (e) {
      console.error(e);
      setStatus('An error occurred.');
    } finally {
      setTimeout(() => {
        setIsProcessing(false);
        setStatus('');
        setProgress(0);
      }, 2000);
    }
  };

  const handleDownloadMp4 = async () => {
    if (files.length === 0) return;
    setIsProcessing(true);
    setProgress(0);
    setStatus('Starting image processing...');
    
    try {
      const processed = await processImages();
      
      setStatus('Encoding video...');
      setProgress(0.5);
      
      const mp4Blob = await createMp4(processed, timeMs, (p) => {
        setProgress(0.5 + p * 0.5); // Second 50% for encoding
      });
      
      saveAs(mp4Blob, 'stop_motion.mp4');
      setStatus('Done!');
      setProgress(1);
    } catch (e) {
      console.error(e);
      setStatus('An error occurred.');
    } finally {
      setTimeout(() => {
        setIsProcessing(false);
        setStatus('');
        setProgress(0);
      }, 2000);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 p-8 font-sans">
      <div className="max-w-3xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            Batch Image Processor
          </h1>
          <p className="text-slate-600">
            Convert transparent PNG backgrounds to white, download as a ZIP or stitch them into a stop-motion video.
          </p>
        </div>

        {/* Dropzone */}
        <Dropzone onFilesDrop={handleFilesDrop} disabled={isProcessing} />

        {/* Settings and Actions */}
        {files.length > 0 && (
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-6">
            
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <ImageIcon className="w-5 h-5 text-slate-400" />
                {files.length} {files.length === 1 ? 'Image' : 'Images'} Selected
              </h2>
              <button 
                onClick={() => setFiles([])}
                disabled={isProcessing}
                className="text-sm text-red-500 hover:text-red-600 font-medium disabled:opacity-50"
              >
                Clear All
              </button>
            </div>

            {/* Frame Rate Settings */}
            <div className="space-y-3 p-4 bg-slate-50 rounded-xl border border-slate-100">
              <label htmlFor="timeMs" className="block text-sm font-medium text-slate-700">
                Time between images (for video)
              </label>
              <div className="flex items-center gap-4">
                <input 
                  id="timeMs"
                  type="range" 
                  min="50" 
                  max="2000" 
                  step="50"
                  value={timeMs}
                  onChange={(e) => setTimeMs(Number(e.target.value))}
                  disabled={isProcessing}
                  className="w-full accent-blue-600"
                />
                <span className="text-sm font-mono bg-white px-3 py-1 rounded-md border border-slate-200 shadow-sm min-w-[80px] text-center">
                  {timeMs} ms
                </span>
              </div>
              <p className="text-xs text-slate-500">
                {(1000 / timeMs).toFixed(1)} frames per second
              </p>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-4">
              <button
                onClick={handleDownloadZip}
                disabled={isProcessing}
                className="flex-1 flex items-center justify-center gap-2 bg-slate-900 text-white px-6 py-3 rounded-xl font-medium hover:bg-slate-800 focus:ring-4 focus:ring-slate-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Download className="w-5 h-5" />
                Save as ZIP
              </button>
              <button
                onClick={handleDownloadMp4}
                disabled={isProcessing}
                className="flex-1 flex items-center justify-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-xl font-medium hover:bg-blue-700 focus:ring-4 focus:ring-blue-100 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Film className="w-5 h-5" />
                Create MP4 Video
              </button>
            </div>

            {/* Progress Bar */}
            {isProcessing && (
              <div className="space-y-2 pt-4 border-t border-slate-100">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-600 font-medium flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {status}
                  </span>
                  <span className="text-slate-500 font-mono">{Math.round(progress * 100)}%</span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-blue-500 transition-all duration-300 ease-out rounded-full"
                    style={{ width: `${progress * 100}%` }}
                  />
                </div>
              </div>
            )}
            
            {/* File List Preview */}
            <div className="pt-4 border-t border-slate-100 max-h-60 overflow-y-auto">
              <div className="flex flex-wrap gap-2">
                {files.map((file, idx) => (
                  <div key={`${file.name}-${idx}`} className="group relative w-16 h-16 rounded-lg border border-slate-200 bg-slate-50 overflow-hidden">
                    <img 
                      src={URL.createObjectURL(file)} 
                      alt="" 
                      className="w-full h-full object-cover"
                      onLoad={(e) => URL.revokeObjectURL((e.target as HTMLImageElement).src)}
                    />
                    <button 
                      onClick={() => removeFile(idx)}
                      disabled={isProcessing}
                      className="absolute top-1 right-1 bg-black/50 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity disabled:hidden hover:bg-red-500"
                    >
                      <X className="w-3 h-3" />
                    </button>
                    <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-[10px] text-white px-1 truncate text-center">
                      {idx + 1}
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}
