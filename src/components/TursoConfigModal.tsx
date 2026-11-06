import { useState } from 'react';
import { Database, AlertCircle, CheckCircle, X, Save } from 'lucide-react';
import { getTursoConfig, saveTursoConfig, initDatabase, clearTursoConfig } from '../lib/turso';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export function TursoConfigModal({ isOpen, onClose, onSaved }: Props) {
  const currentConfig = getTursoConfig();
  const [url, setUrl] = useState(currentConfig.url || '');
  const [token, setToken] = useState(currentConfig.token || '');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  if (!isOpen) return null;

  const handleTestAndSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim() || !token.trim()) {
      setTestResult({ success: false, message: 'ກະລຸນາປ້ອນທັງ Database URL ແລະ Auth Token' });
      return;
    }

    setTesting(true);
    setTestResult(null);

    try {
      saveTursoConfig(url, token);
      const res = await initDatabase();
      if (res.success) {
        setTestResult({ success: true, message: 'ເຊື່ອມຕໍ່ Turso ສຳເລັດ ແລະ ສ້າງຕາຕະລາງພ້ອມໃຊ້ງານ!' });
        setTimeout(() => {
          onSaved();
          onClose();
        }, 800);
      } else {
        setTestResult({ success: false, message: res.message });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setTestResult({ success: false, message: `ເຊື່ອມຕໍ່ບໍ່ສຳເລັດ: ${msg}` });
    } finally {
      setTesting(false);
    }
  };

  const handleResetToEnv = () => {
    clearTursoConfig();
    const envConfig = getTursoConfig();
    setUrl(envConfig.url || '');
    setToken(envConfig.token || '');
    setTestResult({ success: true, message: 'ຣີເຊັດເປັນຄ່າຈາກ Environment Variables ແລ້ວ' });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-xs">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl border border-slate-200">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">ຕັ້ງຄ່າຖານຂໍ້ມູນ Turso</h3>
              <p className="text-xs text-slate-500">Turso Database Connection (Cloudflare Hosting)</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleTestAndSave} className="mt-4 space-y-4">
          <div className="p-3 bg-blue-50/70 border border-blue-100 rounded-xl text-xs text-blue-800 leading-relaxed">
            ລະບົບນີ້ໃຊ້ <strong>@libsql/client/web</strong> ເຊື່ອມຕໍ່ຖານຂໍ້ມູນ Turso ໂດຍກົງຈາກ Browser.
            ໃນ Cloudflare Pages ສາມາດກຳນົດຄ່າ <code>VITE_TURSO_DATABASE_URL</code> ແລະ <code>VITE_TURSO_AUTH_TOKEN</code>.
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Turso Database URL <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="libsql://your-db-name.turso.io ຫຼື https://..."
              className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
              required
            />
            <p className="mt-1 text-[11px] text-slate-400">ລະບົບຈະປ່ຽນ <code>libsql://</code> ເປັນ <code>https://</code> ໃຫ້ອັດຕະໂນມັດ</p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Turso Auth Token <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={3}
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="eyJhbGciOi..."
              className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono resize-none"
              required
            />
          </div>

          {testResult && (
            <div
              className={`p-3 rounded-xl text-xs flex items-start gap-2 ${
                testResult.success
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : 'bg-rose-50 text-rose-800 border border-rose-200'
              }`}
            >
              {testResult.success ? (
                <CheckCircle className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
              )}
              <div className="flex-1">{testResult.message}</div>
            </div>
          )}

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3">
            <button
              type="button"
              onClick={handleResetToEnv}
              className="text-xs text-slate-500 hover:text-slate-800 underline transition-colors"
            >
              ຣີເຊັດເປັນຄ່າ .env
            </button>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={onClose}
                className="w-1/2 sm:w-auto px-4 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
              >
                ຍົກເລີກ
              </button>
              <button
                type="submit"
                disabled={testing}
                className="w-1/2 sm:w-auto flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 rounded-xl shadow-xs transition-colors"
              >
                {testing ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    ກຳລັງທົດສອບ...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    ທົດສອບ ແລະ ບັນທຶກ
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
