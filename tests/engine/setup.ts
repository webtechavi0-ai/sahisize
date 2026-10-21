// Node WASM init for engine tests (PLAN 3.8): load jsquash .wasm from node_modules via fs.
import { setWasmSource } from '@/engine/codecs';
import { installImageDataPolyfill, nodeWasmSource } from '@/engine/codecs-node';

installImageDataPolyfill();
setWasmSource(nodeWasmSource);
