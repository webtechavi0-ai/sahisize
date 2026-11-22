# SahiSize — Semrush keyword worksheet (India database)

Built 21 Nov 2026 from `src/content/presets/*.json`, `docs/routes.txt`, `docs/seo/keyword-map.md` and the SERP audit (`seo-audit-results.md`, sections serp-exams and keyword-coverage). Database: **Google India (in)**, device: mobile (most users are on phones), currency INR.

**Inventory these keywords cover**
- Presets: **47 exams, 147 documents** (signature 51, photo 36, certificate 26, thumb 17, declaration 11, other/ID 6). `season.json` is config, not an exam.
- Published (in `docs/routes.txt`): **35 exam hubs** (`/exam/<slug>`) and **118 exam-document pages** (`/exam/<slug>/<doc>`), 31 Hindi exam hubs plus 3 Hindi document pages, 60 English and 18 Hindi tool pages, 11 guides (11 in Hindi), and 2 PAN pages.
- Not published (preset only; batch `exams-unpublished` checks demand for them): Indian Army Agniveer, UP Police, Rajasthan Police, MP Police, Haryana Police, KVS Teacher, BPSC TRE, BPSC CCE, HPSC HCS, RPSC RAS, UKPSC, UPTET (12).
- Exam search names: the slug becomes the name people type ("neet", not "neet-ug"; "upsc", not "upsc-cse"; "gds" for india-post-gds; "airforce agniveer" for iaf-agniveervayu; "bihar police" for bihar-police-constable; "uppsc" for uppsc-pcs).

**Total: 692 keywords in 9 bulk batches** (none over 100). Already measured on 22 Oct (keyword-map.md §6) are most of `tools-kb`, `tools-size` and `tools-pdf`. Re-run them to refresh the numbers and fill the gaps (25/35/45 KB variants, ranges, pixel and cm sizes). The exam, document, ID and Hindi batches have **never been measured** (keyword-map marks them "vol: unknown"). Run those first.

**Run order (priority):** `exam-docs` → `exams-1` → `exams-2` → `hindi` → `id-docs` → `exams-unpublished` → `tools-pdf` → `tools-size` → `tools-kb`.

How to run: Keyword Overview → paste one batch → Database: India → Export (Excel/CSV, all columns). Keep the columns Keyword, Volume, KD %, Intent, CPC, SERP Features, Trend and Competitive Density.
Expect many long tails to come back as "n/a" or 0. That is useful too: it tells you to fold that query into the page that owns it and not build a new page for it.

---

## 1. Bulk batches for Keyword Overview

### (a) Tools and size intents
### Batch `tools-kb` — KB sizes 5–500 (22 sizes × 4 phrasings) (88 keywords)

Save as `docs/seo/semrush/overview-tools-kb.csv`

```
5 kb photo size
resize image to 5kb
photo resize 5 kb
compress image to 5kb
10 kb photo size
resize image to 10kb
photo resize 10 kb
compress image to 10kb
15 kb photo size
resize image to 15kb
photo resize 15 kb
compress image to 15kb
20 kb photo size
resize image to 20kb
photo resize 20 kb
compress image to 20kb
25 kb photo size
resize image to 25kb
photo resize 25 kb
compress image to 25kb
30 kb photo size
resize image to 30kb
photo resize 30 kb
compress image to 30kb
35 kb photo size
resize image to 35kb
photo resize 35 kb
compress image to 35kb
40 kb photo size
resize image to 40kb
photo resize 40 kb
compress image to 40kb
45 kb photo size
resize image to 45kb
photo resize 45 kb
compress image to 45kb
50 kb photo size
resize image to 50kb
photo resize 50 kb
compress image to 50kb
60 kb photo size
resize image to 60kb
photo resize 60 kb
compress image to 60kb
70 kb photo size
resize image to 70kb
photo resize 70 kb
compress image to 70kb
80 kb photo size
resize image to 80kb
photo resize 80 kb
compress image to 80kb
90 kb photo size
resize image to 90kb
photo resize 90 kb
compress image to 90kb
100 kb photo size
resize image to 100kb
photo resize 100 kb
compress image to 100kb
150 kb photo size
resize image to 150kb
photo resize 150 kb
compress image to 150kb
200 kb photo size
resize image to 200kb
photo resize 200 kb
compress image to 200kb
250 kb photo size
resize image to 250kb
photo resize 250 kb
compress image to 250kb
300 kb photo size
resize image to 300kb
photo resize 300 kb
compress image to 300kb
350 kb photo size
resize image to 350kb
photo resize 350 kb
compress image to 350kb
400 kb photo size
resize image to 400kb
photo resize 400 kb
compress image to 400kb
500 kb photo size
resize image to 500kb
photo resize 500 kb
compress image to 500kb
```

