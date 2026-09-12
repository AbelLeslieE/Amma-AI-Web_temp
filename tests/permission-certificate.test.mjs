import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createPermissionCertificatePdf,
  permissionCertificateFilename,
} from '../lib/permission-certificate.ts';

test('permission rejection downloads as a real one-page PDF', () => {
  const pdf = createPermissionCertificatePdf({
    applicant: 'Kuttan',
    personality: 'Thrissur Amma',
    issuedAt: new Date('2026-09-12T04:00:00.000Z'),
    certificateId: 'AMMA-NO-TEST-001',
  });
  const document = Buffer.from(pdf).toString('latin1');
  assert.equal(document.startsWith('%PDF-1.4'), true);
  assert.equal(document.endsWith('%%EOF\n'), true);
  assert.match(document, /OFFICIAL PERMISSION REJECTION CERTIFICATE/);
  assert.match(document, /VENDA\./);
  assert.match(document, /Kuttan/);
  assert.match(document, /Thrissur Amma/);
  assert.match(document, /AMMA-NO-TEST-001/);
  assert.ok(pdf.byteLength > 2_000);
  assert.equal(
    permissionCertificateFilename(),
    'amma-ai-official-rejection-certificate.pdf',
  );
});
