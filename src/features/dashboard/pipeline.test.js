import { describe, it, expect } from 'vitest';

import {
  ensureCsvFilesSelected,
  estimatePipelineSeconds,
  extractDashboardErrorMessage,
} from './pipeline';

describe('dashboard pipeline helpers', () => {
  it('validates upload payload presence', () => {
    expect(ensureCsvFilesSelected([])).toBe(false);
    expect(ensureCsvFilesSelected(null)).toBe(false);
    expect(ensureCsvFilesSelected([{ name: 'leads.csv', size: 1024 }])).toBe(true);
  });

  it('estimates pipeline durations by task type', () => {
    const sampleFiles = [{ size: 1024 * 1024 }];

    expect(estimatePipelineSeconds('train', sampleFiles)).toBeGreaterThanOrEqual(30);
    expect(estimatePipelineSeconds('score', sampleFiles)).toBeGreaterThanOrEqual(15);
    expect(estimatePipelineSeconds('feedback', sampleFiles)).toBeGreaterThanOrEqual(20);
  });

  it('extracts backend error message with fallback precedence', () => {
    const withBackendError = {
      response: {
        data: {
          error: { message: 'Backend says no' },
        },
      },
      message: 'Generic error',
    };
    expect(extractDashboardErrorMessage(withBackendError)).toBe('Backend says no');

    const withDetailOnly = {
      response: { data: { detail: 'Detailed backend issue' } },
      message: 'Generic error',
    };
    expect(extractDashboardErrorMessage(withDetailOnly)).toBe('Detailed backend issue');

    const noResponse = { message: 'Network timeout' };
    expect(extractDashboardErrorMessage(noResponse)).toBe('Network timeout');

    expect(extractDashboardErrorMessage({}, 'Custom fallback')).toBe('Custom fallback');
  });
});