### Batch `tools-size` — ranges, MB→KB, increase KB, cm/mm/pixels, passport/stamp/postcard, signature, thumb, declaration, name & date, converter (95 keywords)

Save as `docs/seo/semrush/overview-tools-size.csv`

```
photo resizer in kb
kb resizer
image converter in kb
photo size converter in kb
image to kb
photo kb reduce
photo size reducer
image size reducer
compress image
photo compressor
10 kb to 20 kb photo size
20 kb to 50 kb photo size
photo convert into 20 kb to 50 kb jpg
50 to 100 kb photo size
photo compress 50 to 100 kb
5 kb to 10 kb photo size
20 to 30 kb photo size
30 to 50 kb photo size
100 to 200 kb photo size
photo mb to kb
photo mb to kb convert
mb to kb converter photo
2 mb photo size
1mb photo size
image size reduce mb to kb
increase image size in kb
increase kb of image
photo kb increase
image size increase in kb
increase photo size in kb
size increaser in kb
how to increase photo size in kb
signature kb increase
resize image in cm
photo resizer in cm
photo resizer in cm and kb
resize image in mm
photo resizer in mm
resize image in pixels
image resizer
photo resizer
200 x 230 pixels photo
140 x 60 pixels
6cm x 2cm in pixels
3.5 cm x 4.5 cm in pixels
413 x 531 pixels
3.5 cm x 4.5 cm
3.5 cm x 4.5 cm photo
4.5 cm x 3.5 cm photo size online free
passport size photo maker
passport size photo
passport size photo size in cm
passport size photo in cm
passport size photo pixels
passport size photo 20 kb
passport size photo sheet
stamp size photo
stamp size photo in cm
stamp size photo maker
postcard size photo
post card size photo
postcard size photo in cm
postcard size photo maker
signature resize
signature resizer
signature size
signature resize in kb
signature resize 10 to 20 kb
10kb to 20kb signature size
signature resize 20 kb
signature compressor
signature size reducer
signature resize 6cm x 2cm
signature size increase
signature resize online
signature 3.5 cm x 1.5 cm
thumb impression
left thumb impression
thumb impression resize
thumb impression size
left thumb impression size in kb
handwritten declaration
declaration handwritten
handwritten declaration size
name and date on photo
photo with name and date
add name and date in photo
passport size photo with name and date
photo date editor
image converter
heic to jpg
png to jpg
jpg converter
image to jpg
batch image compressor
```

### Batch `tools-pdf` — PDF compress to N KB, N KB PDF, JPG to PDF N KB (8 sizes × 5) + PDF generics (68 keywords)
GA winner `/tools/compress-pdf-to-400kb` is covered by the 400 rows plus "pdf compressor to 400 kb".
Save as `docs/seo/semrush/overview-tools-pdf.csv`

```
compress pdf to 50kb
50 kb pdf
pdf compressor 50 kb
jpg to pdf 50 kb
reduce pdf size to 50kb
compress pdf to 100kb
100 kb pdf
pdf compressor 100 kb
jpg to pdf 100 kb
reduce pdf size to 100kb
compress pdf to 150kb
150 kb pdf
pdf compressor 150 kb
jpg to pdf 150 kb
reduce pdf size to 150kb
compress pdf to 200kb
200 kb pdf
pdf compressor 200 kb
jpg to pdf 200 kb
reduce pdf size to 200kb
compress pdf to 250kb
250 kb pdf
pdf compressor 250 kb
jpg to pdf 250 kb
reduce pdf size to 250kb
compress pdf to 300kb
300 kb pdf
pdf compressor 300 kb
jpg to pdf 300 kb
reduce pdf size to 300kb
compress pdf to 400kb
400 kb pdf
pdf compressor 400 kb
jpg to pdf 400 kb
reduce pdf size to 400kb
compress pdf to 500kb
500 kb pdf
pdf compressor 500 kb
jpg to pdf 500 kb
reduce pdf size to 500kb
pdf compressor to 400 kb
pdf resize 100 kb
pdf resize 150 kb
pdf 200 kb converter
pdf size reducer 200 kb
photo to pdf 300 kb
image to pdf 100 kb
photo to pdf 100 kb
300 kb photo size pdf
200 kb photo size pdf
pdf resize in kb
resize pdf in kb
pdf mb to kb converter
pdf size increaser in kb
compress pdf
pdf size reducer
pdf compressor
jpg to pdf
image to pdf
multiple images to one pdf
combine certificates into one pdf
merge jpg to pdf
pdf compress below 400 kb
compress pdf 300 kb
pdf under 300 kb
certificate pdf size reduce
marksheet pdf size reduce
digilocker pdf size reduce
```


