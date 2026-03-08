import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Save,
  Copy,
  Trash2,
  FileText,
  Clock,
  Search,
  ChevronRight,
  Settings,
} from 'lucide-react';

// Types used in this component
type Summary = {
  title: string;
  url: string;
  content: string;
};

type Brief = {
  id: number;
  title: string;
  date: string;
  snippet: string;
  tag: string;
  fullContent?: string;
};

declare const chrome: any;

// --- Mock Data Service ---
// In a real extension, this would communicate with your background script/content script
// const generateMockSummary = (): Promise<Summary> => {
//   return new Promise<Summary>((resolve) => {
//     setTimeout(() => {
//       resolve({
//         title: 'Understanding the Future of Artificial Intelligence',
//         url: 'https://example.com/article/future-of-ai',
//         content:
//           'Artificial Intelligence (AI) is rapidly transforming industries by automating complex tasks and providing deep data insights. Key takeaways include:\n\n• Generative AI is shifting from novelty to utility.\n• Ethical considerations regarding bias and privacy are becoming paramount.\n• Human-AI collaboration is the expected standard for the next decade, rather than full replacement.\n\nThis article suggests businesses must adapt their infrastructure now to accommodate these shifting paradigms.',
//       });
//     }, 2000); // Simulate API delay
//   });
// };

