import { describe, expect, it } from 'vitest';
import { guideForDocument, guideForTool, HINDI_KB_GUIDE, UPLOAD_GUIDE } from '../guide-links';

describe('guideForDocument', () => {
  it('links photo and signature pages to the upload guide', () => {
    expect(guideForDocument('photo')).toBe(UPLOAD_GUIDE);
    expect(guideForDocument('signature')).toBe(UPLOAD_GUIDE);
  });
  it('leaves other documents alone', () => {
    expect(guideForDocument('certificate')).toBeNull();
    expect(guideForDocument('signature-hindi')).toBeNull();
  });
});

describe('guideForTool', () => {
  it('links Hindi photo-KB tools to the Hindi KB guide', () => {
    for (const s of ['compress-image', 'compress-image-to-20kb', 'compress-image-20kb-to-50kb', 'resize-image'])
      expect(guideForTool(s, 'hi')).toBe(HINDI_KB_GUIDE);
  });
  it('never links English pages or other tools to it', () => {
    expect(guideForTool('compress-image-to-20kb', 'en')).toBeNull();
    expect(guideForTool('compress-pdf', 'hi')).toBeNull();
    expect(guideForTool('resize-image-in-cm', 'hi')).toBeNull();
  });
});
