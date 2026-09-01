import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { App } from './App.js';

describe('App', () => {
  it('renderiza el nombre del producto', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: 'VERA SOCIALIS' })).toBeInTheDocument();
  });
});