export default function Sidepanel() {
  const [activeTab, setActiveTab] = useState<'capture' | 'library'>('capture');
  const [isSummarizing, setIsSummarizing] = useState<boolean>(false);
  const [currentSummary, setCurrentSummary] = useState<Summary | null>(null);
  const [notes, setNotes] = useState<string>('');
  const [savedBriefs, setSavedBriefs] = useState<Brief[]>([
    {
      id: 1,
      title: "React 19 Release Notes",
      date: "2 hrs ago",
      snippet: "React 19 introduces the new Compiler, removing the need for useMemo in many cases...",
      tag: "Dev"
    },
    {
      id: 2,
      title: "Best Pesto Pasta Recipe",
      date: "Yesterday",
      snippet: "Use fresh basil, toasted pine nuts, and don't skimp on the olive oil. The secret is adding...",
      tag: "Cooking"
    }
  ]);
  const [searchQuery, setSearchQuery] = useState<string>('');

  useEffect(() => {
    try {
      chrome.storage.local.get(['researchNotes'], (res: any) => {
        if (res?.researchNotes) setNotes(res.researchNotes);
      });
    } catch (e) {
      // ignore in non-extension env
    }
  }, []);

  // -- Handlers --

  const handleSummarize = async () => {
    setIsSummarizing(true);
    setCurrentSummary(null);

    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      const [{ result }] = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        function: () => window.getSelection()?.toString(),
      });

      if (!result) {
        setCurrentSummary({ title: 'No Selection', url: tab?.url || '', content: 'Please select some text first' });
        setIsSummarizing(false);
        return;
      }

      const response = await fetch('http://localhost:8080/picknbrief/api', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: result, operation: 'summarize' }),
      });

      if (!response.ok) throw new Error(`API Error: ${response.status}`);

      // Try to parse JSON and extract `result` field; fall back to raw text
      let text: string;
      try {
        const data = await response.json();
        text = typeof data === 'string' ? data : (data?.result ?? JSON.stringify(data));
      } catch (e) {
        text = await response.text();
      }

      setCurrentSummary({ title: 'Selection Summary', url: tab?.url || '', content: text });

      // append to notes in storage (non-blocking)
      try {
        chrome.storage.local.get(['researchNotes'], (res: any) => {
          const prev = res?.researchNotes || '';
          const newNotes = (prev ? prev + '\n\n' : '') + text;
          chrome.storage.local.set({ researchNotes: newNotes }, () => setNotes(newNotes));
        });
      } catch (e) {
        console.warn('storage not available', e);
      }

    } catch (err: any) {
      // fallback to mock summary if available
      console.error('Summarization failed, using mock data', err, notes);
    } finally {
      setIsSummarizing(false);
    }
  };

  const handleSave = () => {
    if (!currentSummary) return;
    
    const newBrief: Brief = {
      id: Date.now(),
      title: currentSummary.title,
      date: "Just now",
      snippet: currentSummary.content.substring(0, 100) + "...",
      fullContent: currentSummary.content,
      tag: "General"
    };

    setSavedBriefs([newBrief, ...savedBriefs]);
    setActiveTab('library');
    setCurrentSummary(null); // Reset capture screen after save
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    
  };

  const handleDelete = (id: number) => {
    setSavedBriefs(savedBriefs.filter(b => b.id !== id));
  };

  // -- Components --

  const Header = () => (
    <header className="flex items-center justify-between px-4 py-3 bg-white border-b border-gray-100 sticky top-0 z-10">
      <div className="flex items-center gap-2">
        <div className="bg-indigo-600 p-1.5 rounded-lg">
          <FileText className="w-4 h-4 text-white" />
        </div>
        <h1 className="font-bold text-lg text-gray-800 tracking-tight">PickNBrief</h1>
      </div>
      <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-full transition-colors">
        <Settings className="w-5 h-5" />
      </button>
    </header>
  );

  const Navigation = () => (
    <nav className="flex p-1 mx-4 mt-4 bg-gray-100/80 rounded-xl">
      <button 
        onClick={() => setActiveTab('capture')}
        className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
          activeTab === 'capture' 
            ? 'bg-white text-indigo-600 shadow-sm' 
            : 'text-gray-500 hover:text-gray-700'
        }`}
      >
        Capture
      </button>
      <button 
        onClick={() => setActiveTab('library')}
        className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
          activeTab === 'library' 
            ? 'bg-white text-indigo-600 shadow-sm' 
            : 'text-gray-500 hover:text-gray-700'
        }`}
      >
        Library
      </button>
    </nav>
  );

  const CaptureView = () => (
    <div className="flex flex-col h-full px-4 pt-6 pb-20 overflow-y-auto">
      {!currentSummary && !isSummarizing ? (
        <div className="flex flex-col items-center justify-center flex-1 min-h-[300px] text-center space-y-6">
          <div className="relative">
            <div className="absolute inset-0 bg-indigo-100 rounded-full scale-150 blur-xl opacity-50 animate-pulse"></div>
            <div className="relative bg-white p-4 rounded-2xl shadow-lg border border-indigo-50">
              <Sparkles className="w-12 h-12 text-indigo-600" />
            </div>
          </div>
          
          <div className="space-y-2">
            <h2 className="text-xl font-semibold text-gray-800">Ready to summarize?</h2>
            <p className="text-gray-500 text-sm max-w-[250px] mx-auto">
              PickNBrief will scan the currently selected text and extract the key insights for you.
            </p>
          </div>

          <button 
            onClick={handleSummarize}
            className="group relative w-full max-w-[200px] flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-6 rounded-xl shadow-lg shadow-indigo-200 transition-all active:scale-95"
          >
            <span>Summarize Page</span>
            <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      ) : isSummarizing ? (
        <div className="flex flex-col items-center justify-center flex-1 min-h-[300px] space-y-6">
          <div className="w-16 h-16 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin"></div>
          <div className="space-y-2 text-center">
            <h3 className="text-gray-800 font-medium animate-pulse">Analyzing content...</h3>
            <p className="text-xs text-gray-400">This usually takes a few seconds</p>
          </div>
        </div>
      ) : (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-4">
            <div className="bg-indigo-50/50 px-4 py-3 border-b border-indigo-100">
              <h3 className="font-semibold text-gray-800 text-sm leading-tight">
                {currentSummary?.title}
              </h3>
              <p className="text-xs text-indigo-400 mt-1 truncate">{currentSummary?.url}</p>
            </div>
            
            <div className="p-4">
              <div className="prose prose-sm prose-indigo text-gray-600 text-sm leading-relaxed whitespace-pre-wrap">
                {currentSummary?.content}
              </div>
            </div>

            <div className="flex items-center justify-between p-3 bg-gray-50 border-t border-gray-100">
              <button 
                onClick={() => handleCopy(currentSummary?.content ?? '')}
                className="flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-indigo-600 px-3 py-2 rounded-lg hover:bg-white transition-colors"
              >
                <Copy className="w-3.5 h-3.5" />
                Copy
              </button>
              <div className="flex gap-2">
                 <button 
                  onClick={() => setCurrentSummary(null)}
                  className="px-4 py-2 text-xs font-medium text-gray-500 hover:text-red-500 bg-white border border-gray-200 rounded-lg hover:bg-red-50 hover:border-red-100 transition-all"
                >
                  Discard
                </button>
                <button 
                  onClick={handleSave}
                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition-all"
                >
                  <Save className="w-3.5 h-3.5" />
                  Save Brief
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const LibraryView = () => {
    const filteredBriefs = savedBriefs.filter((brief) =>
      brief.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      brief.snippet.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
      <div className="flex flex-col h-full px-4 pt-4 pb-20 overflow-y-auto">
        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search your briefs..."
            value={searchQuery}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-gray-400"
          />
        </div>

        {/* List */}
        <div className="space-y-3">
          {filteredBriefs.length === 0 ? (
            <div className="text-center py-10">
              <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-3">
                <Search className="w-5 h-5 text-gray-300" />
              </div>
              <p className="text-gray-400 text-sm">No briefs found.</p>
            </div>
          ) : (
            filteredBriefs.map((brief: Brief) => (
              <div 
                key={brief.id}
                className="group bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md hover:border-indigo-100 transition-all duration-200 overflow-hidden"
              >
                <div className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-indigo-50 text-indigo-600">
                      {brief.tag}
                    </span>
                    <button 
                      onClick={() => handleDelete(brief.id)}
                      className="text-gray-300 hover:text-red-500 transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  
                  <h3 className="font-semibold text-gray-800 text-sm mb-1.5 leading-snug">
                    {brief.title}
                  </h3>
                  
                  <p className="text-xs text-gray-500 leading-relaxed line-clamp-2">
                    {brief.snippet}
                  </p>
                  
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-50">
                    <div className="flex items-center gap-1 text-gray-400">
                      <Clock className="w-3 h-3" />
                      <span className="text-[10px]">{brief.date}</span>
                    </div>
                    <button
                      onClick={() => {
                        setCurrentSummary({
                          title: brief.title,
                          url: '',
                          content: brief.fullContent ?? brief.snippet,
                        });
                        setActiveTab('capture');
                      }}
                      className="text-xs font-medium text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      View Full
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    );
  };

  return (
    // This container simulates the Chrome Sidepanel dimensions
    <div className="bg-gray-50 h-screen w-full md:max-w-md md:mx-auto md:border-x md:border-gray-200 font-sans flex flex-col">
      <Header />
      <Navigation />
      
      <main className="flex-1 overflow-hidden relative">
        {activeTab === 'capture' ? <CaptureView /> : <LibraryView />}
      </main>

      {/* Optional: Bottom status bar (often useful in extensions) */}
      <div className="bg-white border-t border-gray-200 p-2 text-center text-[10px] text-gray-400">
        PickNBrief AI v1.0 • Running in Sidepanel
      </div>
    </div>
  );
}