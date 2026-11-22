import LegalLayout, { legalMetadata } from '@/components/layouts/LegalLayout';
import { CONTACT_EMAIL, ENTITY_NAME, SITE_NAME } from '@/config/site';

const legal = {
  title: `Contact ${SITE_NAME}: Report a Wrong Size`,
  h1: `Contact ${SITE_NAME}`,
  description: `Contact ${SITE_NAME} to report a wrong exam size, a rejected upload or a missing exam. Tell us the exam and document; we check the notice and reply by email.`,
  path: '/contact',
};
export const metadata = legalMetadata(legal);

export default function Page() {
  return (
    <LegalLayout {...legal}>
      <p>
        Contact {SITE_NAME} by email at <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>. We
        usually reply within 2 working days. Most messages are about one of three things, and the
        fastest way to get each one fixed is below.
      </p>
      <h2>Report a wrong size or a rejected upload</h2>
      <p>
        If an exam portal rejected a file you made here, or a size on {SITE_NAME} does not match
        your notice, use the <a href="/report">report page</a>. It fills in the exam and document
        for you and opens an email you can check before sending. Please include:
      </p>
      <ul>
        <li>the exam and the document (photo, signature, thumb, declaration or certificate);</li>
        <li>the exact error message the portal showed, word for word;</li>
        <li>the page number of the official notice, if the size there is different.</li>
      </ul>
      <p>
        We re-check the notice and correct the size if it is wrong. Every size we use, and where it
        comes from, is listed on the{' '}
        <a href="/sources">sources page</a>.
      </p>
      <h2>Ask for a missing exam</h2>
      <p>
        Tell us the exam name and a link to its official notice. A size we cannot confirm in the
        official notice is labelled Unverified on the site.
      </p>
      <h2>Privacy or data requests</h2>
      <p>
        Write to the same address with &quot;Privacy&quot; in the subject. See our{' '}
        <a href="/privacy">privacy policy</a> for what we store.
      </p>
      <p>
        Please never send your photos or documents. We do not need them to fix a size, and{' '}
        {SITE_NAME} never uploads your files: everything is processed on your own device.
      </p>
      <p>
        {SITE_NAME} is operated by {ENTITY_NAME}. It is not linked to any exam body or government
        department.
      </p>
    </LegalLayout>
  );
}
