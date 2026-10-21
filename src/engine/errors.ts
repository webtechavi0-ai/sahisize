/**
 * Keeps EngineError (code + details) intact across the comlink worker boundary.
 * Comlink's default 'throw' handler only keeps name/message/stack.
 * Call installErrorTransfer() once in the worker and once on the main thread (api.ts).
 */
import * as Comlink from 'comlink';
import { EngineError, type EngineErrorCode, type EngineErrorDetails } from './types';

interface SerializedThrow {
  isError: boolean;
  value: unknown;
}

interface SerializedError {
  name: string;
  message: string;
  stack?: string;
  code?: EngineErrorCode;
  details?: EngineErrorDetails;
}

let installed = false;

export function installErrorTransfer(): void {
  if (installed) return;
  installed = true;
  const base = Comlink.transferHandlers.get('throw');
  if (!base) return;
  const handler: Comlink.TransferHandler<{ value: unknown }, SerializedThrow> = {
    canHandle: (v: unknown): v is { value: unknown } => base.canHandle(v),
    serialize({ value }) {
      if (value instanceof Error) {
        const e = value as Error & { code?: EngineErrorCode; details?: EngineErrorDetails };
        const out: SerializedError = { name: e.name, message: e.message, stack: e.stack };
        if (e.code) out.code = e.code;
        if (e.details) out.details = e.details;
        return [{ isError: true, value: out }, []];
      }
      return [{ isError: false, value }, []];
    },
    deserialize(s) {
      if (s.isError) {
        const v = s.value as SerializedError;
        if (v.name === 'EngineError' && v.code) {
          const err = new EngineError(v.code, v.message, v.details);
          if (v.stack) err.stack = v.stack;
          throw err;
        }
        throw Object.assign(new Error(v.message), v);
      }
      throw s.value;
    },
  };
  Comlink.transferHandlers.set('throw', handler as Comlink.TransferHandler<unknown, unknown>);
}