### (b) Exams × {photo size, signature size, photo size in kb, document upload size, photo and signature size}
Published exams in `season.json` priority order. The SSC/RRB rows include "photo size" on purpose: the form takes a live photo, but people still search for the photo size (that is the C2 rule in the map).
### Batch `exams-1` — published exams 1–18 (RRB NTPC to IBPS RRB PO) (90 keywords)

Save as `docs/seo/semrush/overview-exams-1.csv`

```
rrb ntpc photo size
rrb ntpc signature size
rrb ntpc photo size in kb
rrb ntpc document upload size
rrb ntpc photo and signature size
ugc net photo size
ugc net signature size
ugc net photo size in kb
ugc net document upload size
ugc net photo and signature size
csir net photo size
csir net signature size
csir net photo size in kb
csir net document upload size
csir net photo and signature size
jee main photo size
jee main signature size
jee main photo size in kb
jee main document upload size
jee main photo and signature size
ctet photo size
ctet signature size
ctet photo size in kb
ctet document upload size
ctet photo and signature size
nabard grade a photo size
nabard grade a signature size
nabard grade a photo size in kb
nabard grade a document upload size
nabard grade a photo and signature size
ssc gd photo size
ssc gd signature size
ssc gd photo size in kb
ssc gd document upload size
ssc gd photo and signature size
sbi clerk photo size
sbi clerk signature size
sbi clerk photo size in kb
sbi clerk document upload size
sbi clerk photo and signature size
ibps po photo size
ibps po signature size
ibps po photo size in kb
ibps po document upload size
ibps po photo and signature size
ssc cgl photo size
ssc cgl signature size
ssc cgl photo size in kb
ssc cgl document upload size
ssc cgl photo and signature size
ibps clerk photo size
ibps clerk signature size
ibps clerk photo size in kb
ibps clerk document upload size
ibps clerk photo and signature size
ibps rrb clerk photo size
ibps rrb clerk signature size
ibps rrb clerk photo size in kb
ibps rrb clerk document upload size
ibps rrb clerk photo and signature size
neet photo size
neet signature size
neet photo size in kb
neet document upload size
neet photo and signature size
upsc photo size
upsc signature size
upsc photo size in kb
upsc document upload size
upsc photo and signature size
nda photo size
nda signature size
nda photo size in kb
nda document upload size
nda photo and signature size
rrb group d photo size
rrb group d signature size
rrb group d photo size in kb
rrb group d document upload size
rrb group d photo and signature size
cuet photo size
cuet signature size
cuet photo size in kb
cuet document upload size
cuet photo and signature size
ibps rrb po photo size
ibps rrb po signature size
ibps rrb po photo size in kb
ibps rrb po document upload size
ibps rrb po photo and signature size
```

### Batch `exams-2` — published exams 19–35 (SBI PO to HTET) (85 keywords)

Save as `docs/seo/semrush/overview-exams-2.csv`

