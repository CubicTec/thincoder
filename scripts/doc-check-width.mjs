/**
 * doc-check-width.mjs — 再出口缝（**零逻辑**）。
 * 判据实现单源 = `thincoder-core/doc-check/width.mjs`（权威 = `docs/core/design/DOC-DISCIPLINE.md` §3.20 条目 S）。
 * 本档只逐名再出口：盘上不留第二份谓词实现；判据口径 / 域 / 豁免族一律随产品档位。
 */
export { discoverDomains, scanDomain, isTableRow, fenceMark, isFenceLine, isQuoteLine, isZoneHead, isExecutableLine, inCodeSpan, checkDocWidths } from "../thincoder-core/doc-check/width.mjs";
