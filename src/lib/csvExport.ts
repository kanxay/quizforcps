import type { Submission, Teacher, Exam } from '../types';

export function exportSubmissionsToCSV(submissions: Submission[], filename = 'lao_volunteer_exam_submissions.csv') {
  const headers = [
    'ລະຫັດຜົນສອບ (ID)',
    'ວັນທີສອບ',
    'ຊື່-ນາມສະກຸນ ຜູ້ສອບ',
    'ອາຍຸ',
    'ເພດ',
    'ບ້ານ',
    'ເມືອງ',
    'ແຂວງ',
    'ໜ່ວຍງານ/ອົງການ',
    'ຊື່ບົດສອບເສັງ',
    'ວິຊາ',
    'ອາຈານຜູ້ອອກຂໍ້ສອບ',
    'ຄະແນນປາລະໄນ',
    'ຄະແນນເຕັມປາລະໄນ',
    'ຄະແນນອັດຕະໄນ',
    'ຄະແນນເຕັມອັດຕະໄນ',
    'ຄະແນນລວມທັງໝົດ',
    'ຄະແນນເຕັມທັງໝົດ',
    'ເປີເຊັນ (%)',
    'ຜົນການສອບ (ຜ່ານ/ບໍ່ຜ່ານ)',
    'ສະຖານະການກວດ',
    'ເວລາສົ່ງຂໍ້ສອບ',
  ];

  const escapeCSV = (value: unknown): string => {
    if (value === null || value === undefined) return '""';
    const str = String(value).replace(/"/g, '""');
    return `"${str}"`;
  };

  const rows = submissions.map((s) => [
    escapeCSV(s.id),
    escapeCSV(s.studentInfo?.examDate),
    escapeCSV(s.studentInfo?.fullName),
    escapeCSV(s.studentInfo?.age),
    escapeCSV(s.studentInfo?.gender),
    escapeCSV(s.studentInfo?.village),
    escapeCSV(s.studentInfo?.district),
    escapeCSV(s.studentInfo?.province),
    escapeCSV(s.studentInfo?.organization || '-'),
    escapeCSV(s.examTitle),
    escapeCSV(s.subject),
    escapeCSV(s.teacherName),
    escapeCSV(s.objectiveScore),
    escapeCSV(s.maxObjectiveScore),
    escapeCSV(s.essayScore),
    escapeCSV(s.maxEssayScore),
    escapeCSV(s.totalScore),
    escapeCSV(s.maxTotalScore),
    escapeCSV(s.percentage + '%'),
    escapeCSV(s.passed ? 'ຜ່ານ' : 'ບໍ່ຜ່ານ'),
    escapeCSV(s.isFullyGraded ? 'ກວດຄົບແລ້ວ' : 'ລໍຖ້າກວດຂໍ້ຂຽນ'),
    escapeCSV(s.submittedAt),
  ]);

  const csvContent = '\uFEFF' + [headers.map((h) => `"${h}"`).join(','), ...rows.map((r) => r.join(','))].join('\r\n');
  downloadBlob(csvContent, filename, 'text/csv;charset=utf-8;');
}

export function exportTeachersToCSV(teachers: Teacher[], filename = 'lao_volunteer_exam_teachers.csv') {
  const headers = ['ລະຫັດອາຈານ', 'ຊື່ ແລະ ນາມສະກຸນ', 'ວິຊາສອນ', 'ພະແນກ/ໜ່ວຍງານ', 'ລະຫັດຜ່ານ', 'ວັນທີສ້າງ'];
  const rows = teachers.map((t) => [
    `"${t.id}"`,
    `"${t.fullName.replace(/"/g, '""')}"`,
    `"${t.subject.replace(/"/g, '""')}"`,
    `"${t.department.replace(/"/g, '""')}"`,
    `"${t.password.replace(/"/g, '""')}"`,
    `"${t.createdAt.replace(/"/g, '""')}"`,
  ]);

  const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
  downloadBlob(csvContent, filename, 'text/csv;charset=utf-8;');
}

export function exportFullBackupCSV(teachers: Teacher[], exams: Exam[], submissions: Submission[]) {
  exportSubmissionsToCSV(submissions, `backup_submissions_${new Date().toISOString().slice(0, 10)}.csv`);
  setTimeout(() => {
    exportTeachersToCSV(teachers, `backup_teachers_${new Date().toISOString().slice(0, 10)}.csv`);
  }, 400);
}

function downloadBlob(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
