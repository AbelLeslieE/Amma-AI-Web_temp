import { mkdirSync, writeFileSync } from 'node:fs';
import { createPermissionCertificatePdf } from '../lib/permission-certificate.ts';

mkdirSync('output/pdf', { recursive: true });
writeFileSync(
  'output/pdf/amma-ai-official-rejection-certificate.pdf',
  createPermissionCertificatePdf({
    applicant: 'Kuttan',
    personality: 'Thrissur Amma',
    issuedAt: new Date('2026-09-12T09:30:00+05:30'),
    certificateId: 'AMMA-NO-20260912-001',
  }),
);
console.log('Created output/pdf/amma-ai-official-rejection-certificate.pdf');
