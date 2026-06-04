import { describe, it, expect } from '@jest/globals';
import { mockTranscribe } from '../mockTranscribe';

describe('mockTranscribe', () => {
  it('returns the expected mock transcript string', () => {
    const result = mockTranscribe();
    expect(result).toBe('This is a simulated transcript of your audio file.');
  });

  it('returns a non-empty string', () => {
    const result = mockTranscribe();
    expect(result).toBeTruthy();
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });

  it('returns consistent output on multiple calls', () => {
    const result1 = mockTranscribe();
    const result2 = mockTranscribe();
    expect(result1).toBe(result2);
  });
});