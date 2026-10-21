import { matrixSuite } from './helpers/matrix-suite';

// Default CI: 30-image stratified sample × every preset spec (SPEC 14.1), shard 3 of 3.
matrixSuite(false, 2, 3);
