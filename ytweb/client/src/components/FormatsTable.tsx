interface Props {
  formats: any[];
  onSelect?: (format: string) => void;
  selectedFormat?: string;
}

export function FormatsTable({ formats, onSelect, selectedFormat }: Props) {
  if (!formats?.length) return null;
  return (
    <div className="bg-white/80 rounded-3xl p-4 shadow-dreamy overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="text-left text-midnight/70">
          <tr>
            <th className="py-2">ID</th>
            <th>Ext</th>
            <th>Resolution / ABr</th>
            <th>Size</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {formats.map((format: any) => (
            <tr key={format.format_id} className="border-t border-midnight/5">
              <td className="py-2 font-semibold">{format.format_id}</td>
              <td>{format.ext}</td>
              <td>{format.format_note ?? format.resolution ?? format.asr ?? '—'}</td>
              <td>{format.filesize ? prettyBytes(format.filesize) : format.filesize_approx ? `${prettyBytes(format.filesize_approx)} ~` : '—'}</td>
              <td>
                {onSelect && (
                  <button
                    className={`px-3 py-1 rounded-full text-xs ${
                      selectedFormat === format.format_id ? 'bg-lilac text-midnight' : 'bg-blush/70'
                    }`}
                    onClick={() => onSelect(format.format_id)}
                  >
                    Choose
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function prettyBytes(bytes: number) {
  if (!bytes) return '—';
  const units = ['B', 'KB', 'MB', 'GB'];
  let count = 0;
  let value = bytes;
  while (value >= 1024 && count < units.length - 1) {
    value /= 1024;
    count++;
  }
  return `${value.toFixed(1)} ${units[count]}`;
}
