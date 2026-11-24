import { useEffect } from 'react';
import {
  X,
  Eye,
  CheckCircle2,
  XCircle,
  MinusCircle,
  FileText,
  User,
  Calendar,
  MapPin,
  Building2,
  AlertCircle,
  Clock,
} from 'lucide-react';
import type { Exam, Submission } from '../types';

interface Props {
  submission: Submission;
  exam?: Exam;
  onClose: () => void;
  footerLeft?: React.ReactNode;
  footerRight?: React.ReactNode;
}

export function SubmissionReviewModal({ submission, exam, onClose, footerLeft, footerRight }: Props) {
  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Compute right/wrong/essay counts for the summary strip
  const stats = (() => {
    let correctCount = 0;
    let wrongCount = 0;
    let unansweredCount = 0;
    let essayCount = 0;

    if (exam) {
      exam.questions.forEach((q) => {
        const ans = submission.answers?.[q.id];
        if (q.type === 'text') {
          essayCount++;
          return;
        }
        const isUnanswered =
          !ans ||
          (q.type === 'single_choice' && (typeof ans.chosenAnswer !== 'number' || ans.chosenAnswer < 0)) ||
          (q.type === 'multiple_choice' && (!Array.isArray(ans.chosenAnswer) || ans.chosenAnswer.length === 0));

        if (ans?.isCorrect) {
          correctCount++;
        } else if (isUnanswered) {
          unansweredCount++;
          wrongCount++;
        } else {
          wrongCount++;
        }
      });
    } else {
      Object.values(submission.answers || {}).forEach((ans) => {
        if (ans.type === 'text') {
          essayCount++;
        } else if (ans.isCorrect) {
          correctCount++;
        } else {
          wrongCount++;
        }
      });
    }

    return { correctCount, wrongCount, unansweredCount, essayCount };
  })();

  const totalQuestions = exam ? exam.questions.length : Object.keys(submission.answers || {}).length;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-3 sm:p-4 backdrop-blur-xs"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`ກວດເບິ່ງບົດສອບເສັງຂອງ ${submission.studentInfo?.fullName || ''}`}
    >
      <div
        className="w-full max-w-3xl bg-white rounded-3xl shadow-2xl border border-slate-200 max-h-[92dvh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-4 sm:px-6 py-4 border-b border-slate-100 flex items-start justify-between gap-3 bg-white shrink-0">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-base sm:text-lg font-bold text-slate-900 truncate">
                {submission.studentInfo?.fullName || 'ບໍ່ລະບຸຊື່'}
              </h3>
              <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-lg border border-blue-100">
                #{submission.id}
              </span>
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-600 bg-slate-100 px-2.5 py-0.5 rounded-lg border border-slate-200">
                <Eye className="w-3 h-3 text-slate-500" />
                ອ່ານຢ່າງດຽວ (Read-only)
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1 truncate">
              ບົດສອບ: <strong className="text-slate-700">{submission.examTitle}</strong>
              {submission.subject ? ` · ວິຊາ: ${submission.subject}` : ''}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors shrink-0 cursor-pointer"
            title="ປິດ"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="overflow-y-auto flex-1 px-5 sm:px-6 py-4 space-y-5 text-xs">
          {/* Score Overview Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-center font-mono">
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80">
              <span className="text-[11px] text-slate-500 block font-sans">ຄະແນນປາລະໄນ</span>
              <strong className="text-base text-slate-900">
                {submission.objectiveScore} / {submission.maxObjectiveScore}
              </strong>
            </div>
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80">
              <span className="text-[11px] text-slate-500 block font-sans">ຄະແນນອັດຕະໄນ</span>
              <strong className="text-base text-slate-900">
                {submission.isFullyGraded
                  ? `${submission.essayScore} / ${submission.maxEssayScore}`
                  : 'ລໍຖ້າກວດ'}
              </strong>
            </div>
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80">
              <span className="text-[11px] text-slate-500 block font-sans">ຄະແນນລວມ</span>
              <strong className="text-base text-blue-800">
                {submission.totalScore} / {submission.maxTotalScore}
              </strong>
            </div>
            <div
              className={`p-3 rounded-2xl border ${
                submission.passed
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : 'bg-rose-50 border-rose-200 text-rose-800'
              }`}
            >
              <span className="text-[11px] block font-sans">ຜົນສອບ ({submission.passed ? 'ຜ່ານ' : 'ບໍ່ຜ່ານ'})</span>
              <strong className="text-base font-bold">{submission.percentage}%</strong>
            </div>
          </div>

          {/* Candidate Info + Right/Wrong Counter */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/70 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-700">
              <div className="flex items-center gap-2">
                <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>
                  ອາຍຸ: <strong>{submission.studentInfo?.age || '-'}</strong> ປີ · ເພດ:{' '}
                  <strong>{submission.studentInfo?.gender || '-'}</strong>
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>
                  ວັນທີສອບ: <strong>{submission.studentInfo?.examDate || submission.submittedAt?.slice(0, 10) || '-'}</strong>
                </span>
              </div>
              <div className="flex items-center gap-2 sm:col-span-2">
                <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>
                  ທີ່ຢູ່:{' '}
                  <strong>
                    ບ້ານ {submission.studentInfo?.village || '-'}, ເມືອງ {submission.studentInfo?.district || '-'}, ແຂວງ{' '}
                    {submission.studentInfo?.province || '-'}
                  </strong>
                </span>
              </div>
              {submission.studentInfo?.organization && (
                <div className="flex items-center gap-2 sm:col-span-2">
                  <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>
                    ໜ່ວຍງານ / ສັງກັດ: <strong>{submission.studentInfo.organization}</strong>
                  </span>
                </div>
              )}
            </div>

            {/* Quick Right/Wrong Tally */}
            <div className="pt-2.5 border-t border-slate-200/80 flex flex-wrap items-center gap-2 text-[11px] font-semibold">
              <span className="text-slate-500">ສະຫຼຸບລາຍຂໍ້ ({totalQuestions} ຂໍ້):</span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-emerald-100 text-emerald-800">
                <CheckCircle2 className="w-3.5 h-3.5" />
                ຖືກ {stats.correctCount} ຂໍ້
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-rose-100 text-rose-800">
                <XCircle className="w-3.5 h-3.5" />
                ຜິດ {stats.wrongCount} ຂໍ້
              </span>
              {stats.essayCount > 0 && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-amber-100 text-amber-800">
                  <FileText className="w-3.5 h-3.5" />
                  ຂໍ້ຂຽນຕອບ {stats.essayCount} ຂໍ້
                </span>
              )}
            </div>
          </div>

          {/* Ordered Question List (Read-only, No Filters) */}
          <div className="space-y-3.5">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-blue-600" />
              ລາຍລະອຽດຄຳຕອບແຕ່ລະຂໍ້ ({totalQuestions} ຂໍ້)
            </h4>

            {exam ? (
              exam.questions.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200 text-slate-400">
                  ບົດສອບເສັງນີ້ຍັງບໍ່ມີລາຍການຂໍ້ສອບ
                </div>
              ) : (
                <div className="space-y-4">
                  {exam.questions.map((q, idx) => {
                    const ansItem = submission.answers?.[q.id];
                    const isText = q.type === 'text';

                    // Determine chosen indices for choice questions
                    const chosenSingle =
                      q.type === 'single_choice' && typeof ansItem?.chosenAnswer === 'number'
                        ? ansItem.chosenAnswer
                        : -1;
                    const chosenMulti =
                      q.type === 'multiple_choice' && Array.isArray(ansItem?.chosenAnswer)
                        ? ansItem.chosenAnswer
                        : [];

                    const isUnanswered = isText
                      ? !String(ansItem?.chosenAnswer || '').trim()
                      : q.type === 'single_choice'
                      ? chosenSingle < 0
                      : chosenMulti.length === 0;

                    const isCorrect = !isText && Boolean(ansItem?.isCorrect);

                    const cardStyle = isText
                      ? 'bg-slate-50/70 border-slate-200'
                      : isCorrect
                      ? 'bg-emerald-50/40 border-emerald-200'
                      : 'bg-rose-50/40 border-rose-200';

                    return (
                      <div key={q.id} className={`p-4 rounded-2xl border ${cardStyle} space-y-3`}>
                        {/* Question Header */}
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div className="flex items-start gap-2.5 flex-1 min-w-0">
                            <span
                              className={`w-6 h-6 rounded-lg font-mono text-xs font-bold flex items-center justify-center shrink-0 mt-0.5 ${
                                isText
                                  ? 'bg-slate-700 text-white'
                                  : isCorrect
                                  ? 'bg-emerald-600 text-white'
                                  : 'bg-rose-600 text-white'
                              }`}
                            >
                              {idx + 1}
                            </span>
                            <div className="min-w-0">
                              <p className="text-xs sm:text-sm font-bold text-slate-900 leading-relaxed whitespace-pre-wrap">
                                {q.text}
                              </p>
                              <span className="inline-block mt-1 text-[10px] font-medium text-slate-500 bg-white px-2 py-0.5 rounded-md border border-slate-200">
                                {q.type === 'single_choice' && 'ເລືອກຄຳຕອບດຽວ'}
                                {q.type === 'multiple_choice' && 'ເລືອກຫຼາຍຄຳຕອບ'}
                                {q.type === 'text' && 'ຂຽນຕອບ (ອັດຕະໄນ)'}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            {isText ? (
                              <span
                                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold ${
                                  submission.isFullyGraded
                                    ? 'bg-blue-100 text-blue-800'
                                    : 'bg-amber-100 text-amber-800'
                                }`}
                              >
                                <Clock className="w-3.5 h-3.5" />
                                {submission.isFullyGraded ? 'ກວດແລ້ວ' : 'ລໍຖ້າກວດ'}
                              </span>
                            ) : isCorrect ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-emerald-100 text-emerald-800">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                ຖືກຕ້ອງ
                              </span>
                            ) : isUnanswered ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-slate-200 text-slate-700">
                                <MinusCircle className="w-3.5 h-3.5" />
                                ບໍ່ໄດ້ຕອບ
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-rose-100 text-rose-800">
                                <XCircle className="w-3.5 h-3.5" />
                                ຜິດ
                              </span>
                            )}

                            <span className="font-mono text-xs font-bold text-slate-800 bg-white px-2.5 py-1 rounded-lg border border-slate-200">
                              {ansItem?.awardedScore ?? 0} / {q.points} ຄະແນນ
                            </span>
                          </div>
                        </div>

                        {/* Options List for Choice Questions (All options shown read-only) */}
                        {!isText && q.options && q.options.length > 0 && (
                          <div className="space-y-2 pt-1">
                            {q.options.map((optText, optIdx) => {
                              const isStudentSelected =
                                q.type === 'single_choice'
                                  ? chosenSingle === optIdx
                                  : chosenMulti.includes(optIdx);

                              const isCorrectOption =
                                q.type === 'single_choice'
                                  ? q.correctAnswer === optIdx
                                  : Array.isArray(q.correctAnswer) && q.correctAnswer.includes(optIdx);

                              let optionClass = 'bg-white border-slate-200 text-slate-700';
                              let badge: React.ReactNode = null;
                              let indicator: React.ReactNode = (
                                <span className="w-5 h-5 rounded-md bg-slate-100 text-slate-500 font-mono text-[11px] font-bold flex items-center justify-center shrink-0">
                                  {String.fromCharCode(65 + optIdx)}
                                </span>
                              );

                              if (isStudentSelected && isCorrectOption) {
                                optionClass = 'bg-emerald-50 border-emerald-400 text-emerald-950 font-semibold';
                                indicator = <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />;
                                badge = (
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-600 text-white shrink-0">
                                    ຄຳຕອບຜູ້ສອບ · ສະເລີຍ
                                  </span>
                                );
                              } else if (isStudentSelected && !isCorrectOption) {
                                optionClass = 'bg-rose-50 border-rose-400 text-rose-950 font-semibold';
                                indicator = <XCircle className="w-5 h-5 text-rose-600 shrink-0" />;
                                badge = (
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-rose-600 text-white shrink-0">
                                    ຄຳຕອບຜູ້ສອບ (ຜິດ)
                                  </span>
                                );
                              } else if (!isStudentSelected && isCorrectOption) {
                                optionClass =
                                  'bg-emerald-50/40 border-emerald-300 border-dashed text-emerald-900 font-medium';
                                indicator = <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />;
                                badge = (
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 border border-emerald-200 shrink-0">
                                    ສະເລີຍທີ່ຖືກຕ້ອງ
                                  </span>
                                );
                              }

                              return (
                                <div
                                  key={optIdx}
                                  className={`px-3 py-2.5 rounded-xl border flex flex-wrap items-center justify-between gap-2 transition-colors ${optionClass}`}
                                >
                                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                    {indicator}
                                    <span className="font-mono text-[11px] font-bold opacity-70 shrink-0">
                                      {String.fromCharCode(65 + optIdx)}.
                                    </span>
                                    <span className="text-xs leading-relaxed break-words">{optText}</span>
                                  </div>
                                  {badge}
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {/* Essay / Text Question Display */}
                        {isText && (
                          <div className="space-y-2.5 pt-1">
                            <div className="p-3 bg-white rounded-xl border border-slate-200">
                              <span className="text-[11px] font-semibold text-slate-400 block mb-1">
                                ຄຳຕອບຂອງຜູ້ສອບ:
                              </span>
                              <p className="text-xs text-slate-900 whitespace-pre-wrap leading-relaxed">
                                {String(ansItem?.chosenAnswer || '').trim() || '(ບໍ່ໄດ້ຕອບ)'}
                              </p>
                            </div>

                            {q.sampleAnswer && (
                              <div className="p-3 bg-blue-50/70 rounded-xl border border-blue-200">
                                <span className="text-[11px] font-semibold text-blue-700 block mb-1">
                                  ສະເລີຍ / ຄຳຕອບຕົວຢ່າງ:
                                </span>
                                <p className="text-xs text-blue-950 whitespace-pre-wrap leading-relaxed">
                                  {q.sampleAnswer}
                                </p>
                              </div>
                            )}

                            {ansItem?.teacherFeedback && (
                              <div className="p-2.5 bg-amber-50/70 rounded-xl border border-amber-200 text-amber-900">
                                <span className="font-semibold">ຄຳຕິຊົມຈາກອາຈານ: </span>
                                <span>{ansItem.teacherFeedback}</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )
            ) : (
              /* Fallback if original exam template was deleted */
              <div className="space-y-3">
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <span>
                    ບໍ່ພົບຕົ້ນສະບັບບົດສອບເສັງໃນລະບົບ (ບົດສອບອາດຖືກລຶບອອກແລ້ວ) — ສະແດງຂໍ້ມູນຄຳຕອບ ແລະ ຜົນຄະແນນທີ່ບັນທຶກໄວ້
                  </span>
                </div>

                {Object.entries(submission.answers || {}).map(([qId, ans], idx) => {
                  const isText = ans.type === 'text';
                  const isCorrect = !isText && Boolean(ans.isCorrect);

                  return (
                    <div
                      key={qId}
                      className={`p-3.5 rounded-2xl border ${
                        isText
                          ? 'bg-slate-50 border-slate-200'
                          : isCorrect
                          ? 'bg-emerald-50/50 border-emerald-200'
                          : 'bg-rose-50/50 border-rose-200'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <span className="font-bold text-slate-800">ຂໍ້ທີ {idx + 1}</span>
                        <div className="flex items-center gap-2">
                          {!isText && (
                            <span
                              className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${
                                isCorrect ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                              }`}
                            >
                              {isCorrect ? 'ຖືກຕ້ອງ' : 'ຜິດ'}
                            </span>
                          )}
                          <span className="font-mono font-bold text-slate-700">
                            {ans.awardedScore} / {ans.maxScore} ຄະແນນ
                          </span>
                        </div>
                      </div>
                      <p className="text-xs text-slate-600">
                        ຄຳຕອບທີ່ບັນທຶກ:{' '}
                        <strong>
                          {isText
                            ? String(ans.chosenAnswer || '(ບໍ່ໄດ້ຕອບ)')
                            : Array.isArray(ans.chosenAnswer)
                            ? ans.chosenAnswer.length > 0
                              ? ans.chosenAnswer.map((i) => `ຕົວເລືອກ ${String.fromCharCode(65 + i)}`).join(', ')
                              : 'ບໍ່ໄດ້ຕອບ'
                            : typeof ans.chosenAnswer === 'number' && ans.chosenAnswer >= 0
                            ? `ຕົວເລືອກ ${String.fromCharCode(65 + ans.chosenAnswer)}`
                            : 'ບໍ່ໄດ້ຕອບ'}
                        </strong>
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 sm:px-6 py-3.5 border-t border-slate-100 bg-slate-50/60 flex flex-wrap items-center justify-between gap-2 shrink-0">
          <div>{footerLeft}</div>
          <div className="flex items-center gap-2">
            {footerRight}
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold rounded-xl transition-colors cursor-pointer"
            >
              ປິດ
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
