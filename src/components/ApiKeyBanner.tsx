'use client';

import { useState, useEffect } from 'react';
import { AlertTriangle, X, ExternalLink, CheckCircle } from 'lucide-react';

export default function ApiKeyBanner() {
  const [visible, setVisible] = useState(false);
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    async function check() {
      try {
        const res = await fetch('/api/check-api-key');
        const data = await res.json();
        setConfigured(data.configured);
        setVisible(!data.configured);
      } catch {
        setConfigured(null);
        setVisible(false);
      } finally {
        setChecked(true);
      }
    }
    check();
  }, []);

  if (!checked || !visible) return null;

  return (
    <div className="fixed bottom-6 right-6 max-w-sm z-50 animate-in slide-in-from-bottom-4 fade-in duration-300">
      <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-2xl p-5 shadow-lg">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-amber-800 dark:text-amber-200 text-sm">
              Transcription API Key Required
            </h3>
            <p className="text-sm text-amber-700 dark:text-amber-300 mt-1 leading-relaxed">
              Get a free Groq API key for real transcription.
            </p>
            <ol className="mt-3 space-y-1.5 text-sm text-amber-700 dark:text-amber-300">
              <li className="flex items-start gap-2">
                <span className="font-medium text-amber-800 dark:text-amber-200 shrink-0">1.</span>
                <span>
                  <a
                    href="https://console.groq.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-amber-800 dark:text-amber-100 underline decoration-amber-300 dark:decoration-amber-600 hover:decoration-amber-500 inline-flex items-center gap-1"
                  >
                    Sign up at Groq Console <ExternalLink className="h-3 w-3" />
                  </a>
                  {' '}(free, no credit card)
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-medium text-amber-800 dark:text-amber-200 shrink-0">2.</span>
                <span>Create an API key</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-medium text-amber-800 dark:text-amber-200 shrink-0">3.</span>
                <span>
                  Add to <code className="bg-amber-100 dark:bg-amber-900 px-1 rounded text-xs">.env.local</code>:
                  {' '}<code className="bg-amber-100 dark:bg-amber-900 px-1 rounded text-xs font-mono">GROQ_API_KEY=gsk_...</code>
                </span>
              </li>
            </ol>
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-3">
              Restart the dev server after adding the key.
            </p>
          </div>
          <button
            onClick={() => setVisible(false)}
            className="shrink-0 p-1 hover:bg-amber-100 dark:hover:bg-amber-900 rounded-lg transition-colors"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4 text-amber-500" />
          </button>
        </div>
      </div>
    </div>
  );
}
