import React, { useEffect, useState } from 'react';

declare const chrome: any;

export async function saveNotesToStorage(notes: string): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.local.set({ researchNotes: notes }, () => resolve());
  });
}

const SaveNotes: React.FC = () => {
  const [notes, setNotes] = useState<string>('');

  useEffect(() => {
    chrome.storage.local.get(['researchNotes'], (res: any) => {
      if (res?.researchNotes) setNotes(res.researchNotes);
    });
  }, []);

  const handleSave = () => {
    chrome.storage.local.set({ researchNotes: notes }, () => {
      alert('Notes saved successfully');
    });
  };

  return (
    <div>
      <textarea
        id="notes"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        className="w-full h-40 p-2 border rounded resize-none text-sm"
        placeholder="Your research notes..."
      />
      <div className="flex gap-2 mt-2">
        <button onClick={handleSave} className="px-3 py-2 bg-indigo-600 text-white rounded">Save Notes</button>
        <button onClick={() => { setNotes(''); chrome.storage.local.remove(['researchNotes']); }} className="px-3 py-2 bg-gray-200 rounded">Clear</button>
      </div>
    </div>
  );
};

export default SaveNotes;
