import { useState, useMemo } from 'react';
import {
  GraduationCap,
  BookOpen,
  ChevronDown,
  RefreshCw,
  AlertCircle,
  ArrowRight,
  Clock,
  HelpCircle,
} from 'lucide-react';
import type { Exam, Teacher } from '../types';

interface Props {
  teachers: Teacher[];
  exams: Exam[];
  onSelectExam: (exam: Exam) => void;
  onRefresh?: () => void;
  loading: boolean;
}

interface TeacherOption {
  id: string;
  fullName: string;
  subtitle: string;
  examCount: number;
}

export function StudentExamList({ teachers, exams, onSelectExam, onRefresh, loading }: Props) {
  const [selectedTeacherKey, setSelectedTeacherKey] = useState<string>('');
  const [selectedExamId, setSelectedExamId] = useState<string>('');

  // Build unified list of ALL teachers in the system (even those with 0 exams)
  // plus any teacher referenced in exams whose record may not be in the teachers table.
  const teacherOptions = useMemo<TeacherOption[]>(() => {
    const list: TeacherOption[] = [];
    const seenIds = new Set<string>();
    const seenNames = new Set<string>();

    teachers.forEach((t) => {
      const count = exams.filter((e) => e.teacherId === t.id || e.teacherName === t.fullName).length;
      list.push({
        id: t.id,
        fullName: t.fullName,
        subtitle: [t.department, t.subject].filter(Boolean).join(' · '),
        examCount: count,
      });
      seenIds.add(t.id);
      seenNames.add(t.fullName.trim());
    });

    exams.forEach((e) => {
      const nameKey = (e.teacherName || '').trim();
      if (!nameKey) return;
      if (!seenIds.has(e.teacherId) && !seenNames.has(nameKey)) {
        const count = exams.filter((ex) => ex.teacherId === e.teacherId || ex.teacherName === e.teacherName).length;
        list.push({
          id: e.teacherId || `name:${nameKey}`,
          fullName: e.teacherName,
          subtitle: [e.teacherDepartment, e.subject].filter(Boolean).join(' · '),
          examCount: count,
        });
        if (e.teacherId) seenIds.add(e.teacherId);
        seenNames.add(nameKey);
      }
    });

    return list;
  }, [teachers, exams]);

  const selectedTeacher = useMemo(
    () => teacherOptions.find((t) => t.id === selectedTeacherKey) || null,
    [teacherOptions, selectedTeacherKey]
  );

  // Exams belonging to the selected teacher
  const teacherExams = useMemo(() => {
    if (!selectedTeacher) return [];
    return exams.filter(
      (e) => e.teacherId === selectedTeacher.id || e.teacherName === selectedTeacher.fullName
    );
  }, [exams, selectedTeacher]);

  const handleTeacherChange = (teacherId: string) => {
    setSelectedTeacherKey(teacherId);
    setSelectedExamId('');
  };

  const handleExamChange = (examId: string) => {
    setSelectedExamId(examId);
    if (!examId) return;
    const chosen = teacherExams.find((e) => e.id === examId);
    if (chosen) {
      // Transition immediately to the dedicated full-screen Examinee Information form
      onSelectExam(chosen);
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto px-3 sm:px-6 py-4 sm:py-10">
      {/* Compact Header Card */}
      <div className="bg-gradient-to-br from-blue-700 via-blue-600 to-indigo-700 rounded-2xl sm:rounded-3xl p-5 sm:p-8 text-white shadow-md mb-5 sm:mb-7">
        <p className="text-xs font-medium text-blue-100/90">
          ໂຮງໝໍແຂວງຈຳປາສັກ · ສູນສອບເສັງອາສາສະໝັກ
        </p>
        <h1 className="text-xl sm:text-3xl font-extrabold tracking-tight leading-snug mt-1 text-balance">
          ລະບົບສອບເສັງອາສາສະໝັກອອນລາຍ
        </h1>
        <p className="text-xs sm:text-sm text-blue-100 mt-2 leading-relaxed max-w-xl">
          ກະລຸນາເລືອກລາຍຊື່ອາຈານ ແລະ ຫົວຂໍ້ບົດສອບເສັງດ້ານລຸ່ມ ເພື່ອເຂົ້າສູ່ໜ້າປ້ອນຂໍ້ມູນຜູ້ສອບເສັງ.
        </p>
      </div>

      {/* Main Selection Panel */}
      <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200 shadow-xs p-5 sm:p-8">
        <div className="flex items-center justify-between gap-3 pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900">
              ເລືອກບົດສອບເສັງຂອງທ່ານ
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              1. ເລືອກອາຈານ · 2. ເລືອກຫົວຂໍ້ບົດສອບ · 3. ປ້ອນຂໍ້ມູນຜູ້ສອບ
            </p>
          </div>

          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              disabled={loading}
              className="min-h-[44px] min-w-[44px] px-3 py-2 rounded-xl border border-slate-200 text-slate-600 hover:text-blue-700 hover:bg-blue-50 hover:border-blue-200 transition-colors flex items-center justify-center gap-1.5 text-xs font-semibold cursor-pointer shrink-0 disabled:opacity-50"
              title="ໂຫຼດຂໍ້ມູນໃໝ່"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-blue-600' : ''}`} />
              <span className="hidden sm:inline whitespace-nowrap">ໂຫຼດໃໝ່</span>
            </button>
          )}
        </div>

        {loading && teacherOptions.length === 0 ? (
          <div className="py-12 text-center">
            <span className="w-7 h-7 border-2 border-blue-600 border-t-transparent rounded-full animate-spin inline-block mb-3" />
            <p className="text-sm text-slate-500 font-medium">ກຳລັງໂຫຼດລາຍຊື່ອາຈານ ແລະ ບົດສອບເສັງ...</p>
          </div>
        ) : teacherOptions.length === 0 ? (
          <div className="py-12 text-center">
            <GraduationCap className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-slate-800">ຍັງບໍ່ມີລາຍຊື່ອາຈານໃນລະບົບ</h3>
            <p className="text-xs text-slate-500 mt-1">
              ກະລຸນາລໍຖ້າຜູ້ດູແລລະບົບເພີ່ມລາຍຊື່ອາຈານ ແລ້ວກົດປຸ່ມໂຫຼດໃໝ່
            </p>
          </div>
        ) : (
          <div className="mt-5 sm:mt-6 space-y-5 sm:space-y-6">
            {/* Step 1: Teacher Dropdown */}
            <div>
              <label
                htmlFor="student-teacher-select"
                className="flex items-center gap-2 text-sm font-bold text-slate-800 mb-2"
              >
                <span className="w-6 h-6 rounded-lg bg-blue-600 text-white font-mono text-xs font-bold flex items-center justify-center shrink-0">
                  1
                </span>
                <span>ເລືອກອາຈານຜູ້ອອກຂໍ້ສອບ</span>
                <span className="text-rose-500">*</span>
              </label>

              <div className="relative">
                <GraduationCap className="w-5 h-5 text-blue-600 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <select
                  id="student-teacher-select"
                  value={selectedTeacherKey}
                  onChange={(e) => handleTeacherChange(e.target.value)}
                  className="w-full min-h-[48px] pl-11 pr-10 py-3 text-base sm:text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-semibold text-slate-900 appearance-none cursor-pointer transition-colors"
                >
                  <option value="">-- ກະລຸນາເລືອກລາຍຊື່ອາຈານ --</option>
                  {teacherOptions.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.fullName}
                      {t.subtitle ? ` (${t.subtitle})` : ''}
                      {t.examCount > 0 ? ` · ${t.examCount} ບົດສອບ` : ' · ຍັງບໍ່ມີບົດສອບ'}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-5 h-5 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            {/* Step 2: Teacher's Exam Topic Dropdown (appears after selecting a teacher) */}
            {selectedTeacher && (
              <div className="pt-5 border-t border-slate-100">
                <label
                  htmlFor="student-exam-select"
                  className="flex items-center gap-2 text-sm font-bold text-slate-800 mb-2"
                >
                  <span className="w-6 h-6 rounded-lg bg-blue-600 text-white font-mono text-xs font-bold flex items-center justify-center shrink-0">
                    2
                  </span>
                  <span>ເລືອກຫົວຂໍ້ບົດສອບເສັງຂອງ {selectedTeacher.fullName}</span>
                  <span className="text-rose-500">*</span>
                </label>

                {teacherExams.length === 0 ? (
                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3 text-amber-900">
                    <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                    <div className="text-xs sm:text-sm leading-relaxed">
                      <p className="font-bold">ອາຈານທ່ານນີ້ຍັງບໍ່ທັນໄດ້ເປີດບົດສອບເສັງ</p>
                      <p className="text-amber-800/90 mt-0.5">
                        ກະລຸນາເລືອກອາຈານທ່ານອື່ນ ຫຼື ກົດປຸ່ມ "ໂຫຼດໃໝ່" ຫາກອາຈານຫາກໍ່ເປີດບົດສອບເສັງ.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="relative">
                      <BookOpen className="w-5 h-5 text-blue-600 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <select
                        id="student-exam-select"
                        value={selectedExamId}
                        onChange={(e) => handleExamChange(e.target.value)}
                        className="w-full min-h-[48px] pl-11 pr-10 py-3 text-base sm:text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-semibold text-slate-900 appearance-none cursor-pointer transition-colors"
                      >
                        <option value="">-- ກະລຸນາເລືອກຫົວຂໍ້ບົດສອບເສັງ --</option>
                        {teacherExams.map((ex) => (
                          <option key={ex.id} value={ex.id}>
                            {ex.title} ({ex.questions.length} ຂໍ້ · {ex.durationMinutes} ນາທີ)
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="w-5 h-5 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>

                    <p className="text-xs text-slate-500 flex items-center gap-1.5">
                      <ArrowRight className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                      <span>ເມື່ອເລືອກຫົວຂໍ້ແລ້ວ ລະບົບຈະເປີດໜ້າປ້ອນຂໍ້ມູນປະຈຳຕົວຜູ້ສອບເສັງທັນທີ</span>
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Helpful readiness note at bottom of card */}
            {!selectedTeacher && (
              <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-500">
                <span className="inline-flex items-center gap-1.5">
                  <GraduationCap className="w-4 h-4 text-slate-400" />
                  <span>ອາຈານໃນລະບົບ {teacherOptions.length} ທ່ານ</span>
                </span>
                <span aria-hidden="true" className="text-slate-300">·</span>
                <span className="inline-flex items-center gap-1.5">
                  <HelpCircle className="w-4 h-4 text-slate-400" />
                  <span>ບົດສອບທີ່ເປີດຢູ່ {exams.length} ຫົວຂໍ້</span>
                </span>
                <span aria-hidden="true" className="text-slate-300">·</span>
                <span className="inline-flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-slate-400" />
                  <span>ຮອງຮັບທັງມືຖື ແລະ ຄອມພິວເຕີ</span>
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
