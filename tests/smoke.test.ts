import { describe, it, expect } from 'vitest';
import App from '../src/App';

describe('App smoke', () => {
  it('exports a function component', () => {
    expect(typeof App).toBe('function');
  });
});
