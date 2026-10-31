import LegalLayout, { legalMetadata } from '@/components/layouts/LegalLayout';
import { CONTACT_EMAIL, ENTITY_NAME, SITE_NAME } from '@/config/site';

const legal = {
  title: 'Contact',
  description: `Contact ${SITE_NAME}: report a wrong exam size, a rejected upload, or ask a question. Email ${CONTACT_EMAIL}.`,
  path: '/contact',
};
export const metadata = legalMetadata(legal);

export default function Page() {
  return (
    <LegalLayout {...legal}>
      <p>Email us at <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>. We usually reply within 2 working days.</p>
      <ul>
        <li><strong>Portal rejected a file or a size looks wrong?</strong> Use the <a href="/report">report page</a>: it fills in the exam and document for you.</li>
        <li><strong>Privacy or data request?</strong> Write to the same address with "Privacy" in the subject. See our <a href="/privacy">privacy policy</a>.</li>
      </ul>
      <p>Please never send your photos or documents. We don't need them to fix a size.</p>
      <p>{SITE_NAME} is operated by {ENTITY_NAME}.</p>
    </LegalLayout>
  );
}