```
sbi po photo size
sbi po signature size
sbi po photo size in kb
sbi po document upload size
sbi po photo and signature size
rbi assistant photo size
rbi assistant signature size
rbi assistant photo size in kb
rbi assistant document upload size
rbi assistant photo and signature size
ssc chsl photo size
ssc chsl signature size
ssc chsl photo size in kb
ssc chsl document upload size
ssc chsl photo and signature size
gds photo size
gds signature size
gds photo size in kb
gds document upload size
gds photo and signature size
ssc cpo photo size
ssc cpo signature size
ssc cpo photo size in kb
ssc cpo document upload size
ssc cpo photo and signature size
rrb alp photo size
rrb alp signature size
rrb alp photo size in kb
rrb alp document upload size
rrb alp photo and signature size
cds photo size
cds signature size
cds photo size in kb
cds document upload size
cds photo and signature size
reet photo size
reet signature size
reet photo size in kb
reet document upload size
reet photo and signature size
airforce agniveer photo size
airforce agniveer signature size
airforce agniveer photo size in kb
airforce agniveer document upload size
airforce agniveer photo and signature size
bihar police photo size
bihar police signature size
bihar police photo size in kb
bihar police document upload size
bihar police photo and signature size
uppsc photo size
uppsc signature size
uppsc photo size in kb
uppsc document upload size
uppsc photo and signature size
mppsc photo size
mppsc signature size
mppsc photo size in kb
mppsc document upload size
mppsc photo and signature size
ssc mts photo size
ssc mts signature size
ssc mts photo size in kb
ssc mts document upload size
ssc mts photo and signature size
dsssb photo size
dsssb signature size
dsssb photo size in kb
dsssb document upload size
dsssb photo and signature size
ibps so photo size
ibps so signature size
ibps so photo size in kb
ibps so document upload size
ibps so photo and signature size
rbi grade b photo size
rbi grade b signature size
rbi grade b photo size in kb
rbi grade b document upload size
rbi grade b photo and signature size
htet photo size
htet signature size
htet photo size in kb
htet document upload size
htet photo and signature size
```

### Batch `exams-unpublished` — 12 preset-only exams + family/generic terms (75 keywords)
Demand check only. Before you publish any of these pages, read the official notice (accuracy risks are in keyword-map §10).
Save as `docs/seo/semrush/overview-exams-unpublished.csv`

```
agniveer photo size
agniveer signature size
agniveer photo size in kb
agniveer document upload size
agniveer photo and signature size
up police photo size
up police signature size
up police photo size in kb
up police document upload size
up police photo and signature size
rajasthan police photo size
rajasthan police signature size
rajasthan police photo size in kb
rajasthan police document upload size
rajasthan police photo and signature size
mp police photo size
mp police signature size
mp police photo size in kb
mp police document upload size
mp police photo and signature size
haryana police photo size
haryana police signature size
haryana police photo size in kb
haryana police document upload size
haryana police photo and signature size
kvs photo size
kvs signature size
kvs photo size in kb
kvs document upload size
kvs photo and signature size
bpsc tre photo size
bpsc tre signature size
bpsc tre photo size in kb
bpsc tre document upload size
bpsc tre photo and signature size
bpsc photo size
bpsc signature size
bpsc photo size in kb
bpsc document upload size
bpsc photo and signature size
hpsc hcs photo size
hpsc hcs signature size
hpsc hcs photo size in kb
hpsc hcs document upload size
hpsc hcs photo and signature size
rpsc ras photo size
rpsc ras signature size
rpsc ras photo size in kb
rpsc ras document upload size
rpsc ras photo and signature size
ukpsc photo size
ukpsc signature size
ukpsc photo size in kb
ukpsc document upload size
ukpsc photo and signature size
uptet photo size
uptet signature size
uptet photo size in kb
uptet document upload size
uptet photo and signature size
army agniveer photo size
agniveer vayu photo size
bihar police constable photo size
ssc photo size
rrb photo size
ibps photo size
ssc signature size
rrb signature size
ibps signature size
nta photo size
sarkari result photo resize
psc photo upload size
exam photo size
govt exam photo size
exam photo and signature size
```


### (c) Exam-document long tails (only documents that exist in presets)
GA winners are at the top of the list: JEE Main 10th certificate, CSIR NET result awaited, RRB NTPC SC/ST certificate, SSC CGL photo and signature.
### Batch `exam-docs` — certificates, result-awaited, SC/ST, thumb, declaration, photo ID, PwD/category, address proof (95 keywords)

Save as `docs/seo/semrush/overview-exam-docs.csv`

