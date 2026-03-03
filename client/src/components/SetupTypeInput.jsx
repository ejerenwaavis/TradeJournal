import { useState } from 'react';
import { SETUP_TYPES } from '../utils/ictTags';

const inputCls = 'w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder-gray-600';

export default function SetupTypeInput({ value = '', onChange }) {
  const isPreset = SETUP_TYPES.includes(value);
  const [custom, setCustom] = useState(value && !isPreset ? value : '');

  const select = (type) => {
    if (value === type) { onChange(''); }
    else { onChange(type); setCustom(''); }
  };

  const handleCustom = (e) => {
    const v = e.target.value;
    setCustom(v);
    onChange(v);
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {SETUP_TYPES.map((type) => (
          <button
            key={type}
            type="button"
            onClick={() => select(type)}
            className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
              value === type
                ? 'bg-indigo-600 border-indigo-500 text-white'
                : 'bg-gray-800 border-gray-700 text-gray-300 hover:border-indigo-500 hover:text-indigo-300'
            }`}
          >
            {type}
          </button>
        ))}
      </div>
      <input
        type="text"
        value={value && !isPreset ? value : custom}
        onChange={handleCustom}
        onFocus={() => { if (isPreset) { onChange(''); } }}
        placeholder="Or type a custom setup…"
        className={inputCls}
      />
    </div>
  );
}
