import LegalLayout, { legalMetadata } from '@/components/layouts/LegalLayout';
import { SITE_NAME } from '@/config/site';

const legal = {
  title: 'Disclaimer',
  description: `${SITE_NAME} specs come from official notices where verified; others are labelled Unverified. Always check the latest notice. Not linked to any exam body.`,
  path: '/disclaimer',
  updated: '21 Oct 2026',
};
export const metadata = legalMetadata(legal);

export default function Page() {
  return (
    <LegalLayout {...legal}>
      <p><strong>Specs are taken from official notifications where we could verify them; specs from secondary sources are labelled "Unverified". Always check the latest notice. Not affiliated with any exam body or government.</strong></p>
      <ul>
        <li>Every exam page shows the notification it uses, a link to the source and the date we last checked it. See all of them on the <a href="/sources">sources page</a>.</li>
        <li>Some notices give only a physical size (for example 6.0×2.0 cm). We convert it to pixels at the stated DPI (or 200 DPI when none is stated) and say so next to the size.</li>
        <li>When a notice contradicts itself or the portal, we target the range that satisfies both and explain it in a note.</li>
        <li>Sizes marked "Size to verify" are not confirmed yet. Check your notice before uploading them.</li>
        <li>Exam names and abbreviations belong to their respective bodies and are used only to describe which form a size applies to.</li>
      </ul>
      <p>Found a mistake? <a href="/report">Report it</a> and we'll re-check the notice.</p>
    </LegalLayout>
  );
}
