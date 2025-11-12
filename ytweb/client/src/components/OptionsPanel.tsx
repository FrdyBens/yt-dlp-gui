import { useState } from 'react';

interface Props {
  options: any;
  setOptions: (opts: any) => void;
}

export function OptionsPanel({ options, setOptions }: Props) {
  const [advanced, setAdvanced] = useState(false);
  return (
    <div className="bg-white/80 rounded-3xl p-6 shadow-dreamy space-y-4">
      <div className="flex flex-wrap gap-3">
        <PresetPill label="Best" active={options.preset === 'best'} onClick={() => setOptions({ ...options, preset: 'best' })} />
        <PresetPill label="Audio" active={options.preset === 'audio'} onClick={() => setOptions({ ...options, preset: 'audio' })} />
        <PresetPill label="Custom" active={options.preset === 'custom'} onClick={() => setOptions({ ...options, preset: 'custom' })} />
      </div>
      {options.preset === 'audio' && (
        <div className="flex gap-3 flex-wrap text-sm">
          <label className="flex items-center gap-2">
            Audio Format
            <select
              className="rounded-2xl bg-blush/60 px-3 py-1"
              value={options.audioFormat}
              onChange={(e) => setOptions({ ...options, audioFormat: e.target.value })}
            >
              <option value="mp3">MP3</option>
              <option value="m4a">M4A</option>
              <option value="opus">Opus</option>
            </select>
          </label>
        </div>
      )}
      <label className="text-sm font-medium text-midnight/80 flex flex-col gap-1">
        Output Template
        <input
          value={options.outputTemplate}
          onChange={(e) => setOptions({ ...options, outputTemplate: e.target.value })}
          className="rounded-2xl border border-transparent focus:border-rose-300 bg-blush/60 px-4 py-2"
        />
      </label>
      <div className="grid sm:grid-cols-2 gap-3 text-sm">
        <label className="flex flex-col gap-1">
          Parallel Fragments
          <input
            type="number"
            min={1}
            max={16}
            value={options.parallelFragments}
            onChange={(e) => setOptions({ ...options, parallelFragments: Number(e.target.value) })}
            className="rounded-2xl bg-blush/60 px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1">
          Speed Limit (KB/s)
          <input
            type="number"
            min={0}
            value={options.speedLimit ?? 0}
            onChange={(e) => setOptions({ ...options, speedLimit: Number(e.target.value) })}
            className="rounded-2xl bg-blush/60 px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1">
          Subtitle languages (comma separated)
          <input
            value={options.subtitles ?? ''}
            onChange={(e) => setOptions({ ...options, subtitles: e.target.value })}
            className="rounded-2xl bg-blush/60 px-3 py-2"
            placeholder="en, es"
          />
        </label>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={options.embedSubs ?? false} onChange={(e) => setOptions({ ...options, embedSubs: e.target.checked })} />
        Embed subtitles when possible
      </label>
      <button className="text-sm text-rose-500 underline" onClick={() => setAdvanced((v) => !v)}>
        {advanced ? 'Hide' : 'Show'} Advanced Options
      </button>
      {advanced && (
        <div className="space-y-3 text-sm">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={options.embedMetadata}
              onChange={(e) => setOptions({ ...options, embedMetadata: e.target.checked })}
            />
            Embed metadata & thumbnail (requires ffmpeg)
          </label>
          <label className="flex flex-col gap-1">
            Custom format expression
            <input
              value={options.format ?? ''}
              onChange={(e) => setOptions({ ...options, format: e.target.value })}
              className="rounded-2xl bg-blush/60 px-3 py-2"
              placeholder="bv*+ba/b"
            />
          </label>
          <label className="flex flex-col gap-1">
            Proxy
            <input
              value={options.proxy ?? ''}
              onChange={(e) => setOptions({ ...options, proxy: e.target.value })}
              className="rounded-2xl bg-blush/60 px-3 py-2"
            />
          </label>
        </div>
      )}
    </div>
  );
}

interface PillProps {
  label: string;
  active: boolean;
  onClick(): void;
}

function PresetPill({ label, active, onClick }: PillProps) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${active ? 'bg-gradient-to-r from-rose-400 to-lilac text-white shadow-dreamy' : 'bg-white/60 text-midnight'}`}
    >
      {label}
    </button>
  );
}