```
jee main 10th certificate size
jee main 10th marksheet size
jee main class 10 certificate size
jee main 10th certificate pdf size
jee main 10th certificate upload
jee main pwd certificate size
jee main id proof size
jee main photo resize
jee main photo with name and date
jee main signature size
csir net result awaited certificate format
csir net result awaited form size
csir net result awaited certificate
result awaited attestation form csir net
csir net result awaited form
csir net category certificate size
csir net obc certificate format
csir net pwd certificate size
csir net id proof size
csir net signature size
rrb ntpc sc st certificate size
rrb ntpc sc st certificate format
rrb sc st certificate free travel pass
rrb group d sc st certificate size
rrb alp sc st certificate size
rrb sc st certificate format pdf
rrb ntpc certificate upload size
rrb ntpc signature size
rrb group d signature size
rrb alp signature size
ssc cgl signature size
ssc chsl signature size
ssc cpo signature size
ssc mts signature size
ssc gd signature size
ssc gd thumb impression size
ssc live photo
ssc cgl live photo
neet 10th certificate size
neet category certificate size
neet pwd certificate size
neet address proof size
neet finger impression
thumb impression for neet
neet signature size
neet photo resizer
neet postcard size photo
postcard size photo for neet
passport size photo for neet
cuet pwd certificate size
cuet id proof size
cuet signature size
ugc net pwd certificate size
ugc net signature size
ibps po thumb impression size
ibps clerk thumb impression size
ibps rrb thumb impression size
ibps so thumb impression size
sbi clerk thumb impression size
sbi po thumb impression size
rbi assistant thumb impression size
nabard thumb impression size
left thumb impression for ibps
ibps po handwritten declaration size
ibps clerk handwritten declaration
ibps rrb handwritten declaration
ibps so handwritten declaration
sbi clerk handwritten declaration
sbi po handwritten declaration
rbi assistant handwritten declaration
rbi grade b handwritten declaration
nabard handwritten declaration
ibps handwritten declaration size
ibps po 10th certificate size
ibps clerk 10th certificate upload
ibps rrb 10th certificate size
upsc photo id card size
upsc signature three times
nda signature three times
cds photo id size
nda photo id proof size
dsssb postcard size photo
dsssb thumb impression size
dsssb left thumb impression
htet thumb impression size
airforce agniveer thumb impression size
agniveer vayu parent signature
mppsc photo with name and date
mppsc address proof size
uppsc photo with signature
reet aadhaar card size
reet 10th marksheet size
bihar police hindi signature
bihar police signature english hindi
gds signature size 2026
```


### (d) ID documents
### Batch `id-docs` — PAN photo/signature (+ NSDL/UTI variants to size the out-of-scope demand) (21 keywords)

Save as `docs/seo/semrush/overview-id-docs.csv`

```
pan card photo size
pan card signature size
pan card photo size in kb
pan card signature size in kb
pan card photo and signature size
pan card photo size in pixels
pan card photo size in cm
pan card photo resize
pan card signature resize
nsdl pan photo size
nsdl pan signature size
uti pan photo size
uti pan signature size
pan card photo 3.5 x 2.5 cm
pan card signature 2 x 4.5 cm
pan photo 20 kb
pan signature 10 kb
pan card photo upload size
पैन कार्ड फोटो साइज़
पैन कार्ड सिग्नेचर साइज़
pan card photo size kitna hona chahiye
```


### (e) Hindi and Hinglish
Semrush stores "साइज़" (with the nukta dot) and "साइज" (without it) as different keywords, so both spellings are included. Exam names stay in Latin script because that is how mixed-script searchers type them.
### Batch `hindi` — Devanagari + Hinglish (75 keywords)

Save as `docs/seo/semrush/overview-hindi.csv`

