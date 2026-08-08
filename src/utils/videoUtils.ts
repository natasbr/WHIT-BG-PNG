import * as Mp4Muxer from 'mp4-muxer';

export const createMp4 = async (
  processedBlobs: Blob[],
  timeMs: number,
  onProgress?: (progress: number) => void
): Promise<Blob> => {
  if (processedBlobs.length === 0) {
    throw new Error('No images to process');
  }

  const fps = 1000 / timeMs;
  
  // Get dimensions from the first image
  const firstImg = await createImageBitmap(processedBlobs[0]);
  let width = firstImg.width;
  let height = firstImg.height;
  firstImg.close();
  
  // Video dimensions must be even numbers
  width = width % 2 === 0 ? width : width - 1;
  height = height % 2 === 0 ? height : height - 1;

  const muxer = new Mp4Muxer.Muxer({
    target: new Mp4Muxer.ArrayBufferTarget(),
    video: {
      codec: 'avc',
      width: width,
      height: height,
    },
    fastStart: 'in-memory',
  });
  
  const videoEncoder = new VideoEncoder({
    output: (chunk, meta) => muxer.addVideoChunk(chunk, meta as any),
    error: (e) => console.error('VideoEncoder error:', e)
  });
  
  videoEncoder.configure({
    codec: 'avc1.42002A',
    width: width,
    height: height,
    bitrate: 5_000_000,
    framerate: fps,
  });
  
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('No canvas context');

  for (let i = 0; i < processedBlobs.length; i++) {
    const imgBitmap = await createImageBitmap(processedBlobs[i]);
    
    // Draw to canvas to ensure dimensions are correct
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(imgBitmap, 0, 0, width, height);
    
    const frame = new VideoFrame(canvas, { timestamp: (i * 1000000) / fps });
    videoEncoder.encode(frame, { keyFrame: i % Math.max(1, Math.floor(fps)) === 0 });
    
    frame.close();
    imgBitmap.close();
    
    if (onProgress) {
      onProgress((i + 1) / processedBlobs.length);
    }
  }
  
  await videoEncoder.flush();
  muxer.finalize();
  
  const buffer = muxer.target.buffer;
  return new Blob([buffer], { type: 'video/mp4' });
};
