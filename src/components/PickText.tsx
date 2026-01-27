import React, { useState } from "react";
import SaveNotes, { saveNotesToStorage } from './SaveNotes';

declare const chrome: any;

const PickText: React.FC = () => {
  const [resultHtml, setResultHtml] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  const summarizeText = async () => {
    try {
      setLoading(true);
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      const [{ result }] = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        function: () => window.getSelection()?.toString() ?? '',
      });

      if (!result) {
        setResultHtml('Please select some text first');
        return;
      }

      const response = await fetch('http://localhost:8080/api/research/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: result, operation: 'summarize' }),
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }

      const text = await response.text();
      const html = text.replace(/\n/g, '<br>');
      setResultHtml(html);

      // Persist the extracted summary by appending to stored notes
      try {
        const prev = await new Promise<string | undefined>((resolve) =>
          chrome.storage.local.get(['researchNotes'], (res: any) => resolve(res?.researchNotes))
        );
        const newNotes = (prev ? prev + '\n\n' : '') + text;
        await saveNotesToStorage(newNotes);
      } catch (err) {
        // non-fatal: continue
        console.warn('Failed to save notes automatically', err);
      }

    } catch (error: any) {
      setResultHtml('Error: ' + (error?.message ?? String(error)));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-3">
      <div className="mb-3">
        <button onClick={summarizeText} disabled={loading} className="px-3 py-2 bg-indigo-600 text-white rounded">
          {loading ? 'Summarizing...' : 'Summarize Selection'}
        </button>
      </div>

      <div id="results" className="mb-4">
        {resultHtml ? (
          <div className="result-item">
            <div className="result-content" dangerouslySetInnerHTML={{ __html: resultHtml }} />
          </div>
        ) : (
          <div className="text-sm text-gray-500">No results yet. Select text in the page and click Summarize.</div>
        )}
      </div>

      <div>
        <h4 className="font-semibold mb-2">Research Notes</h4>
        <SaveNotes />
      </div>
    </div>
  );
};

export default PickText;