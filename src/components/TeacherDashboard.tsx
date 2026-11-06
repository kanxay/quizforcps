import { useState, useEffect, useMemo } from 'react';
import {
  BookOpen,
  Plus,
  Edit3,
  Trash2,
  Clock,
  HelpCircle,
  CheckCircle,
  AlertCircle,
  FileText,
  Save,
  ArrowUp,
  ArrowDown,
  X,
  UserCheck,
  Search,
  CheckSquare,
  Award,
} from 'lucide-react';
import type { Teacher, Exam, Question, QuestionType, Submission, StudentAnswerItem } from '../types';
import {
  createExam,
  updateExam,
  deleteExam,
  fetchExams,
  fetchSubmissions,
  updateSubmissionGrading,
  getSettings,
} from '../lib/turso';

interface Props {
  teacher: Teacher;
}

export function TeacherDashboard({ teacher }: Props) {
  const [activeTab, setActiveTab] = useState<'exams' | 'grading' | 'summary'>('exams');
  const [exams, setExams] = useState<Exam[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [passThreshold, setPassThreshold] = useState(50);

  // Exam Edit / Create Modal State
  const [showExamModal, setShowExamModal] = useState(false);
  const [editingExam, setEditingExam] = useState<Exam | null>(null);
  const [examTitle, setExamTitle] = useState('');
  const [examSubject, setExamSubject] = useState(teacher.subject || '');
  const [examDuration, setExamDuration] = useState(30);
  const [examDescription, setExamDescription] = useState('');
  const [examQuestions, setExamQuestions] = useState<Question[]>([]);
  const [savingExam, setSavingExam] = useState(false);

  // Question Edit Modal State
  const [showQuestionModal, setShowQuestionModal] = useState(false);
  const [editingQuestionIndex, setEditingQuestionIndex] = useState<number | null>(null);
  const [qType, setQType] = useState<QuestionType>('single_choice');
  const [qText, setQText] = useState('');
  const [qPoints, setQPoints] = useState(2);
  const [qOptions, setQOptions] = useState<string[]>(['ຕົວເລືອກ A', 'ຕົວເລືອກ B', 'ຕົວເລືອກ C', 'ຕົວເລືອກ D']);
  const [qSingleCorrect, setQSingleCorrect] = useState<number>(0);
  const [qMultipleCorrect, setQMultipleCorrect] = useState<number[]>([0]);
  const [qSampleAnswer, setQSampleAnswer] = useState('');

  // Submission Grading Modal
  const [gradingSubmission, setGradingSubmission] = useState<Submission | null>(null);
  const [gradingAnswers, setGradingAnswers] = useState<Record<string, StudentAnswerItem>>({});
  const [savingGrade, setSavingGrade] = useState(false);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [allExams, allSubs, settings] = await Promise.all([
        fetchExams(),
        fetchSubmissions({ teacherName: teacher.fullName }),
        getSettings(),
      ]);
      // Filter exams created by this teacher
      const myExams = allExams.filter((e) => e.teacherId === teacher.id || e.teacherName === teacher.fullName);
      setExams(myExams);
      setSubmissions(allSubs);
      setPassThreshold(settings.passPercentage);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [teacher.id]);

  // Open Exam Create / Edit
  const handleOpenCreateExam = () => {
    setEditingExam(null);
    setExamTitle('');
    setExamSubject(teacher.subject || '');
    setExamDuration(30);
    setExamDescription('');
    setExamQuestions([]);
    setShowExamModal(true);
  };

  const handleOpenEditExam = (exam: Exam) => {
    setEditingExam(exam);
    setExamTitle(exam.title);
    setExamSubject(exam.subject);
    setExamDuration(exam.durationMinutes);
    setExamDescription(exam.description);
    setExamQuestions([...exam.questions]);
    setShowExamModal(true);
  };

  const handleDeleteExam = async (id: string, title: string) => {
    if (!window.confirm(`ທ່ານແນ່ໃຈບໍ່ວ່າຕ້ອງການລຶບບົດສອບເສັງ "${title}"?`)) return;
    try {
      await deleteExam(id);
      setExams((prev) => prev.filter((e) => e.id !== id));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      alert(msg);
    }
  };

  const handleSaveExam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!examTitle.trim() || !examSubject.trim()) {
      alert('ກະລຸນາປ້ອນ ຊື່ບົດສອບເສັງ ແລະ ວິຊາ');
      return;
    }
    if (examQuestions.length === 0) {
      alert('ກະລຸນາເພີ່ມຂໍ້ສອບຢ່າງໜ້ອຍ 1 ຂໍ້');
      return;
    }

    setSavingExam(true);
    try {
      if (editingExam) {
        const updated: Exam = {
          ...editingExam,
          title: examTitle.trim(),
          subject: examSubject.trim(),
          durationMinutes: Number(examDuration) || 30,
          description: examDescription.trim(),
          questions: examQuestions,
        };
        await updateExam(updated);
        setExams((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
      } else {
        const created = await createExam({
          title: examTitle.trim(),
          subject: examSubject.trim(),
          teacherId: teacher.id,
          teacherName: teacher.fullName,
          teacherDepartment: teacher.department,
          durationMinutes: Number(examDuration) || 30,
          description: examDescription.trim(),
          questions: examQuestions,
        });
        setExams((prev) => [created, ...prev]);
      }
      setShowExamModal(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      alert(msg);
    } finally {
      setSavingExam(false);
    }
  };

  // Question Management inside Exam Modal
  const handleOpenAddQuestion = () => {
    setEditingQuestionIndex(null);
    setQType('single_choice');
    setQText('');
    setQPoints(2);
    setQOptions(['ຕົວເລືອກ A', 'ຕົວເລືອກ B', 'ຕົວເລືອກ C', 'ຕົວເລືອກ D']);
    setQSingleCorrect(0);
    setQMultipleCorrect([0]);
    setQSampleAnswer('');
    setShowQuestionModal(true);
  };

  const handleOpenEditQuestion = (index: number) => {
    const q = examQuestions[index];
    setEditingQuestionIndex(index);
    setQType(q.type);
    setQText(q.text);
    setQPoints(q.points);
    setQOptions(q.options ? [...q.options] : ['ຕົວເລືອກ A', 'ຕົວເລືອກ B']);
    setQSingleCorrect(typeof q.correctAnswer === 'number' ? q.correctAnswer : 0);
    setQMultipleCorrect(Array.isArray(q.correctAnswer) ? [...q.correctAnswer] : [0]);
    setQSampleAnswer(q.sampleAnswer || '');
    setShowQuestionModal(true);
  };

  const handleSaveQuestion = () => {
    if (!qText.trim()) {
      alert('ກະລຸນາປ້ອນເນື້ອໃນຄຳຖາມ');
      return;
    }

    const newQuestion: Question = {
      id: editingQuestionIndex !== null ? examQuestions[editingQuestionIndex].id : `q_${Date.now()}`,
      type: qType,
      text: qText.trim(),
      points: Number(qPoints) || 1,
      options: qType !== 'text' ? qOptions.filter((o) => o.trim().length > 0) : undefined,
      correctAnswer: qType === 'single_choice' ? qSingleCorrect : qType === 'multiple_choice' ? qMultipleCorrect : undefined,
      sampleAnswer: qType === 'text' ? qSampleAnswer.trim() : undefined,
    };

    if (editingQuestionIndex !== null) {
      const updated = [...examQuestions];
      updated[editingQuestionIndex] = newQuestion;
      setExamQuestions(updated);
    } else {
      setExamQuestions([...examQuestions, newQuestion]);
    }
    setShowQuestionModal(false);
  };

  const handleDeleteQuestion = (index: number) => {
    setExamQuestions(examQuestions.filter((_, i) => i !== index));
  };

  const handleMoveQuestion = (index: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= examQuestions.length) return;
    const reordered = [...examQuestions];
    const temp = reordered[index];
    reordered[index] = reordered[targetIdx];
    reordered[targetIdx] = temp;
    setExamQuestions(reordered);
  };

  // Grading flow
  const handleOpenGrading = (sub: Submission) => {
    setGradingSubmission(sub);
    setGradingAnswers({ ...sub.answers });
  };

  const handleUpdateEssayScore = (qId: string, score: number, feedback?: string) => {
    setGradingAnswers((prev) => {
      const existing = prev[qId] || {};
      return {
        ...prev,
        [qId]: {
          ...existing,
          awardedScore: score,
          teacherFeedback: feedback !== undefined ? feedback : existing.teacherFeedback,
        },
      };
    });
  };

  const handleSaveGrading = async () => {
    if (!gradingSubmission) return;
    setSavingGrade(true);
    try {
      const updatedSub = await updateSubmissionGrading(gradingSubmission.id, gradingAnswers, passThreshold);
      setSubmissions((prev) => prev.map((s) => (s.id === updatedSub.id ? updatedSub : s)));
      setGradingSubmission(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      alert(msg);
    } finally {
      setSavingGrade(false);
    }
  };

  // Summary per Exam
  const examSummaries = useMemo(() => {
    return exams.map((exam) => {
      const subs = submissions.filter((s) => s.examId === exam.id);
      const total = subs.length;
      const passed = subs.filter((s) => s.passed).length;
      const failed = total - passed;
      const avgScore =
        total > 0 ? Math.round((subs.reduce((acc, s) => acc + s.percentage, 0) / total) * 10) / 10 : 0;
      return {
        exam,
        total,
        passed,
        failed,
        avgScore,
      };
    });
  }, [exams, submissions]);

  return (
    <div className="w-full max-w-6xl mx-auto py-6 px-4">
      {/* Teacher Profile Card */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-5 sm:p-6 mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <span className="text-[11px] font-semibold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-lg border border-blue-100">
            ອາຈານຜູ້ອອກຂໍ້ສອບ
          </span>
          <h2 className="text-xl font-bold text-slate-900 mt-1">{teacher.fullName}</h2>
          <p className="text-xs text-slate-500">
            ວິຊາ: <strong className="text-slate-700">{teacher.subject}</strong> · ໜ່ວຍງານ: <strong className="text-slate-700">{teacher.department}</strong>
          </p>
        </div>

        <button
          onClick={handleOpenCreateExam}
          className="flex items-center gap-1.5 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          + ສ້າງບົດສອບເສັງໃໝ່
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 p-1.5 bg-slate-200/70 rounded-2xl w-fit mb-6 text-xs font-semibold">
        <button
          onClick={() => setActiveTab('exams')}
          className={`px-4 py-2 rounded-xl transition-all cursor-pointer ${
            activeTab === 'exams' ? 'bg-white text-blue-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          ບົດສອບເສັງຂອງຂ້ອຍ ({exams.length})
        </button>
        <button
          onClick={() => setActiveTab('grading')}
          className={`px-4 py-2 rounded-xl transition-all cursor-pointer ${
            activeTab === 'grading' ? 'bg-white text-blue-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          ກວດຜົນສອບເສັງ ({submissions.length})
        </button>
        <button
          onClick={() => setActiveTab('summary')}
          className={`px-4 py-2 rounded-xl transition-all cursor-pointer ${
            activeTab === 'summary' ? 'bg-white text-blue-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          ສະຫຼຸບຜົນສອບ
        </button>
      </div>

      {error && (
        <div className="mb-6 p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* ========================================================
          TAB 1: MY EXAMS
      ======================================================== */}
      {activeTab === 'exams' && (
        <div className="space-y-4">
          {exams.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 shadow-xs">
              <BookOpen className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <h3 className="text-sm font-semibold text-slate-800">ຍັງບໍ່ມີບົດສອບເສັງ</h3>
              <p className="text-xs text-slate-400 mt-1">ກົດປຸ່ມ "+ ສ້າງບົດສອບເສັງໃໝ່" ດ້ານເທິງເພື່ອສ້າງຂໍ້ສອບ</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {exams.map((exam) => (
                <div
                  key={exam.id}
                  className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 shadow-xs flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] font-semibold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-lg border border-blue-100">
                        {exam.subject}
                      </span>
                      <span className="text-[11px] font-mono text-slate-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {exam.durationMinutes} ນາທີ
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-slate-900">{exam.title}</h3>
                    <p className="text-xs text-slate-500 mt-1 line-clamp-2">{exam.description || 'ບໍ່ມີຄຳອະທິບາຍ'}</p>

                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
                      <span>ຈຳນວນຂໍ້ສອບ: <strong>{exam.questions.length} ຂໍ້</strong></span>
                      <span className="font-mono text-[11px] text-slate-400">ວັນທີສ້າງ: {exam.createdDate}</span>
                    </div>
                  </div>

                  <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                    <button
                      onClick={() => handleOpenEditExam(exam)}
                      className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      ແກ້ໄຂບົດສອບ & ຂໍ້ສອບ
                    </button>
                    <button
                      onClick={() => handleDeleteExam(exam.id, exam.title)}
                      className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                      title="ລຶບ"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================
          TAB 2: SUBMISSIONS & GRADING
      ======================================================== */}
      {activeTab === 'grading' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">
              ລາຍການຜົນສອບຂອງນັກຮຽນ/ອາສາສະໝັກ ({submissions.length} ລາຍການ)
            </h3>
          </div>

          {submissions.length === 0 ? (
            <div className="p-12 text-center text-xs text-slate-400">
              ຍັງບໍ່ມີອາສາສະໝັກສົ່ງບົດສອບເສັງ
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 text-[11px] font-semibold text-slate-500 uppercase border-b border-slate-100">
                  <tr>
                    <th className="px-4 py-3">ID</th>
                    <th className="px-4 py-3">ຊື່ຜູ້ສອບ</th>
                    <th className="px-4 py-3">ບົດສອບ</th>
                    <th className="px-4 py-3">ຄະແນນ</th>
                    <th className="px-4 py-3">ເປີເຊັນ</th>
                    <th className="px-4 py-3">ຜົນ</th>
                    <th className="px-4 py-3">ສະຖານະການກວດ</th>
                    <th className="px-4 py-3 text-right">ຈັດການ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {submissions.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-4 py-3 font-mono font-bold text-blue-700">#{s.id}</td>
                      <td className="px-4 py-3 font-semibold text-slate-900">
                        {s.studentInfo?.fullName}
                        <span className="block text-[11px] font-normal text-slate-400">
                          {s.studentInfo?.age} ປີ, {s.studentInfo?.district}/{s.studentInfo?.province}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-800 max-w-[180px] truncate">
                        {s.examTitle}
                      </td>
                      <td className="px-4 py-3 font-mono font-bold text-slate-900">
                        {s.totalScore} / {s.maxTotalScore}
                      </td>
                      <td className="px-4 py-3 font-mono font-bold">{s.percentage}%</td>
                      <td className="px-4 py-3">
                        <span
                          className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${
                            s.passed ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-800'
                          }`}
                        >
                          {s.passed ? 'ຜ່ານ' : 'ບໍ່ຜ່ານ'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-md ${
                            s.isFullyGraded
                              ? 'bg-slate-100 text-slate-700'
                              : 'bg-amber-100 text-amber-800 font-bold animate-pulse'
                          }`}
                        >
                          {s.isFullyGraded ? 'ກວດຄົບແລ້ວ' : 'ລໍຖ້າກວດຂໍ້ຂຽນ'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => handleOpenGrading(s)}
                          className="px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors cursor-pointer"
                        >
                          ກວດ / ໃຫ້ຄະແນນ
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ========================================================
          TAB 3: SUMMARY ANALYTICS
      ======================================================== */}
      {activeTab === 'summary' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-xs text-slate-500 block">ບົດສອບເສັງທັງໝົດ</span>
              <strong className="text-2xl font-mono text-slate-900 mt-1 block">{exams.length}</strong>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-xs text-slate-500 block">ຈຳນວນຜູ້ສອບທັງໝົດ</span>
              <strong className="text-2xl font-mono text-blue-700 mt-1 block">{submissions.length}</strong>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-xs text-slate-500 block">ເກນຄະແນນຜ່ານ</span>
              <strong className="text-2xl font-mono text-emerald-700 mt-1 block">{passThreshold}%</strong>
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">ສະຫຼຸບຜົນສອບເສັງແຍກຕາມແຕ່ລະບົດສອບ</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 text-[11px] font-semibold text-slate-500 uppercase border-b border-slate-100">
                  <tr>
                    <th className="px-4 py-3">ຊື່ບົດສອບເສັງ</th>
                    <th className="px-4 py-3">ວິຊາ</th>
                    <th className="px-4 py-3">ຈຳນວນຜູ້ສອບ</th>
                    <th className="px-4 py-3">ຄະແນນສະເລ່ຍ (%)</th>
                    <th className="px-4 py-3">ຈຳນວນຜ່ານ</th>
                    <th className="px-4 py-3">ຈຳນວນບໍ່ຜ່ານ</th>
                    <th className="px-4 py-3">ອັດຕາຜ່ານ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {examSummaries.map((item) => {
                    const passRate =
                      item.total > 0 ? Math.round((item.passed / item.total) * 100 * 10) / 10 : 0;
                    return (
                      <tr key={item.exam.id} className="hover:bg-slate-50/80">
                        <td className="px-4 py-3 font-semibold text-slate-900">{item.exam.title}</td>
                        <td className="px-4 py-3 text-slate-600">{item.exam.subject}</td>
                        <td className="px-4 py-3 font-mono font-bold text-slate-800">{item.total}</td>
                        <td className="px-4 py-3 font-mono font-bold text-blue-700">{item.avgScore}%</td>
                        <td className="px-4 py-3 font-mono text-emerald-700 font-bold">{item.passed}</td>
                        <td className="px-4 py-3 font-mono text-rose-700 font-bold">{item.failed}</td>
                        <td className="px-4 py-3 font-mono font-bold">{passRate}%</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL: CREATE / EDIT EXAM
      ======================================================== */}
      {showExamModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-xs overflow-y-auto">
          <div className="w-full max-w-3xl bg-white rounded-3xl shadow-2xl border border-slate-200 p-6 sm:p-7 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">
                {editingExam ? 'ແກ້ໄຂບົດສອບເສັງ' : 'ສ້າງບົດສອບເສັງໃໝ່'}
              </h3>
              <button
                onClick={() => setShowExamModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveExam} className="overflow-y-auto flex-1 mt-4 space-y-4 text-xs pr-1">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  ຊື່ບົດສອບເສັງ <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={examTitle}
                  onChange={(e) => setExamTitle(e.target.value)}
                  placeholder="ເຊັ່ນ: quizeforcps - ບົດສອບເສັງຄວາມຮູ້ການປະຖົມພະຍາບານ..."
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    ວິຊາ / ຫຼັກສູດ <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={examSubject}
                    onChange={(e) => setExamSubject(e.target.value)}
                    placeholder="ເຊັ່ນ: ການປະຖົມພະຍາບານເບື້ອງຕົ້ນ"
                    className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    ເວລາສອບເສັງ (ນາທີ) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min={5}
                    max={240}
                    value={examDuration}
                    onChange={(e) => setExamDuration(Number(e.target.value))}
                    className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">ຄຳອະທິບາຍບົດສອບເສັງ</label>
                <textarea
                  rows={2}
                  value={examDescription}
                  onChange={(e) => setExamDescription(e.target.value)}
                  placeholder="ຄຳແນະນຳສຳລັບຜູ້ສອບເສັງ..."
                  className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Questions Section inside Exam */}
              <div className="pt-3 border-t border-slate-100">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-bold text-slate-900 text-sm">
                    ລາຍການຂໍ້ສອບ ({examQuestions.length} ຂໍ້)
                  </h4>
                  <button
                    type="button"
                    onClick={handleOpenAddQuestion}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    + ເພີ່ມຂໍ້ສອບ
                  </button>
                </div>

                {examQuestions.length === 0 ? (
                  <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-slate-400">
                    ຍັງບໍ່ມີຂໍ້ສອບ. ກະລຸນາກົດປຸ່ມ "+ ເພີ່ມຂໍ້ສອບ"
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {examQuestions.map((q, idx) => (
                      <div
                        key={q.id}
                        className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between gap-3 text-xs"
                      >
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <span className="w-6 h-6 rounded-md bg-blue-600 text-white font-mono font-bold flex items-center justify-center shrink-0">
                            {idx + 1}
                          </span>
                          <div className="truncate">
                            <span className="font-semibold text-slate-800 mr-2">{q.text}</span>
                            <span className="text-[10px] text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                              {q.type === 'single_choice' && 'ເລືອກດຽວ'}
                              {q.type === 'multiple_choice' && 'ເລືອກຫຼາຍ'}
                              {q.type === 'text' && 'ຂຽນຕອບ'} · {q.points} ຄະແນນ
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleMoveQuestion(idx, 'up')}
                            disabled={idx === 0}
                            className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30"
                            title="ຍ້າຍຂຶ້ນ"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleMoveQuestion(idx, 'down')}
                            disabled={idx === examQuestions.length - 1}
                            className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30"
                            title="ຍ້າຍລົງ"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenEditQuestion(idx)}
                            className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                            title="ແກ້ໄຂ"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteQuestion(idx)}
                            className="p-1 text-rose-500 hover:bg-rose-50 rounded"
                            title="ລຶບ"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Bottom Actions */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowExamModal(false)}
                  className="px-4 py-2 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl"
                >
                  ຍົກເລີກ
                </button>
                <button
                  type="submit"
                  disabled={savingExam}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-bold rounded-xl shadow-xs"
                >
                  {savingExam ? 'ກຳລັງບັນທຶກ...' : 'ບັນທຶກບົດສອບເສັງ'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL: ADD / EDIT QUESTION
      ======================================================== */}
      {showQuestionModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-xs overflow-y-auto">
          <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 p-6 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">
                {editingQuestionIndex !== null ? 'ແກ້ໄຂຂໍ້ສອບ' : 'ເພີ່ມຂໍ້ສອບໃໝ່'}
              </h3>
              <button onClick={() => setShowQuestionModal(false)}>
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 mt-3 space-y-3.5 text-xs pr-1">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">ປະເພດຂໍ້ສອບ</label>
                <select
                  value={qType}
                  onChange={(e) => setQType(e.target.value as QuestionType)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium"
                >
                  <option value="single_choice">ເລືອກຄຳຕອບດຽວ (Single Choice)</option>
                  <option value="multiple_choice">ເລືອກໄດ້ຫຼາຍຄຳຕອບ (Multiple Choice)</option>
                  <option value="text">ຂຽນຕອບ (Essay / Short Answer)</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">ເນື້ອໃນຄຳຖາມ <span className="text-rose-500">*</span></label>
                <textarea
                  rows={2}
                  value={qText}
                  onChange={(e) => setQText(e.target.value)}
                  placeholder="ພິມຄຳຖາມ..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">ຄະແນນເຕັມ</label>
                <input
                  type="number"
                  min={1}
                  max={50}
                  value={qPoints}
                  onChange={(e) => setQPoints(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono"
                  required
                />
              </div>

              {/* Options for Choice questions */}
              {qType !== 'text' && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="font-semibold text-slate-700">ຕົວເລືອກ ແລະ ຄຳຕອບທີ່ຖືກຕ້ອງ</label>
                    {qOptions.length < 6 && (
                      <button
                        type="button"
                        onClick={() => setQOptions([...qOptions, `ຕົວເລືອກ ${String.fromCharCode(65 + qOptions.length)}`])}
                        className="text-[11px] text-blue-600 hover:underline"
                      >
                        + ເພີ່ມຕົວເລືອກ
                      </button>
                    )}
                  </div>

                  <div className="space-y-2">
                    {qOptions.map((opt, i) => (
                      <div key={i} className="flex items-center gap-2">
                        {qType === 'single_choice' ? (
                          <input
                            type="radio"
                            name="correctOpt"
                            checked={qSingleCorrect === i}
                            onChange={() => setQSingleCorrect(i)}
                            className="w-4 h-4 text-blue-600"
                            title="ໝາຍເປັນຄຳຕອບທີ່ຖືກ"
                          />
                        ) : (
                          <input
                            type="checkbox"
                            checked={qMultipleCorrect.includes(i)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setQMultipleCorrect([...qMultipleCorrect, i].sort());
                              } else {
                                setQMultipleCorrect(qMultipleCorrect.filter((x) => x !== i));
                              }
                            }}
                            className="w-4 h-4 text-blue-600 rounded"
                            title="ໝາຍເປັນຄຳຕອບທີ່ຖືກ"
                          />
                        )}

                        <span className="font-mono text-xs text-slate-500 font-bold">{String.fromCharCode(65 + i)}.</span>
                        <input
                          type="text"
                          value={opt}
                          onChange={(e) => {
                            const updated = [...qOptions];
                            updated[i] = e.target.value;
                            setQOptions(updated);
                          }}
                          className="flex-1 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                          placeholder={`ຕົວເລືອກ ${String.fromCharCode(65 + i)}`}
                        />

                        {qOptions.length > 2 && (
                          <button
                            type="button"
                            onClick={() => setQOptions(qOptions.filter((_, idx) => idx !== i))}
                            className="text-rose-500 p-1 hover:bg-rose-50 rounded"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Text Sample Answer */}
              {qType === 'text' && (
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    ຄຳຕອບຕົວຢ່າງ ສຳລັບອາຈານຜູ້ກວດ (Model Answer)
                  </label>
                  <textarea
                    rows={3}
                    value={qSampleAnswer}
                    onChange={(e) => setQSampleAnswer(e.target.value)}
                    placeholder="ຄຳຕອບທີ່ຖືກຕ້ອງ ແລະ ເກນການໃຫ້ຄະແນນ..."
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                  />
                </div>
              )}

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowQuestionModal(false)}
                  className="px-3 py-1.5 bg-slate-100 rounded-xl"
                >
                  ຍົກເລີກ
                </button>
                <button
                  type="button"
                  onClick={handleSaveQuestion}
                  className="px-4 py-1.5 bg-blue-600 text-white font-semibold rounded-xl"
                >
                  ຕົກລົງ
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL: GRADE ESSAY / TEXT ANSWERS
      ======================================================== */}
      {gradingSubmission && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-xs overflow-y-auto">
          <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200 p-6 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  ກວດໃຫ້ຄະແນນ: {gradingSubmission.studentInfo?.fullName}
                </h3>
                <p className="text-xs text-slate-500">
                  ບົດສອບ: {gradingSubmission.examTitle} (#{gradingSubmission.id})
                </p>
              </div>
              <button onClick={() => setGradingSubmission(null)}>
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 mt-4 space-y-4 text-xs pr-1">
              {Object.entries(gradingAnswers).map(([qId, ans]) => {
                if (ans.type !== 'text') return null;

                return (
                  <div key={qId} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-800">ຂໍ້ສອບແບບຂຽນຕອບ</span>
                      <span className="font-mono text-xs font-bold text-blue-700">
                        ຄະແນນເຕັມ {ans.maxScore}
                      </span>
                    </div>

                    <div className="p-3 bg-white rounded-xl border border-slate-200">
                      <span className="text-[11px] text-slate-400 block mb-0.5">ຄຳຕອບຂອງຜູ້ສອບ:</span>
                      <p className="text-xs font-medium text-slate-900 whitespace-pre-wrap leading-relaxed">
                        {String(ans.chosenAnswer || '(ບໍ່ໄດ້ຕອບ)')}
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">
                          ຄະແນນທີ່ມອບໃຫ້ (0 - {ans.maxScore})
                        </label>
                        <input
                          type="number"
                          min={0}
                          max={ans.maxScore}
                          value={ans.awardedScore || 0}
                          onChange={(e) => handleUpdateEssayScore(qId, Number(e.target.value))}
                          className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl font-mono text-sm font-bold text-blue-800"
                        />
                      </div>
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">ຄຳຕິຊົມ</label>
                        <input
                          type="text"
                          value={ans.teacherFeedback || ''}
                          onChange={(e) => handleUpdateEssayScore(qId, ans.awardedScore || 0, e.target.value)}
                          placeholder="ຄຳແນະນຳເພີ່ມເຕີມ..."
                          className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setGradingSubmission(null)}
                className="px-4 py-2 bg-slate-100 rounded-xl"
              >
                ຍົກເລີກ
              </button>
              <button
                type="button"
                onClick={handleSaveGrading}
                disabled={savingGrade}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-bold rounded-xl shadow-xs"
              >
                {savingGrade ? 'ກຳລັງບັນທຶກ...' : 'ບັນທຶກຄະແນນ'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
