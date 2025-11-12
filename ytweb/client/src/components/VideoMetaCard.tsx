import type { InspectResponse } from '../api.js';

interface Props {
  info: InspectResponse;
}

export function VideoMetaCard({ info }: Props) {
  const data: any = info.data;
  return (
    <div className="bg-white/80 backdrop-blur rounded-3xl shadow-dreamy p-6 flex flex-col gap-4 text-midnight">
      <div className="flex gap-4 flex-col sm:flex-row">
        <img
          src={data.thumbnail ?? data.thumbnails?.[0]?.url}
          alt={data.title}
          className="w-full sm:w-60 h-40 object-cover rounded-2xl shadow"
        />
        <div className="flex-1">
          <p className="text-xs uppercase tracking-[0.2em] text-rose-400">Preview</p>
          <h2 className="text-2xl font-semibold mb-2">{data.title}</h2>
          <p className="text-sm opacity-80">{data.uploader ?? data.channel ?? 'Unknown channel'}</p>
          <p className="text-sm opacity-70">Duration: {formatDuration(data.duration)}</p>
          {data.view_count && <p className="text-sm opacity-70">Views: {Intl.NumberFormat().format(data.view_count)}</p>}
          <details className="mt-3 text-sm opacity-80">
            <summary className="cursor-pointer text-rose-500">Description</summary>
            <p className="mt-2 whitespace-pre-wrap max-h-40 overflow-y-auto">{data.description ?? '—'}</p>
          </details>
        </div>
      </div>
      <p className="text-xs text-midnight/60 text-center">
        Reminder: Only download content you own or have permission to download. Respect platform policies.
      </p>
    </div>
  );
}

function formatDuration(seconds?: number) {
  if (!seconds) return 'Unknown';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}m ${secs}s`;
}
