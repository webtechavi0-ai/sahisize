/**
 * Keeps EngineError (code + details) intact across the Comlink worker boundary. Comlink's
 * default 'throw' handler only keeps name/message/stack. Installed once per realm: in the worker
 * and on the main thread (api.ts).
 */
import * as Comlink from 'comlink';
import { EngineError, ENGINE_ERROR_CODES, type EngineErrorCode, type EngineErrorDetails } from './types';

interface SerializedError {
  name: string;
  message: string;
  stack?: string;
  code?: EngineErrorCode;
  details?: EngineErrorDetails;
}

type SerializedThrow = { isError: true; value: SerializedError } | { isError: false; value: unknown };

interface ThrownValue {
  value: unknown;
}

const isCode = (v: unknown): v is EngineErrorCode =>
  typeof v === 'string' && (ENGINE_ERROR_CODES as readonly string[]).includes(v);

let installed = false;

export function installErrorTransfer(): void {
  if (installed) return;
  installed = true;
  const base = Comlink.transferHandlers.get('throw');
  if (!base) return;
  const handler: Comlink.TransferHandler<ThrownValue, SerializedThrow> = {
    canHandle: (v: unknown): v is ThrownValue => base.canHandle(v),
    serialize({ value }) {
      if (value instanceof Error) {
        const e = value as Error & { code?: unknown; details?: EngineErrorDetails };
        const out: SerializedError = { name: e.name, message: e.message, stack: e.stack };
        if (isCode(e.code)) out.code = e.code;
        if (e.details) out.details = e.details;
        return [{ isError: true, value: out }, []];
      }
      return [{ isError: false, value }, []];
    },
    deserialize(s) {
      if (s.isError) {
        const v = s.value;
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
