import { useState, useEffect } from 'react';
import { UserCheck, GraduationCap, ShieldCheck, KeyRound, LogIn, AlertCircle, RefreshCw, BookOpen } from 'lucide-react';
import type { Teacher, AuthSession, AuthRole } from '../types';
import { fetchTeachers, getSettings } from '../lib/turso';

interface Props {
  isOpen: boolean;
  onLoginSuccess: (session: AuthSession) => void;
  onOpenTursoConfig: () => void;
  isTursoConfigured: boolean;
}

export function LoginModal({ isOpen, onLoginSuccess, onOpenTursoConfig, isTursoConfigured }: Props) {
  const [role, setRole] = useState<'student' | 'teacher' | 'admin'>('student');
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingTeachers, setLoadingTeachers] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    // Load cached teachers immediately
    const cached = localStorage.getItem('emscps_teachers_cache');
    if (cached) {
      try {
        const parsed = JSON.parse(cached) as Teacher[];
        setTeachers(parsed);
        if (parsed.length > 0 && !selectedTeacherId) {
          setSelectedTeacherId(parsed[0].id);
        }
      } catch {
        // ignore
      }
    }

    // Refresh teachers from Turso in background
    if (isTursoConfigured) {
      loadTeachers();
    }
  }, [isOpen, isTursoConfigured]);

  const loadTeachers = async () => {
    setLoadingTeachers(true);
    try {
      const list = await fetchTeachers();
      setTeachers(list);
      if (list.length > 0 && !selectedTeacherId) {
        setSelectedTeacherId(list[0].id);
      }
    } catch (err: unknown) {
      console.warn('Teacher sync warn:', err);
    } finally {
      setLoadingTeachers(false);
    }
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (role === 'student') {
        // Examinee requires no password
        const session: AuthSession = { role: 'student' };
        localStorage.setItem('emscps_auth_session', JSON.stringify(session));
        onLoginSuccess(session);
      } else if (role === 'admin') {
        const settings = await getSettings();
        if (password.trim() === settings.adminPassword.trim()) {
          const session: AuthSession = { role: 'admin' };
          localStorage.setItem('emscps_auth_session', JSON.stringify(session));
          onLoginSuccess(session);
        } else {
          setError('ລະຫັດຜ່ານ Admin ບໍ່ຖືກຕ້ອງ!');
        }
      } else if (role === 'teacher') {
        if (!selectedTeacherId) {
          setError('ກະລຸນາເລືອກຊື່ອາຈານ');
          setLoading(false);
          return;
        }

        const teacher = teachers.find((t) => t.id === selectedTeacherId);
        if (!teacher) {
          setError('ບໍ່ພົບຂໍ້ມູນອາຈານທີ່ເລືອກ');
          setLoading(false);
          return;
        }

        if (password.trim() === teacher.password.trim()) {
          const session: AuthSession = { role: 'teacher', teacher };
          localStorage.setItem('emscps_auth_session', JSON.stringify(session));
          onLoginSuccess(session);
        } else {
          setError('ລະຫັດຜ່ານອາຈານບໍ່ຖືກຕ້ອງ! ກະລຸນາກວດສອບຄືນ.');
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-xs">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 sm:p-7 shadow-2xl border border-slate-200">
        {/* Header */}
        <div className="text-center pb-5 border-b border-slate-100">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-blue-600 text-white shadow-md shadow-blue-500/20 mb-3">
            <BookOpen className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">ລະບົບສອບເສັງອາສາສະໝັກອອນລາຍ</h2>
          <p className="text-xs font-semibold text-blue-700 mt-0.5">Lao Volunteer Online Examination</p>
          <p className="text-[11px] text-slate-500 mt-1">ເລືອກບົດບາດຂອງທ່ານເພື່ອເຂົ້າສູ່ລະບົບ</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-5 space-y-4 text-xs">
          {/* Role selector dropdown */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              ເລືອກບົດບາດ <span className="text-rose-500">*</span>
            </label>
            <select
              value={role}
              onChange={(e) => {
                setRole(e.target.value as 'student' | 'teacher' | 'admin');
                setPassword('');
                setError(null);
              }}
              className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold text-slate-800"
            >
              <option value="student">ຜູ້ສອບເສັງ (ອາສາສະໝັກ)</option>
              <option value="teacher">ອາຈານ (ຜູ້ອອກຂໍ້ສອບ)</option>
              <option value="admin">Admin (ຜູ້ດູແລລະບົບ)</option>
            </select>
          </div>

          {/* Student description */}
          {role === 'student' && (
            <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl text-blue-900 leading-relaxed">
              ອາສາສະໝັກສາມາດເຂົ້າໄປເລືອກບົດສອບເສັງ ແລະ ເລີ່ມຕົ້ນສອບໄດ້ທັນທີ ໂດຍບໍ່ຈຳເປັນຕ້ອງໃຊ້ລະຫັດຜ່ານ.
            </div>
          )}

          {/* Teacher Selection */}
          {role === 'teacher' && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-slate-700">
                  ເລືອກຊື່ອາຈານ <span className="text-rose-500">*</span>
                </label>
                {loadingTeachers && (
                  <span className="flex items-center gap-1 text-[11px] text-blue-600">
                    <RefreshCw className="w-3 h-3 animate-spin" />
                    ກຳລັງອັບເດດ...
                  </span>
                )}
              </div>

              {teachers.length === 0 ? (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
                  ຍັງບໍ່ມີລາຍຊື່ອາຈານໃນລະບົບ. ກະລຸນາເຂົ້າ Admin ເພື່ອສ້າງ User ອາຈານ.
                </div>
              ) : (
                <select
                  value={selectedTeacherId}
                  onChange={(e) => {
                    setSelectedTeacherId(e.target.value);
                    setPassword('');
                    setError(null);
                  }}
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800"
                  required
                >
                  <option value="" disabled>-- ເລືອກຊື່ອາຈານ --</option>
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.fullName} ({t.department || t.subject})
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

          {/* Password (for Teacher & Admin) */}
          {(role === 'teacher' || role === 'admin') && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                ລະຫັດຜ່ານ <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={role === 'admin' ? 'ໃສ່ລະຫັດ Admin (ເລີ່ມຕົ້ນ: admin2026)' : 'ໃສ່ລະຫັດຜ່ານຂອງອາຈານ'}
                  autoComplete="new-password"
                  className="w-full pl-9 pr-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-sans"
                  required
                />
                <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
              </div>
            </div>
          )}

          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || (role === 'teacher' && teachers.length === 0)}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-semibold text-sm rounded-xl shadow-md shadow-blue-500/20 transition-all cursor-pointer"
          >
            {loading ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ກຳລັງກວດສອບ...
              </>
            ) : (
              <>
                <LogIn className="w-4 h-4" />
                {role === 'student' ? 'ເຂົ້າສູ່ຫ້ອງສອບເສັງ' : 'ເຂົ້າສູ່ລະບົບ'}
              </>
            )}
          </button>
        </form>

        {/* Footer info & Turso config quick trigger */}
        <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${isTursoConfigured ? 'bg-emerald-500' : 'bg-amber-500'}`} />
            <span>{isTursoConfigured ? 'Turso ພ້ອມໃຊ້ງານ' : 'ຍັງບໍ່ໄດ້ເຊື່ອມຕໍ່ Turso'}</span>
          </div>
          <button
            type="button"
            onClick={onOpenTursoConfig}
            className="text-blue-600 hover:text-blue-800 font-medium hover:underline"
          >
            ຕັ້ງຄ່າຖານຂໍ້ມູນ
          </button>
        </div>
      </div>
    </div>
  );
}
