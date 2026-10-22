/** Copy for T8 passport photo sheet, T9 batch compress and T10 custom preset (EN). */
import type { ToolCopy } from './types';

export function photoSheetCopy(): ToolCopy {
  return {
    title: 'Passport Photo Sheet: 4–16 Copies on A4 or 4×6, 300 DPI',
    description:
      'Make a printable sheet of passport-size photos (35×45 mm) with cut lines: 4 copies on 4×6 in photo paper or up to 16 on A4, at 300 DPI. Made on your device.',
    h1: 'Passport photo sheet (print at home or a shop)',
    intro: 'Crop your photo once and get a print-ready sheet of passport-size copies with cut lines. Print it on 4×6 photo paper or A4 for a fraction of the studio price.',
    steps: [
      { name: 'Add a photo', text: 'Use a recent front-facing photo against a plain light background, taken in daylight.' },
      { name: 'Crop to the face guide', text: 'Fit your face inside the oval and put your eyes on the yellow line. The frame is locked to 35×45 mm.' },
      { name: 'Choose paper and copies', text: '4×6 in photo paper holds 4 passport photos; A4 holds 8, 12 or 16. Pick PDF to print, or JPG for a photo kiosk.' },
      { name: 'Print at 100%', text: 'Download the sheet and print it at actual size (100%, no "fit to page"), then cut along the grey lines.' },
    ],
    faq: [
      { q: 'What size is a passport-size photo?', a: 'For Indian forms it usually means 35 mm wide by 45 mm high (3.5×4.5 cm), which is the default here, with the face taking up about 70–80% of the height. Some visa and overseas passport applications ask for 51×51 mm (2×2 inch) instead, which is also included. These are common sizes, not an official Passport Seva specification; check what your form or embassy asks for.' },
      { q: 'Why can I pick only 4 copies on 4×6 paper?', a: 'With margins and cutting gaps, six 35×45 mm photos fit on a 4×6 in sheet, so the closest choice is 4. Choose A4 for 8, 12 or 16 copies.' },
      { q: 'Will the print be the right size?', a: 'Yes, as long as you print at 100% (actual size). The sheet is made at 300 DPI, so each copy prints at exactly 35×45 mm and stays sharp.' },
      { q: 'PDF or JPG?', a: 'PDF prints at the exact size from any printer. JPG is handy for photo kiosks and shops that print 4×6 pictures from a phone.' },
      { q: 'Is my photo uploaded?', a: 'No. The sheet is made in your browser, on your device.' },
    ],
    sections: [
      {
        h2: 'Getting a photo that is accepted',
        paras: [
          'Most forms and offices want a recent colour photo with a plain white or light background, the face looking straight at the camera, eyes open, no cap or dark glasses, and even light without shadows on the face or background. Ears visible is preferred. Avoid filters and beauty modes; they can make the photo look unlike you.',
          'If you need the photo as a file for an online form rather than a print, use your exam’s kit or the Compress image tool instead; they hit the exact pixels and KB the portal checks.',
        ],
        links: [
          { href: '/tools/compress-image-to-50kb', label: 'Photo to 50 KB' },
          { href: '/tools/resize-image', label: 'Resize image' },
        ],
      },
    ],
  };
}