```
ssc cgl फोटो साइज़
ssc gd फोटो साइज़
ssc chsl फोटो साइज़
ssc mts फोटो साइज़
rrb ntpc फोटो साइज़
rrb group d फोटो साइज़
rrb alp फोटो साइज़
neet फोटो साइज़
jee main फोटो साइज़
ctet फोटो साइज़
ugc net फोटो साइज़
csir net फोटो साइज़
upsc फोटो साइज़
ibps po फोटो साइज़
ibps clerk फोटो साइज़
sbi clerk फोटो साइज़
bihar police फोटो साइज़
up police फोटो साइज़
agniveer फोटो साइज़
reet फोटो साइज़
ssc cgl फोटो साइज
ssc gd फोटो साइज
ssc chsl फोटो साइज
ssc mts फोटो साइज
rrb ntpc फोटो साइज
rrb group d फोटो साइज
rrb alp फोटो साइज
neet फोटो साइज
jee main फोटो साइज
ctet फोटो साइज
ssc cgl सिग्नेचर साइज़
ssc gd सिग्नेचर साइज़
ssc chsl सिग्नेचर साइज़
ssc mts सिग्नेचर साइज़
rrb ntpc सिग्नेचर साइज़
rrb group d सिग्नेचर साइज़
rrb alp सिग्नेचर साइज़
neet सिग्नेचर साइज़
jee main सिग्नेचर साइज़
ctet सिग्नेचर साइज़
फोटो साइज़
फोटो साइज
सिग्नेचर साइज़
सिग्नेचर साइज
फोटो का साइज़ कैसे कम करें
फोटो को kb में कैसे करें
फोटो 20 kb में कैसे करें
सिग्नेचर रीसाइज़
फोटो रीसाइज़
पासपोर्ट साइज़ फोटो
अंगूठे का निशान
pdf का साइज़ कैसे कम करें
एसएससी जीडी फोटो साइज़
एसएससी सीजीएल फोटो साइज़
जेईई मेन 10वीं सर्टिफिकेट साइज़
आरआरबी एनटीपीसी सिग्नेचर साइज़
photo ka size kitna hona chahiye
photo ko kb me kaise kare
photo ka kb kaise kam kare
photo ko kam kb me kaise kare
photo 20 kb me kaise kare
photo 50 kb me kaise kare
signature ko kb me kaise kare
signature ka size kaise kam kare
pdf ka size kaise kam kare
pdf ko kb me kaise kare
photo ka kb kaise badhaye
photo par name
photo par name aur date kaise likhe
photo resize kaise kare
signature resize kaise kare
ssc photo size kitna hona chahiye
neet photo size kitna hona chahiye
jee main photo size kitna hona chahiye
rrb ntpc signature size kitna hona chahiye
```


---

## 2. Keyword Magic Tool seeds (one seed per run)

Default filters for every seed: Database **India**; Match **Broad**; Volume **≥ 50** (use ≥ 20 for exam and Hindi seeds); KD **≤ 49**. Exclude words: `app, apk, download, iphone, adobe, photoshop, canva, ai, us, uk, usa, visa` (keep "visa" excluded unless you plan to build visa pages). Then run the **Questions** tab separately on each exam seed to collect FAQ material. Export each run to `docs/seo/semrush/kmt-<seed-slug>.csv`, for example `kmt-photo-size-kb.csv`.

| # | Seed | Extra include (any) | Extra exclude | Notes |
|---|---|---|---|---|
| 1 | photo size kb | — | pdf | KB family; find sizes we lack (e.g. 12, 18, 120 KB) |
| 2 | resize image to kb | — | — | |
| 3 | photo resizer | kb, cm, exam, form, online | — | head term is KD 88; filter to long tails |
| 4 | increase photo size kb | — | — | |
| 5 | photo mb to kb | — | pdf | |
| 6 | signature resize | — | — | |
| 7 | signature size | exam, kb, pixel, cm, ssc, rrb, ibps | — | |
| 8 | thumb impression | size, kb, resize, ibps, left | — | |
| 9 | handwritten declaration | ibps, sbi, rbi, nabard, size, format | fci | FCI has no preset |
| 10 | compress pdf kb | — | — | |
| 11 | jpg to pdf kb | — | — | |
| 12 | pdf size reduce | kb, mb | — | |
| 13 | passport size photo | cm, pixel, kb, size | visa, usa | |
| 14 | postcard size photo | — | — | NEET intent |
| 15 | name and date on photo | — | — | |
| 16 | photo size for exam | ssc, rrb, ibps, upsc, neet, jee, form | — | catches exams we lack |
| 17 | ssc photo size | — | — | Questions tab: live photo |
| 18 | rrb photo signature | ntpc, group d, alp | — | |
| 19 | ibps photo size | po, clerk, rrb, so | — | |
| 20 | certificate size | jee, neet, csir, rrb, cuet, ibps, 10th, sc st, category | — | GA winners' pattern |
| 21 | result awaited | csir, net, ugc | — | |
| 22 | sc st certificate | rrb, ntpc, size, format, pdf | — | |
| 23 | 10th marksheet pdf size | — | — | JEE/NEET/IBPS/REET class-10 pages |
| 24 | pan card photo size | — | — | |
| 25 | फोटो साइज़ | — | — | Volume ≥ 10; also run "photo ka size" and "kb me kaise kare" |

