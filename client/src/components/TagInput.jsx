import { useState, useRef } from 'react';
import { ICT_TAGS } from '../utils/ictTags';

export default function TagInput({ value = [], onChange, placeholder = 'Search or type a confluence…' }) {
  const [input, setInput] = useState('');
  const [open, setOpen] = useState(false);
  const inputRef = useRef(null);

  const suggestions = ICT_TAGS.filter(
    (t) => !value.includes(t) && (input.trim() === '' || t.toLowerCase().includes(input.toLowerCase()))
  );

  const add = (tag) => {
    const t = tag.trim();
    if (t && !value.includes(t)) onChange([...value, t]);
    setInput('');
    inputRef.current?.focus();
  };

  const remove = (tag) => onChange(value.filter((t) => t !== tag));

  const handleKey = (e) => {
    if ((e.key === 'Enter' || e.key === ',') && input.trim()) {
      e.preventDefault();
      add(input);
    } else if (e.key === 'Backspace' && !input && value.length) {
      remove(value[value.length - 1]);
    }
  };

  return (
    <div className="relative">
      <div
        className="min-h-[38px] w-full bg-gray-800 border border-gray-700 rounded-lg px-2.5 py-1.5 flex flex-wrap gap-1.5 cursor-text focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-indigo-500"
        onClick={() => inputRef.current?.focus()}
      >
        {value.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 bg-indigo-600/20 text-indigo-400 border border-indigo-600/30 text-xs font-medium px-2 py-0.5 rounded-full"
          >
            {tag}
            <button
              type="button"
              onMouseDown={(e) => { e.preventDefault(); remove(tag); }}
              className="opacity-60 hover:opacity-100 transition-opacity leading-none"
            >×</button>
          </span>
        ))}
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKey}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder={value.length === 0 ? placeholder : ''}
          className="flex-1 min-w-[100px] bg-transparent text-sm text-gray-100 focus:outline-none placeholder:text-gray-500 py-0.5"
        />
      </div>

      {open && suggestions.length > 0 && (
        <div className="absolute z-30 top-full mt-1 left-0 right-0 bg-gray-900 border border-gray-700 rounded-xl shadow-2xl overflow-hidden">
          <div className="p-2.5 flex flex-wrap gap-1.5 max-h-44 overflow-y-auto">
            {suggestions.map((s) => (
              <button
                key={s}
                type="button"
                onMouseDown={() => add(s)}
                className="text-xs bg-gray-800 hover:bg-indigo-600/20 border border-gray-700 hover:border-indigo-600/40 text-gray-300 hover:text-indigo-300 px-2.5 py-1 rounded-full transition-colors"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
