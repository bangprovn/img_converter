/**
 * Image Processing Tests
 * Manual test file to verify WASM module loading and image conversion
 */

import { getWorkerPool } from '../workerPool';
import { convertImage } from '../imageProcessing';
import type { ImageFormat } from '../imageConverter';

/**
 * Test WASM module loading
 */
export async function testWASMLoading() {
  console.log('Testing WASM module loading...');

  try {
    const pool = await getWorkerPool();
    const status = pool.getStatus();

    console.log('✓ Worker pool initialized successfully');
    console.log('Pool status:', status);

    return true;
  } catch (error) {
    console.error('✗ Worker pool initialization failed:', error);
    return false;
  }
}

/**
 * Test basic image conversion
 */
export async function testImageConversion(file: File, targetFormat: ImageFormat) {
  console.log(`Testing conversion: ${file.name} -> ${targetFormat}`);

  try {
    const startTime = performance.now();
    const result = await convertImage(file, targetFormat, { quality: 80 });
    const endTime = performance.now();

    const duration = endTime - startTime;
    const originalSizeMB = (result.originalSize / (1024 * 1024)).toFixed(2);
    const convertedSizeMB = (result.convertedSize / (1024 * 1024)).toFixed(2);
    const compressionRatio = (
      (1 - result.convertedSize / result.originalSize) *
      100
    ).toFixed(2);

    console.log('✓ Conversion successful');
    console.log(`  Duration: ${duration.toFixed(2)}ms`);
    console.log(`  Original size: ${originalSizeMB}MB`);
    console.log(`  Converted size: ${convertedSizeMB}MB`);
    console.log(`  Compression: ${compressionRatio}%`);
    console.log(`  Dimensions: ${result.dimensions?.width}x${result.dimensions?.height}`);

    return result;
  } catch (error) {
    console.error('✗ Conversion failed:', error);
    throw error;
  }
}

/**
 * Test parallel batch conversion
 */
export async function testBatchConversion(files: File[], targetFormat: ImageFormat) {
  console.log(`Testing batch conversion: ${files.length} files -> ${targetFormat}`);

  try {
    const startTime = performance.now();

    const results = await Promise.all(
      files.map((file) => convertImage(file, targetFormat, { quality: 80 }))
    );

    const endTime = performance.now();
    const duration = endTime - startTime;

    console.log('✓ Batch conversion successful');
    console.log(`  Total duration: ${duration.toFixed(2)}ms`);
    console.log(`  Average per file: ${(duration / files.length).toFixed(2)}ms`);
    console.log(`  Files processed: ${results.length}`);

    return results;
  } catch (error) {
    console.error('✗ Batch conversion failed:', error);
    throw error;
  }
}

/**
 * Performance benchmark
 */
export async function benchmarkConversion(file: File, formats: ImageFormat[]) {
  console.log(`Benchmarking conversion for ${file.name}`);

  const results: Record<string, number> = {};

  for (const format of formats) {
    const startTime = performance.now();
    await convertImage(file, format, { quality: 80 });
    const endTime = performance.now();

    results[format] = endTime - startTime;
    console.log(`  ${format}: ${results[format].toFixed(2)}ms`);
  }

  return results;
}

/**
 * Memory usage test
 */
export async function testMemoryUsage(file: File, iterations: number = 10) {
  console.log(`Testing memory usage with ${iterations} iterations`);

  if (!('memory' in performance)) {
    console.warn('Performance.memory API not available');
    return;
  }

  const memory = (performance as any).memory;
  const initialMemory = memory.usedJSHeapSize;

  for (let i = 0; i < iterations; i++) {
    await convertImage(file, 'webp', { quality: 80 });

    if (i % 5 === 0) {
      const currentMemory = memory.usedJSHeapSize;
      const diff = currentMemory - initialMemory;
      console.log(
        `  Iteration ${i}: ${(diff / (1024 * 1024)).toFixed(2)}MB difference`
      );
    }
  }

  const finalMemory = memory.usedJSHeapSize;
  const memoryLeak = finalMemory - initialMemory;

  console.log(
    `✓ Memory test complete. Potential leak: ${(memoryLeak / (1024 * 1024)).toFixed(2)}MB`
  );

  return memoryLeak;
}

/**
 * Run all tests
 */
export async function runAllTests(testFile: File) {
  console.log('=== Starting Image Processing Tests ===\n');

  await testWASMLoading();
  console.log('');

  await testImageConversion(testFile, 'webp');
  console.log('');

  await benchmarkConversion(testFile, ['jpeg', 'png', 'webp', 'avif']);
  console.log('');

  console.log('=== All Tests Complete ===');
}
