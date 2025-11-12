import { useEffect, useMemo, useRef, useState } from 'react';
import { inspect, startDownload, fetchJobs, requestDownloadUrl, getHealth } from './api.js';
import { VideoMetaCard } from './components/VideoMetaCard.js';
import { FormatsTable } from './components/FormatsTable.js';
import { JobsDrawer } from './components/JobsDrawer.js';
import { OptionsPanel } from './components/OptionsPanel.js';
import { subscribeToJob } from './store.js';
import axios from 'axios';

const defaultOptions = {
  preset: 'best',
  audioFormat: 'mp3',
  outputTemplate: '%(title).100s-%(id)s.%(ext)s',
  parallelFragments: 8,
  embedMetadata: false,
  subtitles: '',
  embedSubs: false,
};

export default function App() {
  const [url, setUrl] = useState('');
  const [info, setInfo] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [options, setOptions] = useState<any>(defaultOptions);
  const [jobs, setJobs] = useState<Record<string, any>>({});
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const subsRef = useRef(new Map<string, () => void>());
  const [health, setHealth] = useState<any>(null);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    fetchJobs().then((list) => {
      const mapped: Record<string, any> = {};
      list.forEach((job: any) => {
        mapped[job.id] = job;
        attach(job.id);
      });
      setJobs(mapped);
    });
    getHealth().then(setHealth).catch(() => {});
    return () => {
      subsRef.current.forEach((unsub) => unsub());
    };
  }, []);

  const jobArray = useMemo(() => Object.values(jobs).sort((a, b) => b.createdAt - a.createdAt), [jobs]);

  function attach(jobId: string) {
    if (subsRef.current.has(jobId)) return;
    const unsub = subscribeToJob(jobId, (payload) => {
      setJobs((prev) => ({ ...prev, [payload.id]: payload }));
    });
    subsRef.current.set(jobId, unsub);
  }

  async function handleInspect() {
    if (!url) return;
    setLoading(true);
    setError(null);
    try {
      const data = await inspect(url);
      setInfo(data);
    } catch (err: any) {
      setError(err.response?.data?.error ?? err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleDownload() {
    if (!url) {
      setToast('Paste a URL first ✨');
      return;
    }
    const payload = {
      url,
      preset: options.preset,
      options: {
        format: options.format || undefined,
        audioFormat: options.audioFormat,
        subtitles: options.subtitles
          ? {
              langs: options.subtitles.split(',').map((lang: string) => lang.trim()).filter(Boolean),
              embed: options.embedSubs ?? false,
            }
          : undefined,
        embedMetadata: options.embedMetadata,
        outputTemplate: options.outputTemplate,
        parallelFragments: options.parallelFragments,
        speedLimit: options.speedLimit ? Number(options.speedLimit) : 0,
        proxy: options.proxy,
      },
    };
    try {
      const { jobId } = await startDownload(payload);
      setToast('Download queued 💖');
      const job = await axios.get(`/api/jobs/${jobId}`).then((res) => res.data);
      setJobs((prev) => ({ ...prev, [job.id]: job }));
      attach(jobId);
    } catch (err: any) {
      setToast(err.response?.data?.error ?? err.message);
    }
  }

  async function handleDownloadLink(jobId: string) {
    try {
      const { url } = await requestDownloadUrl(jobId);
      window.open(url, '_blank');
    } catch (err: any) {
      setToast(err.response?.data?.error ?? err.message);
    }
  }

  async function handleCancel(jobId: string) {
    await axios.delete(`/api/jobs/${jobId}`);
  }

  return (
    <div className="min-h-screen text-midnight">
      <header className="sticky top-0 bg-white/70 backdrop-blur z-20 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-4 flex flex-wrap gap-3 justify-between items-center">
          <h1 className="text-2xl font-bold text-midnight">ytweb</h1>
          <div className="flex gap-3 items-center text-xs uppercase tracking-widest">
            {health && <span className="text-midnight/60">yt-dlp {health.ytDlpVersion ?? 'n/a'}</span>}
            <button className="px-3 py-1 rounded-full bg-blush/80" onClick={() => setTheme((t) => (t === 'light' ? 'dark' : 'light'))}>
              {theme === 'light' ? 'Moon' : 'Sun'}
            </button>
          </div>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-4 py-10 space-y-8">
        <section className="bg-white/80 rounded-3xl shadow-dreamy p-6">
          <div className="flex flex-col gap-4">
            <label className="text-sm font-semibold">Paste a video URL</label>
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                className="flex-1 rounded-3xl border border-transparent focus:border-rose-300 bg-blush/60 px-5 py-3"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleInspect();
                }}
                placeholder="https://..."
              />
              <button
                onClick={handleInspect}
                className="bg-gradient-to-r from-rose-400 to-lilac px-8 py-3 rounded-3xl text-white font-semibold shadow-dreamy"
              >
                {loading ? 'Inspecting…' : 'Inspect'}
              </button>
            </div>
            {error && <p className="text-rose-500 text-sm">{error}</p>}
          </div>
        </section>

        {info && (
          <>
            <VideoMetaCard info={info} />
            <OptionsPanel options={options} setOptions={(opts) => setOptions((prev: any) => ({ ...prev, ...opts }))} />
            <FormatsTable formats={info.data.formats ?? []} selectedFormat={options.format} onSelect={(id) => setOptions((prev: any) => ({ ...prev, format: id }))} />
            <div className="flex flex-wrap gap-3">
              <button
                onClick={handleDownload}
                className="bg-gradient-to-r from-rose-500 to-lilac text-white px-10 py-4 rounded-full shadow-dreamy text-lg"
              >
                Start Download
              </button>
              <p className="text-sm text-midnight/70 flex items-center">Parallel fragments default: {options.parallelFragments}</p>
            </div>
          </>
        )}
      </main>

      <JobsDrawer
        jobs={jobArray}
        open={drawerOpen}
        onToggle={() => setDrawerOpen((v) => !v)}
        onDownload={handleDownloadLink}
        onCancel={handleCancel}
      />

      {toast && <div className="fixed top-4 right-4 bg-white/90 rounded-3xl shadow-dreamy px-4 py-3 text-sm">{toast}</div>}
    </div>
  );
}
