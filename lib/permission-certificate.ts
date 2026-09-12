export type PermissionCertificateInput = {
  applicant: string;
  personality: string;
  issuedAt?: Date;
  certificateId?: string;
};

const PAGE_WIDTH = 842;
const encoder = new TextEncoder();

function safePdfText(value: string, max = 100) {
  return value
    .normalize('NFKD')
    .replace(/[^\x20-\x7e]/gu, '')
    .replace(/[\\()]/gu, (character) => `\\${character}`)
    .replace(/\s+/gu, ' ')
    .trim()
    .slice(0, max);
}

function text(
  value: string,
  x: number,
  y: number,
  size: number,
  font = 'F1',
  color = '0.20 0.20 0.17',
) {
  return `${color} rg BT /${font} ${size} Tf 1 0 0 1 ${x} ${y} Tm (${safePdfText(value)}) Tj ET`;
}

function centered(
  value: string,
  y: number,
  size: number,
  font = 'F1',
  color?: string,
) {
  const widthFactor = font === 'F1' || font === 'F3' ? 0.47 : 0.52;
  const x = Math.max(40, (PAGE_WIDTH - value.length * size * widthFactor) / 2);
  return text(value, Math.round(x), y, size, font, color);
}

function certificateNumber(date: Date) {
  const part = date.toISOString().replace(/\D/gu, '').slice(0, 14);
  return `AMMA-NO-${part}`;
}

export function permissionCertificateFilename() {
  return 'amma-ai-official-rejection-certificate.pdf';
}

export function createPermissionCertificatePdf({
  applicant,
  personality,
  issuedAt = new Date(),
  certificateId,
}: PermissionCertificateInput) {
  const name = safePdfText(applicant, 40) || 'Kuttan';
  const authority = safePdfText(personality, 40) || 'Amma';
  const issued = safePdfText(
    issuedAt.toLocaleString('en-IN', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }),
    60,
  );
  const id = safePdfText(certificateId || certificateNumber(issuedAt), 40);
  const rust = '0.73 0.27 0.13';
  const olive = '0.38 0.40 0.27';
  const beige = '0.68 0.55 0.39';
  const ink = '0.20 0.20 0.17';
  const content = [
    'q',
    '0.985 0.970 0.940 rg 0 0 842 595 re f',
    `${rust} RG 2 w 24 24 794 547 re S`,
    `${beige} RG 0.7 w 32 32 778 531 re S`,
    `${olive} RG 1 w 72 487 m 770 487 l S`,
    centered('AMMA AI', 535, 13, 'F4', rust),
    centered('DEPARTMENT OF UNNECESSARY APPROVALS', 510, 10, 'F2', olive),
    centered('OFFICIAL PERMISSION REJECTION CERTIFICATE', 455, 23, 'F3', ink),
    centered(
      'Issued under the unquestionable authority of Amma',
      429,
      11,
      'F1',
      beige,
    ),
    text('THIS CERTIFIES THAT', 92, 382, 9, 'F4', olive),
    text(name, 92, 346, 30, 'F3', rust),
    text(
      'submitted a request to go out and supplied three answers.',
      92,
      322,
      11,
      'F1',
      ink,
    ),
    text(
      'All answers were carefully heard, remembered, and completely ignored.',
      92,
      303,
      11,
      'F1',
      ink,
    ),
    `${beige} RG 0.8 w 92 282 m 750 282 l S`,
    text('FINAL VERDICT', 92, 252, 9, 'F4', olive),
    text('VENDA.', 92, 205, 40, 'F3', rust),
    text('APPLICATION DENIED', 285, 220, 17, 'F4', ink),
    text('Reason:', 285, 194, 9, 'F4', olive),
    text('Amma said so.', 335, 194, 12, 'F1', ink),
    text('AMMA CONFIDENCE', 92, 154, 9, 'F4', olive),
    text('100%', 92, 119, 28, 'F3', rust),
    text('SCIENTIFIC EVIDENCE', 220, 154, 9, 'F4', olive),
    text('0%', 220, 119, 28, 'F3', beige),
    text('APPEAL PROCESS', 326, 154, 9, 'F4', olive),
    text(
      'Wash dishes. Clean room. Eat first. Ask tomorrow.',
      326,
      126,
      11,
      'F1',
      ink,
    ),
    text('OFFICIAL FAMILY QUOTE', 92, 82, 9, 'F4', olive),
    text('"Veettil irunnaal mathi." Stay home.', 92, 59, 13, 'F1', ink),
    `${ink} RG 0.8 w 582 92 m 748 92 l S`,
    text(authority, 582, 74, 11, 'F3', ink),
    text('Self-appointed final authority', 582, 59, 8, 'F2', olive),
    text(`Certificate: ${id}`, 40, 12, 7, 'F2', olive),
    text(`Issued: ${issued}`, 330, 12, 7, 'F2', olive),
    text(
      'This PDF is fully real. The authority behind it is not.',
      590,
      12,
      7,
      'F2',
      rust,
    ),
    'Q',
  ].join('\n');

  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 842 595] /Resources << /Font << /F1 5 0 R /F2 6 0 R /F3 7 0 R /F4 8 0 R >> >> /Contents 4 0 R >>',
    `<< /Length ${encoder.encode(content).length} >>\nstream\n${content}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Times-Roman >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Times-Bold >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>',
  ];
  const parts = ['%PDF-1.4\n%AMMA-AI\n'];
  const offsets = [0];
  let byteOffset = encoder.encode(parts[0]).length;
  objects.forEach((object, index) => {
    offsets.push(byteOffset);
    const section = `${index + 1} 0 obj\n${object}\nendobj\n`;
    parts.push(section);
    byteOffset += encoder.encode(section).length;
  });
  const xrefOffset = byteOffset;
  parts.push(`xref\n0 ${objects.length + 1}\n`);
  parts.push('0000000000 65535 f \n');
  for (const offset of offsets.slice(1))
    parts.push(`${String(offset).padStart(10, '0')} 00000 n \n`);
  parts.push(
    `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`,
  );
  return encoder.encode(parts.join(''));
}
