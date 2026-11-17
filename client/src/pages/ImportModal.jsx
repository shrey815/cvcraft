import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { FileText, Loader2, UploadCloud, X } from 'lucide-react';
import { api } from '../lib/api.js';
import { Button, Label, Modal, Textarea, cx } from '../components/ui.jsx';
import RolePicker from '../components/RolePicker.jsx';

const MAX_MB = 5;
const OK_EXT = /\.(pdf|docx|txt)$/i;

/** Upload an existing CV → pick target role (+ optional JD) → opens the editor on Job Match. */
export default function ImportModal({ open, onClose, roles, initialFile }) {
  const navigate = useNavigate();
  const input = useRef(null);
  const [file, setFile] = useState(null);
  const [drag, setDrag] = useState(false);
  const [role, setRole] = useState('full-stack-developer');
  const [jd, setJd] = useState('');
  const [busy, setBusy] = useState(false);

  // A file dropped on the dashboard arrives pre-selected
  useEffect(() => {
    if (open && initialFile) setFile(initialFile);
  }, [open, initialFile]);

  const pick = (f) => {
    if (!f) return;
    if (!OK_EXT.test(f.name)) return toast.error(f.name.toLowerCase().endsWith('.doc') ? 'Save the .doc file as .docx or PDF first.' : 'Upload a PDF, Word (.docx) or .txt file.');
    if (f.size > MAX_MB * 1024 * 1024) return toast.error(`File is too large (max ${MAX_MB} MB).`);
    setFile(f);
  };

  const submit = async () => {
    if (!file) return toast.error('Choose your CV file first.');
    setBusy(true);
    const form = new FormData();
    form.append('file', file);
    form.append('targetRole', role);
    if (jd.trim()) form.append('jobDescription', jd.trim());
    try {
      const { resume, method, warnings, found } = await api.upload('/resumes/import', form);
      navigate(`/cv/${resume._id}?imported=1`, { state: { importInfo: { method, warnings, found, fileName: file.name } } });
    } catch (e) {
      toast.error(e.message, { duration: 6000 });
      setBusy(false);
    }
  };

  const close = () => {
    if (busy) return;
    setFile(null);
    setJd('');
    onClose();
  };

  return (
    <Modal open={open} onClose={close} title="Import your existing CV" wide>
      {busy ? (
        <div className="flex flex-col items-center py-14 text-center">
          <Loader2 className="h-10 w-10 animate-spin text-brand-600" />
          <p className="mt-4 font-medium text-slate-800">Reading your CV…</p>
          <p className="mt-1 text-sm text-slate-500">Finding your sections and checking them against the role. This can take up to 30 seconds.</p>
        </div>
      ) : (
        <div className="space-y-6">
          <div>
            <Label>1. Your current CV</Label>
            {file ? (
              <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                <span className="grid h-10 w-10 place-items-center rounded-lg bg-white text-brand-600 ring-1 ring-slate-200"><FileText className="h-5 w-5" /></span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{file.name}</p>
                  <p className="text-xs text-slate-500">{(file.size / 1024).toFixed(0)} KB</p>
                </div>
                <button onClick={() => setFile(null)} className="rounded-lg p-1.5 text-slate-400 hover:bg-white hover:text-slate-600" aria-label="Remove file"><X className="h-4 w-4" /></button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => input.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
                onDragLeave={() => setDrag(false)}
                onDrop={(e) => { e.preventDefault(); setDrag(false); pick(e.dataTransfer.files?.[0]); }}
                className={cx('flex w-full flex-col items-center rounded-xl border-2 border-dashed px-6 py-8 text-center transition', drag ? 'border-brand-500 bg-brand-50' : 'border-slate-300 hover:border-brand-400 hover:bg-slate-50')}
              >
                <UploadCloud className="h-9 w-9 text-brand-500" />
                <span className="mt-2 text-sm font-medium text-slate-700">Drop your CV here or click to browse</span>
                <span className="mt-1 text-xs text-slate-500">PDF, Word (.docx) or .txt · up to {MAX_MB} MB · scanned/photo CVs can't be read</span>
              </button>
            )}
            <input ref={input} type="file" accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain" className="hidden" onChange={(e) => { pick(e.target.files?.[0]); e.target.value = ''; }} />
          </div>

          <div>
            <Label>2. The role you're applying for</Label>
            <RolePicker roles={roles} value={role} onChange={setRole} />
          </div>

          <Textarea label="3. Job description" hint="optional, recommended" rows={4} placeholder="Paste the job posting to see exactly which skills and keywords your CV is missing…" value={jd} onChange={(e) => setJd(e.target.value)} />

          <p className="text-xs text-slate-400">Your file is only read to fill in the editor and is not stored. Your original CV stays unchanged; a new editable copy is created.</p>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={close}>Cancel</Button>
            <Button onClick={submit} disabled={!file}>Import & tailor</Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
