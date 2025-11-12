import { motion, AnimatePresence } from 'framer-motion';

interface Props {
  jobs: any[];
  open: boolean;
  onToggle(): void;
  onDownload(jobId: string): void;
  onCancel(jobId: string): void;
}

export function JobsDrawer({ jobs, open, onToggle, onDownload, onCancel }: Props) {
  return (
    <div className="fixed bottom-4 right-4 z-40">
      <button
        onClick={onToggle}
        className="bg-gradient-to-r from-rose-300 to-lilac text-midnight px-5 py-3 rounded-full shadow-dreamy font-semibold"
      >
        My Jobs ({jobs.length})
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="mt-3 bg-white/95 rounded-3xl shadow-2xl w-80 max-h-[70vh] overflow-y-auto p-4 space-y-3"
          >
            {jobs.length === 0 && <p className="text-sm text-midnight/60">No jobs yet.</p>}
            {jobs.map((job) => (
              <div key={job.id} className="border border-midnight/10 rounded-2xl p-3">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm font-semibold">{job.stage}</p>
                    <p className="text-xs text-midnight/60">{job.status}</p>
                  </div>
                  <span className="text-sm font-mono">{job.progress?.toFixed?.(0) ?? 0}%</span>
                </div>
                <div className="w-full bg-blush/50 rounded-full h-2 mt-2">
                  <div className="bg-gradient-to-r from-rose-400 to-lilac h-2 rounded-full" style={{ width: `${job.progress ?? 0}%` }} />
                </div>
                <div className="mt-2 flex gap-2">
                  {job.status === 'completed' && (
                    <button
                      className="flex-1 text-xs bg-lilac text-midnight rounded-full py-1"
                      onClick={() => onDownload(job.id)}
                    >
                      Download
                    </button>
                  )}
                  {['running', 'queued'].includes(job.status) && (
                    <button className="flex-1 text-xs bg-rose-200 rounded-full py-1" onClick={() => onCancel(job.id)}>
                      Cancel
                    </button>
                  )}
                </div>
                {job.error && <p className="text-xs text-rose-500 mt-2">{job.error}</p>}
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
