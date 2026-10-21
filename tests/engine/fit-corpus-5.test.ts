import { matrixSuite } from './helpers/matrix-suite';

// FULL_CORPUS=1 (npm run test:corpus): >= 300 images × every preset spec, shard 5 of 8.
matrixSuite(true, 4, 8);
