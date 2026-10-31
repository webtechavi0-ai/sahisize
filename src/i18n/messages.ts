/**
 * Every message dictionary, statically imported. Imported ONLY by ./server.ts (server-only)
 * and by scripts/tests; never by client code (it would bundle every string).
 */
import type { Lang } from './config';
import type { Dict } from './core';
import enCommon from './messages/en/common.json';
import enUi from './messages/en/ui.json';
import enKit from './messages/en/kit.json';
import enSite from './messages/en/site.json';
import enTool from './messages/en/tool.json';
import enGuide from './messages/en/guide.json';
import hiCommon from './messages/hi/common.json';
import hiUi from './messages/hi/ui.json';
import hiKit from './messages/hi/kit.json';
import hiSite from './messages/hi/site.json';
import hiTool from './messages/hi/tool.json';
import hiGuide from './messages/hi/guide.json';

export const NAMESPACES = ['common', 'ui', 'kit', 'site', 'tool', 'guide'] as const;
export type Namespace = (typeof NAMESPACES)[number];

/** Raw dictionaries per language and namespace (Hindi NOT merged over English). */
export const RAW_MESSAGES: Record<Lang, Record<Namespace, Dict>> = {
  en: { common: enCommon, ui: enUi, kit: enKit, site: enSite, tool: enTool, guide: enGuide },
  hi: { common: hiCommon, ui: hiUi, kit: hiKit, site: hiSite, tool: hiTool, guide: hiGuide },
};
