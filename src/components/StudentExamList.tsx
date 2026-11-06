import { useState } from 'react';
import { BookOpen, Clock, HelpCircle, User, Search, Award } from 'lucide-react';
import type { Exam } from '../types';

interface Props {
  exams: Exam[];
  onSelectExam: (exam: Exam) => void;
  loading: boolean;
}

export function StudentExamList({ exams, onSelectExam, loading }: Props) {
  const [searchTerm, setSearchTerm] = useState('');

  const filtered = exams.filter((e) => {
    const term = searchTerm.toLowerCase().trim();
    if (!term) return true;
    return (
      e.title.toLowerCase().includes(term) ||
      e.subject.toLowerCase().includes(term) ||
      e.teacherName.toLowerCase().includes(term)
    );
  });

  return (
    <div className="w-full max-w-5xl mx-auto py-6 px-4">
      {/* Hero Welcome Banner */}
      <div className="bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-700 rounded-3xl p-6 sm:p-8 text-white shadow-lg mb-8 relative overflow-hidden">
        <div className="max-w-2xl relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/15 backdrop-blur-md rounded-xl text-xs font-semibold mb-3">
            <Award className="w-4 h-4 text-amber-300" />
            <span>ສູນສອບເສັງ ແລະ ຢັ້ງຢືນມາດຕະຖານອາສາສະໝັກ</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight leading-tight">
            ລະບົບສອບເສັງອາສາສະໝັກອອນລາຍ
          </h1>
          <p className="text-xs sm:text-sm text-blue-100 mt-2 leading-relaxed">
            ຍິນດີຕ້ອນຮັບອາສາສະໝັກທຸກທ່ານ ເຂົ້າສູ່ລະບົບທົດສອບຄວາມຮູ້ມາດຕະຖານ. ກະລຸນາເລືອກບົດສອບເສັງທີ່ທ່ານຕ້ອງການທົດສອບດ້ານລຸ່ມນີ້.
          </p>
        </div>
      </div>

      {/* Search Header */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-lg font-bold text-slate-900">ລາຍການບົດສອບເສັງທີ່ເປີດຢູ່</h2>
          <p className="text-xs text-slate-500">ເລືອກບົດສອບເສັງເພື່ອເລີ່ມຕົ້ນທົດສອບຄວາມຮູ້</p>
        </div>

        <div className="relative w-full sm:w-72">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="ຄົ້ນຫາຊື່ບົດສອບ, ວິຊາ, ຫຼື ອາຈານ..."
            className="w-full pl-9 pr-4 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
        </div>
      </div>

      {/* Exams Grid */}
      {loading && exams.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200">
          <span className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin inline-block mb-2" />
          <p className="text-xs text-slate-500">ກຳລັງໂຫຼດບົດສອບເສັງ...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200">
          <BookOpen className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <h3 className="text-sm font-semibold text-slate-800">ຍັງບໍ່ມີບົດສອບເສັງທີ່ເປີດຢູ່</h3>
          <p className="text-xs text-slate-400 mt-1">ກະລຸນາລໍຖ້າອາຈານເປີດບົດສອບເສັງໃໝ່</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filtered.map((exam) => (
            <div
              key={exam.id}
              className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs hover:border-blue-400 hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-[11px] font-semibold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-lg border border-blue-100">
                    {exam.subject}
                  </span>
                  <span className="text-[11px] text-slate-400 flex items-center gap-1 font-mono">
                    <Clock className="w-3 h-3" />
                    {exam.durationMinutes} ນາທີ
                  </span>
                </div>

                <h3 className="text-base font-bold text-slate-900 leading-snug">{exam.title}</h3>
                <p className="text-xs text-slate-600 mt-2 line-clamp-2 leading-relaxed">
                  {exam.description || 'ບໍ່ມີຄຳອະທິບາຍເພີ່ມເຕີມ'}
                </p>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <span className="flex items-center gap-1.5 truncate max-w-[200px]" title={exam.teacherName}>
                    <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    {exam.teacherName}
                  </span>
                  <span className="flex items-center gap-1 font-semibold text-slate-700 shrink-0">
                    <HelpCircle className="w-3.5 h-3.5 text-blue-600" />
                    {exam.questions.length} ຂໍ້
                  </span>
                </div>
              </div>

              <div className="mt-5 pt-3">
                <button
                  onClick={() => onSelectExam(exam)}
                  className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl shadow-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  ເລີ່ມຕົ້ນສອບເສັງ
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
