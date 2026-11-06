import { Printer, ArrowLeft, Award, CheckCircle2 } from 'lucide-react';
import type { Submission } from '../types';

interface Props {
  submission: Submission;
  onBack: () => void;
}

export function CertificatePrintView({ submission, onBack }: Props) {
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="w-full max-w-4xl mx-auto py-6 px-4">
      {/* Top Action Toolbar (Hidden in Print) */}
      <div className="no-print mb-6 p-4 bg-white rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between gap-3">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          ກັບຄືນໜ້າຫຼັກ
        </button>

        <button
          onClick={handlePrint}
          className="inline-flex items-center gap-2 px-6 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition-colors cursor-pointer"
        >
          <Printer className="w-4 h-4" />
          ພິມໃບຢັ້ງຢືນ (Print Certificate)
        </button>
      </div>

      {/* Official Certificate Card */}
      <div className="bg-white p-8 sm:p-14 rounded-3xl border-4 border-double border-amber-600/60 shadow-xl print:shadow-none print:border-4 print:border-double print:p-8 text-center text-slate-900 relative overflow-hidden">
        {/* Subtle decorative background watermark */}
        <div className="absolute inset-0 flex items-center justify-center opacity-4 pointer-events-none">
          <Award className="w-96 h-96 text-amber-900" />
        </div>

        {/* Header Block */}
        <div className="relative z-10 pb-6 border-b border-amber-300">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-700">
            ສາທາລະນະລັດ ປະຊາທິປະໄຕ ປະຊາຊົນລາວ
          </p>
          <p className="text-xs font-semibold text-slate-700 mt-0.5">
            ສັນຕິພາບ ເອກະລາດ ປະຊາທິປະໄຕ ເອກະພາບ ວັດທະນະຖາວອນ
          </p>
          <div className="my-3 flex items-center justify-center gap-2">
            <span className="w-16 h-0.5 bg-amber-600" />
            <span className="text-amber-700 text-sm">❖</span>
            <span className="w-16 h-0.5 bg-amber-600" />
          </div>

          <h2 className="text-sm sm:text-base font-bold text-blue-900 uppercase tracking-wide mt-2">
            ລະບົບສອບເສັງອາສາສະໝັກອອນລາຍ (LAO VOLUNTEER EXAMINATION)
          </h2>
        </div>

        {/* Certificate Title */}
        <div className="relative z-10 my-8 sm:my-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-amber-100 text-amber-700 mb-3 shadow-inner">
            <Award className="w-8 h-8" />
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-amber-900">
            ໃບຢັ້ງຢືນການສອບເສັງຜ່ານ
          </h1>
          <p className="text-xs font-semibold tracking-widest text-slate-500 uppercase mt-1">
            CERTIFICATE OF ACHIEVEMENT
          </p>
        </div>

        {/* Certificate Body Prose */}
        <div className="relative z-10 max-w-2xl mx-auto space-y-4 text-sm sm:text-base leading-relaxed text-slate-800">
          <p className="text-xs text-slate-500 uppercase tracking-wider">ຂໍຢັ້ງຢືນວ່າ (THIS IS TO CERTIFY THAT)</p>

          <div className="py-2">
            <span className="text-2xl sm:text-3xl font-bold text-blue-950 border-b-2 border-slate-900 pb-1 px-8 inline-block">
              {submission.studentInfo?.fullName || 'ອາສາສະໝັກ'}
            </span>
          </div>

          <p className="text-xs text-slate-600">
            ອາຍຸ: <strong>{submission.studentInfo?.age || '-'}</strong> ປີ, ເພດ: <strong>{submission.studentInfo?.gender || '-'}</strong>
            {submission.studentInfo?.village && `, ບ້ານ ${submission.studentInfo.village}`}
            {submission.studentInfo?.district && `, ເມືອງ ${submission.studentInfo.district}`}
            {submission.studentInfo?.province && `, ແຂວງ ${submission.studentInfo.province}`}
            {submission.studentInfo?.organization && ` (${submission.studentInfo.organization})`}
          </p>

          <p className="text-slate-800 pt-2">
            ໄດ້ຜ່ານການສອບເສັງວັດແທກຄວາມຮູ້ໃນຫຼັກສູດ:
          </p>

          <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-2xl max-w-xl mx-auto">
            <h3 className="text-base font-bold text-amber-950">{submission.examTitle}</h3>
            <p className="text-xs text-amber-800 mt-0.5">ວິຊາ: {submission.subject}</p>
          </div>

          <div className="flex items-center justify-center gap-6 pt-2 font-mono text-xs sm:text-sm">
            <div className="px-4 py-1.5 bg-slate-100 rounded-xl">
              <span className="text-slate-500 text-[11px] block">ຄະແນນທີ່ໄດ້:</span>
              <strong className="text-base text-slate-900">{submission.totalScore} / {submission.maxTotalScore}</strong>
            </div>
            <div className="px-4 py-1.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl">
              <span className="text-emerald-600 text-[11px] block">ເປີເຊັນ:</span>
              <strong className="text-base font-bold">{submission.percentage}% (ຜ່ານ)</strong>
            </div>
          </div>
        </div>

        {/* Footer & Signatures */}
        <div className="relative z-10 mt-12 sm:mt-16 pt-8 border-t border-slate-200 grid grid-cols-2 gap-8 text-xs text-slate-700">
          <div>
            <p className="text-slate-500">ວັນທີສອບເສັງ ແລະ ອອກໃບຢັ້ງຢືນ</p>
            <p className="font-semibold text-slate-900 mt-1">
              {submission.studentInfo?.examDate || submission.submittedAt?.slice(0, 10)}
            </p>
            <p className="font-mono text-[10px] text-slate-400 mt-0.5">REF ID: #{submission.id}</p>
          </div>

          <div>
            <p className="font-semibold text-slate-800">ອາຈານຜູ້ຮັບຜິດຊອບຫຼັກສູດ</p>
            <div className="h-14 flex items-end justify-center">
              <span className="border-b border-dashed border-slate-400 w-44 block" />
            </div>
            <p className="text-slate-800 font-semibold mt-1">({submission.teacherName || 'ຄະນະກຳມະການສອບເສັງ'})</p>
          </div>
        </div>
      </div>
    </div>
  );
}
