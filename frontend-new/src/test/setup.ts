import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// Without globals enabled, Testing Library's automatic teardown never
// registers, so each render would stack on the previous one's DOM.
afterEach(cleanup);