export function batchCopy(): ToolCopy {
  return {
    title: 'Batch Compress Images to 20, 50 or 100 KB — Up to 20, ZIP',
    description:
      'Compress up to 20 photos or scans to the same KB size in one go, check each one, and download them all as a ZIP. Processed on your device, never uploaded.',
    h1: 'Batch compress images to the same KB',
    intro: 'Got many documents for one form? Pick up to 20 images, choose one target size, and download them together as a ZIP.',
    steps: [
      { name: 'Choose the images', text: 'Pick up to 20 JPG, PNG, WebP or HEIC files from your gallery at once.' },
      { name: 'Set the target', text: 'Choose the KB size every file must stay under, and whether the pixel size may change.' },
      { name: 'Start', text: 'Files are done one by one, each with its own pass check. Tap Stop at any time; finished files are kept.' },
      { name: 'Download the ZIP', text: 'Download all passing files in one ZIP, or any single file from its row.' },
    ],
    faq: [
      { q: 'Why one at a time and not all together?', a: 'Phones have limited memory. Processing one image at a time keeps the browser from crashing on a 3 GB phone with large photos, and lets you stop halfway.' },
      { q: 'What happens to a file that fails?', a: 'It is marked with the reason, for example too detailed for the target. The others still finish. Try that one again with a higher target or with downscaling allowed.' },
      { q: 'What is inside the ZIP?', a: 'Each compressed JPG named after the original with the target added, such as marksheet-100kb.jpg, plus a small README listing the sizes.' },
      { q: 'Are the files uploaded for processing?', a: 'No. Everything, including making the ZIP, happens in your browser.' },
    ],
    sections: [
      {
        h2: 'When batch compress helps',
        paras: [
          'Some forms need several documents at the same limit: mark sheets, caste and income certificates, experience letters or ID proofs, often 100 KB or 200 KB each as JPG. Instead of compressing them one by one, add them all here. Each file still gets the same treatment as the single tool: the highest quality that lands between 90% and 100% of your target.',
          'For a photo, signature or thumb impression with fixed pixels, use your exam’s kit instead, so each document gets its own rules.',
        ],
        links: [
          { href: '/tools/compress-image', label: 'Compress one image' },
          { href: '/tools/images-to-pdf', label: 'Images to PDF' },
        ],
      },
    ],
  };
}

export function customPresetCopy(): ToolCopy {
  return {
    title: 'Custom Size Preset: Any Pixels, KB Range and DPI — Shareable Link',
    description:
      'Set any width, height, minimum and maximum KB, DPI and format for your form, fit your photo to it, and share the settings as a link.',
    h1: 'Custom size (any px, KB, DPI)',
    intro: 'Type the exact rules from your form. The link updates as you type, so you can share the same settings with friends applying to the same form.',
    steps: [
      { name: 'Enter the rules', text: 'Width and height in pixels (or leave them empty for a KB-only rule), minimum and maximum KB, DPI and format.' },
      { name: 'Add your image', text: 'Take a photo or choose one. It stays on your device.' },
      { name: 'Crop and auto-fit', text: 'The crop box is locked to your width and height. Tap Auto-fit to hit the pixels and the KB range.' },
      { name: 'Download and share', text: 'Download when all checks pass. Copy the link to send the same rules to someone else.' },
    ],
    faq: [
      { q: 'What does the shared link contain?', a: 'Only the rules: width, height, minimum and maximum KB, DPI and format, for example ?w=200&h=230&min=20&max=50&dpi=200&fmt=jpg. Never your photo or name.' },
      { q: 'What if my form gives the size in cm?', a: 'Convert it first: pixels = cm ÷ 2.54 × DPI. At 200 DPI, 3.5 × 4.5 cm is 276 × 354 px. The Resize tool does this for you.' },
      { q: 'Can I leave the pixel size empty?', a: 'Yes. With no width and height the photo keeps your crop’s shape and only the KB range is applied, like NTA forms that give only a size in KB.' },
      { q: 'Why is a minimum KB useful?', a: 'Some portals reject files that are too small. With a minimum set, the file never goes below it; we add quality or invisible padding if needed.' },
    ],
    sections: [
      {
        h2: 'Before you use a custom size',
        paras: [
          'Check whether your exam already has a ready kit: it includes the official sizes, the source notice and rejection tips, and handles every document in one go. Use custom rules for forms we do not cover yet, such as a university, a recruitment drive or a scholarship portal.',
          'Read the notice carefully: "maximum 50 KB" and "50 KB to 100 KB" are different rules, and some notices give pixels for width × height in the opposite order.',
        ],
        links: [
          { href: '/exams', label: 'All exams' },
          { href: '/tools/resize-image', label: 'Resize with cm and DPI' },
        ],
      },
    ],
  };
}
