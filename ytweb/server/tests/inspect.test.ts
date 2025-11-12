import { describe, expect, it } from 'vitest';
import { detectBinaries, inspectUrl } from '../src/yt.js';

describe('yt-dlp inspect smoke', () => {
  it('fetches metadata when yt-dlp is installed', async () => {
    const binaries = await detectBinaries();
    if (!binaries.ytDlpVersion) {
      console.warn('yt-dlp missing, skipping smoke test');
      return;
    }
    const info = await inspectUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    expect(info.data).toHaveProperty('title');
    expect(info.data).toHaveProperty('id');
  }, 30_000);
});
