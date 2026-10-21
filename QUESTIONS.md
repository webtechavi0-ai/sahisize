# Open questions and decisions

Each entry: the question, the decision taken (safest option), and what would change it.

## Q1. Spec was truncated (Appendix A.9 onward)
The spec pasted into chat was cut at 50,000 characters. Missing: the end of A.9, **A.10 (35-exam launch list)**, **A.11 (schema additions)**.

**Decision — launch list (A.10 substitute):** build presets for all 47 exams in A.2–A.9.
`published: true` for H, M and H/M confidence; `published: false` for L, M/L-with-disputed-core-sizes, and exams with no sizes.
That yields exactly 35 published:

- Banking (10): sbi-clerk, sbi-po, ibps-po, ibps-clerk, ibps-rrb-po, ibps-rrb-clerk, ibps-so, rbi-assistant, rbi-grade-b (thumb + declaration marked disputed), nabard-grade-a
- SSC/RRB (8): ssc-cgl, ssc-gd, ssc-cpo, ssc-chsl, ssc-mts, rrb-alp, rrb-group-d, rrb-ntpc
- NTA (5): neet-ug, jee-main, cuet-ug, ugc-net, csir-net
- UPSC (3): upsc-cse, nda, cds
- Teaching (3): ctet, htet, reet
- Police (1): bihar-police-constable
- State PSC (2): uppsc-pcs, mppsc
- Defence/postal/Delhi (3): iaf-agniveervayu, india-post-gds, dsssb

Hidden (12): uptet, kvs-teacher, bpsc-tre, haryana-police (sizes missing), up-police, mp-police, rajasthan-police, bpsc-cce (M/L, dims disputed), hpsc-hcs, ukpsc, rpsc-ras, indian-army-agniveer.

**Decision — schema additions (A.11 substitute):** added to the preset schema based on A.1:
- `published: boolean`, `confidence: 'H'|'M'|'L'|'H/M'|'M/L'`
- per-document `sizeNote?: {en,hi}` (e.g. "derived from 6.0×2.0 cm at 200 DPI", "Notice says X, portal accepts Y — we target the safe overlap")
- per-document `disputed?: boolean`, `toVerify?: boolean`
- per-document `variant?: 'dual-language' | 'triple' | null` (Bihar/BPSC two signatures; UPSC three signatures)
- per-document `captureTip?: {en,hi}` (e.g. IAF slate)
- exam-level `liveCaptureTips?: {en,hi}[]`

Change if: the user pastes the real A.10/A.11.

## Q2. Indian Army Agniveer source URL
Truncated in the paste. Preset is hidden (L) with sourceUrl left as the joinindianarmy.nic.in homepage until verified.

## Q3. Deployment
`gh` and `wrangler` are not installed and no GitHub remote / Cloudflare account / production domain is configured. CI workflow and Cloudflare Pages config are committed; actual deploy + Search Console submission are left for the owner (see LAUNCH_CHECKLIST.md).
