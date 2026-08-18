import { useState, useEffect } from 'react';
import { Copy, Check, RefreshCw } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { generatePassword, passwordStrength } from '@/lib/utils';

export default function PasswordGenerator() {
  const [length, setLength] = useState(16);
  const [upper, setUpper] = useState(true);
  const [lower, setLower] = useState(true);
  const [numbers, setNumbers] = useState(true);
  const [symbols, setSymbols] = useState(true);
  const [password, setPassword] = useState('');
  const [copied, setCopied] = useState(false);

  const generate = () => {
    setPassword(generatePassword(length, upper, lower, numbers, symbols));
  };

  useEffect(() => {
    setPassword(generatePassword(16, true, true, true, true));
  }, []);

  const handleCopy = () => {
    if (!password) return;
    navigator.clipboard.writeText(password);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const strength = passwordStrength(password);

  const options = [
    { label: 'Uppercase (A-Z)', value: upper, set: setUpper },
    { label: 'Lowercase (a-z)', value: lower, set: setLower },
    { label: 'Numbers (0-9)', value: numbers, set: setNumbers },
    { label: 'Symbols (!@#$)', value: symbols, set: setSymbols },
  ];

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6 lg:px-8">
      <PageHeader title="Generate Password" subtitle="Create strong, random passwords" />

      <div className="card p-6">
        {/* Password display */}
        <div className="mb-4">
          <div className="relative">
            <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-4 dark:border-gray-800 dark:bg-gray-800/50">
              <code className="block break-all text-center font-mono text-lg font-medium text-gray-900 dark:text-white">
                {password || 'Click generate'}
              </code>
            </div>
          </div>
          {password && (
            <div className="mt-2 flex items-center gap-2">
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-800">
                <div className={`h-full transition-all ${strength.color}`} style={{ width: `${(strength.score / 7) * 100}%` }} />
              </div>
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400">{strength.label}</span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="mb-6 flex gap-2">
          <button className="btn-primary flex flex-1 items-center justify-center gap-2" onClick={generate}>
            <RefreshCw className="h-4 w-4" /> Generate
          </button>
          <button className="btn-ghost flex items-center gap-2 border border-gray-200 dark:border-gray-800" onClick={handleCopy} disabled={!password}>
            {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>

        {/* Length slider */}
        <div className="mb-6">
          <div className="mb-2 flex items-center justify-between">
            <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Length</label>
            <span className="rounded-md bg-gray-100 px-2 py-0.5 text-sm font-bold text-gray-900 dark:bg-gray-800 dark:text-white">{length}</span>
          </div>
          <input
            type="range"
            min="8"
            max="32"
            value={length}
            onChange={e => setLength(parseInt(e.target.value))}
            className="w-full accent-blue-500"
          />
          <div className="mt-1 flex justify-between text-[10px] text-gray-400">
            <span>8</span><span>32</span>
          </div>
        </div>

        {/* Options */}
        <div className="space-y-2">
          {options.map((opt, i) => (
            <label key={i} className="flex cursor-pointer items-center justify-between rounded-lg border border-gray-200 px-4 py-3 transition-colors hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-800/30">
              <span className="text-sm text-gray-700 dark:text-gray-300">{opt.label}</span>
              <button
                onClick={() => { opt.set(!opt.value); }}
                className={`relative h-6 w-11 rounded-full transition-colors ${opt.value ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-700'}`}
              >
                <div className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${opt.value ? 'translate-x-5' : 'translate-x-0.5'}`} />
              </button>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}
