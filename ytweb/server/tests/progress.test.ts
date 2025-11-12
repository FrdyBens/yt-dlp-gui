import { describe, expect, it } from 'vitest';
import { parseProgressLine, PROGRESS_PREFIX } from '../src/yt.js';

describe('progress parser', () => {
  it('parses template line', () => {
    const line = `${PROGRESS_PREFIX}1024:2048:50.0%:00:10:5MiB/s`;
    const parsed = parseProgressLine(line)!;
    expect(parsed.percent).toBe(50);
    expect(parsed.downloadedBytes).toBe(1024);
    expect(parsed.totalBytes).toBe(2048);
    expect(parsed.eta).toBe('00:10');
    expect(parsed.speed).toBe('5MiB/s');
  });
});