---

## 3. Competitors for Organic Research and Keyword Gap

All of these come from the SERP research file except where the note says otherwise. Find more with Organic Research on `sahisize.online` → **Competitors** tab and add any tool site that shares 30+ keywords with us.

**Tool competitors** (same intent: resizer or compressor). Use these in **Keyword Gap**, with sahisize.online plus the first four in one run:
| Domain | Why it matters |
|---|---|
| examdetail.in | exam-specific resizer pages (UP Police, UPSC/NDA, banking) |
| docset.in | ranks for "ssc cgl photo size", has /resize/upp-2026 |
| onlineresult.in | exam resizers, Hindi `?lang=hindi` pages |
| examoresizer.com | Agniveer / UP Police resizer pages |
| examphotoresize.pages.dev | Agniveer, UP Police |
| govtools.pages.dev | ranks for JEE 10th certificate |
| padhai.ai | UPSC/NDA, has a Hindi version |
| sarkari-pixel (find the exact domain in the SERP) | ranks for JEE 10th certificate |
| PDF tools: adobe.com (/in), signnow.com, wondershare.com, swifdoo.com, pdnob (find the domain) | top results for "compress pdf to 400 kb". Use these in Organic Research only; they are too broad for Keyword Gap. |
| Not from the SERP file: imresizer.com, pi7.org | the usual KB-resizer leaders in India. Confirm them in the Competitors tab before adding. |

**Info/news sites** (they answer "what size", they do not resize). Use them in Organic Research → Positions, filtered by `photo|signature|size|certificate|kb` to collect FAQ and long-tail ideas, but leave them out of Keyword Gap:
careers360.com, pw.live, adda247.com (+ bankersadda.com), testbook.com, practicemock.com, collegedekho.com, oliveboard.in, motion.ac.in, mahendras.org, bankbazaar.com (declaration), ibpsguide.com, careerindia.com, sciastra.com, vajiramandravi.com, visionias.in.
Skip official sites (rrb*.gov.in, nta.ac.in, csirhrdg.res.in, joinindianarmy.nic.in, uppbpb.gov.in): they hold the source PDFs and do not compete for these keywords.

---

## 4. Reports to export → `docs/seo/semrush/`

| File | Semrush report | Settings |
|---|---|---|
| `positions.csv` | Organic Research → sahisize.online → Positions | India, all positions, export all |
| `position-changes.csv` | Organic Research → Position Changes | India, last 30 days (optional) |
| `pages.csv` | Organic Research → Pages | India (optional; compare with GA winners) |
| `competitors.csv` | Organic Research → Competitors | India, export top 50 |
| `gap.csv` | Keyword Gap: sahisize.online vs examdetail.in, docset.in, onlineresult.in, examoresizer.com | India, organic; export the **Missing** and **Weak** tabs together (add a `tab` column, or save them as `gap-missing.csv` and `gap-weak.csv`) |
| `gap-info.csv` | Keyword Gap: sahisize.online vs careers360.com, pw.live, adda247.com, testbook.com | India; **Missing** tab, filtered by `size\|photo\|signature\|certificate\|kb` (optional) |
| `kmt-<seed>.csv` | Keyword Magic Tool, one file per seed in §2 | seed slug = lowercase, spaces → hyphens; Hindi seeds use a transliterated slug: `kmt-photo-saiz-hi.csv` |
| `overview-<batch>.csv` | Keyword Overview bulk, one file per batch in §1 | `overview-tools-kb.csv`, `overview-tools-size.csv`, `overview-tools-pdf.csv`, `overview-exams-1.csv`, `overview-exams-2.csv`, `overview-exams-unpublished.csv`, `overview-exam-docs.csv`, `overview-id-docs.csv`, `overview-hindi.csv` |

Export the CSV with all columns and keep the Semrush file names inside the CSVs unchanged. Write the pull date in the commit message or in a `docs/seo/semrush/README` line (for example "pulled 2026-11-2x, India, mobile"). keyword-map.md cites its data by date.
