import { matrixSuite } from './helpers/matrix-suite';

// FULL_CORPUS=1 (npm run test:corpus): >= 300 images × every preset spec, shard 7 of 8.
matrixSuite(true, 6, 8);
