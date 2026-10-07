import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Image as ImageIcon, Download, CheckCircle2, ArrowRight, Loader2, LayoutPanelLeft, LogOut, LogIn } from 'lucide-react';
import { auth, googleProvider } from './lib/firebase';
import { signInWithPopup, signOut, onAuthStateChanged, User } from 'firebase/auth';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [dbUser, setDbUser] = useState<{ tokens: number } | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    companyName: '',
    tagline: '',
    brandVision: ''
  });
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [enhancedPrompt, setEnhancedPrompt] = useState('');
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [assets, setAssets] = useState<{
    baseLogo: string;
    socialBanner: string;
    websiteHeader: string;
    verticalStory: string;
  } | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        try {
          const token = await currentUser.getIdToken();
          const res = await fetch('/api/user', {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (res.ok) {
            const data = await res.json();
            setDbUser(data);
          }
        } catch (e) {
          console.error("Failed to fetch user data", e);
        }
      } else {
        setDbUser(null);
      }
      setAuthLoading(false);
    });
    return unsubscribe;
  }, []);

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Login failed", error);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    setStep(1);
    setAssets(null);
    setEnhancedPrompt('');
  };

  const handleEnhance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.companyName || !formData.brandVision || !user) return;
    
    setIsEnhancing(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/enhance-prompt', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      if (data.enhancedPrompt) {
        setEnhancedPrompt(data.enhancedPrompt);
        setStep(2);
      } else {
        throw new Error(data.error || "Failed to enhance prompt");
      }
    } catch (err: any) {
      console.error(err);
      alert("Error enhancing prompt: " + (err.message || "Unknown error"));
    } finally {
      setIsEnhancing(false);
    }
  };

  const handleGenerate = async () => {
    if (!user) return;
    setIsGenerating(true);
    setGenerationError(null);
    setStep(3);
    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/generate-assets', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ enhancedPrompt, ...formData })
      });
      const data = await res.json();
      if (data.success && data.assets) {
        setAssets(data.assets);
        setStep(4);
      } else {
        throw new Error(data.error || "Generation failed");
      }
    } catch (err: any) {
      console.error(err);
      setGenerationError(err.message || "An error occurred during generation.");
      setStep(2);
    } finally {
      setIsGenerating(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-indigo-600 selection:text-white">
      {/* Header */}
      <header className="h-16 flex items-center justify-between px-8 bg-white border-b border-slate-200 shrink-0 shadow-sm sticky top-0 z-10">
        <div className="max-w-6xl w-full mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center">
              <LayoutPanelLeft className="text-white w-5 h-5" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-slate-800">
              BrandPackage <span className="text-indigo-600">AI</span>
            </h1>
          </div>
          <div className="flex items-center gap-6">
            {user ? (
              <>
                <div className="flex flex-col items-end">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Available Credits</span>
                  <span className="text-sm font-semibold text-slate-700">{dbUser?.tokens ?? '...'} tokens</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-slate-200 border-2 border-indigo-100 flex items-center justify-center text-slate-500 font-bold overflow-hidden">
                    {user.photoURL ? <img src={user.photoURL} alt="Profile" className="w-full h-full object-cover" /> : user.email?.[0].toUpperCase()}
                  </div>
                  <button onClick={handleLogout} className="text-slate-400 hover:text-slate-600" title="Sign out">
                    <LogOut className="w-5 h-5" />
                  </button>
                </div>
              </>
            ) : (
              <button onClick={handleLogin} className="flex items-center gap-2 text-sm font-bold text-indigo-600 hover:text-indigo-700 bg-indigo-50 px-4 py-2 rounded">
                <LogIn className="w-4 h-4" /> Sign In
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-12 md:py-24">
        {!user ? (
          <div className="text-center py-20 bg-white rounded-2xl shadow-sm border border-slate-200">
            <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <LayoutPanelLeft className="w-8 h-8 text-indigo-600" />
            </div>
            <h2 className="text-2xl font-bold text-slate-800 mb-2">Sign in to start creating</h2>
            <p className="text-slate-500 mb-8 max-w-md mx-auto">Create beautiful, production-ready brand packages powered by AI. Sign in with your Google account to access your workspace.</p>
            <button onClick={handleLogin} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-8 rounded shadow-md transition-colors inline-flex items-center gap-2 uppercase tracking-wider text-sm">
              <LogIn className="w-4 h-4" /> Sign In with Google
            </button>
          </div>
        ) : (
          <>
            {/* Progress Tracker */}
        <div className="flex items-center justify-between mb-16 relative">
          <div className="absolute left-0 right-0 top-1/2 h-px bg-slate-200 -z-10 -translate-y-1/2"></div>
          {[
            { num: 1, label: 'Vision' },
            { num: 2, label: 'Prompt' },
            { num: 3, label: 'Generate' },
            { num: 4, label: 'Deliver' }
          ].map((s) => (
            <div key={s.num} className="flex flex-col items-center gap-2 bg-slate-50 px-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium border-2 transition-colors duration-500
                ${step >= s.num ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm' : 'bg-white border-slate-300 text-slate-400'}`}>
                {step > s.num ? <CheckCircle2 className="w-4 h-4" /> : s.num}
              </div>
              <span className={`text-xs font-medium ${step >= s.num ? 'text-slate-800 font-bold' : 'text-slate-400'}`}>
                {s.label}
              </span>
            </div>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {/* STEP 1: Input */}
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
            >
              <div className="text-center mb-10">
                <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-slate-800 mb-3">Define your brand</h1>
                <p className="text-slate-500 text-lg">Tell us about your business, and our AI will engineer the perfect prompt.</p>
              </div>

              <form onSubmit={handleEnhance} className="bg-white p-8 rounded-xl shadow-sm border border-slate-200">
                <div className="space-y-6">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1 uppercase tracking-wider">Company Name</label>
                    <input
                      required
                      type="text"
                      className="w-full px-3 py-2 rounded border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm transition-all"
                      placeholder="e.g. Acme Coffee"
                      value={formData.companyName}
                      onChange={e => setFormData({ ...formData, companyName: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1 uppercase tracking-wider">Tagline <span className="text-slate-400 font-normal normal-case">(Optional)</span></label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 rounded border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm transition-all"
                      placeholder="e.g. Brewed for the bold"
                      value={formData.tagline}
                      onChange={e => setFormData({ ...formData, tagline: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1 uppercase tracking-wider">Brand Vision & Style</label>
                    <textarea
                      required
                      className="w-full px-3 py-2 rounded border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm transition-all min-h-[120px] resize-y"
                      placeholder="e.g. A modern, minimalist coffee shop. Think brutalist architecture meets cozy warmth. Colors: charcoal, cream, and burnt orange."
                      value={formData.brandVision}
                      onChange={e => setFormData({ ...formData, brandVision: e.target.value })}
                    />
                  </div>
                </div>

                <div className="mt-8">
                  <button
                    disabled={isEnhancing || !formData.companyName || !formData.brandVision}
                    type="submit"
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-6 rounded text-sm shadow-md flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isEnhancing ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> ENHANCING PROMPT...</>
                    ) : (
                      <><Sparkles className="w-4 h-4" /> ENHANCE & CONTINUE</>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          )}

          {/* STEP 2: Review Prompt */}
          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
            >
              <div className="text-center mb-10">
                <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-slate-800 mb-3">AI-Engineered Prompt</h2>
                <p className="text-slate-500 text-lg">Optimized specifically for high-end vector-style generation.</p>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex items-center gap-3">
                  <Sparkles className="w-5 h-5 text-indigo-500" />
                  <h3 className="font-bold text-slate-700 uppercase tracking-wider text-xs">Optimized Ideogram Prompt</h3>
                </div>
                <div className="p-6">
                  <textarea
                    className="w-full p-4 bg-slate-50 border border-slate-300 rounded text-slate-700 font-mono text-sm leading-relaxed min-h-[200px] focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                    value={enhancedPrompt}
                    onChange={e => setEnhancedPrompt(e.target.value)}
                  />
                  {generationError && (
                    <div className="mt-4 p-4 bg-red-50 text-red-700 border border-red-200 rounded text-sm font-medium flex items-start gap-2">
                      <span className="font-bold text-red-800">Error:</span> {generationError}
                    </div>
                  )}
                  <p className="text-xs text-slate-500 mt-3">
                    You can tweak the prompt manually before we initiate the Ad Resizer sequence.
                  </p>
                </div>
                <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex gap-4">
                  <button
                    onClick={() => setStep(1)}
                    className="px-6 py-3 font-bold text-sm text-slate-600 hover:text-indigo-600 transition-colors uppercase tracking-wider"
                  >
                    Back
                  </button>
                  <button
                    onClick={handleGenerate}
                    className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-6 rounded text-sm shadow-md flex items-center justify-center gap-2 transition-colors uppercase tracking-wider"
                  >
                    Generate Full Package <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {/* STEP 3: Generating */}
          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.4 }}
              className="flex flex-col items-center justify-center py-20"
            >
              <div className="relative mb-8">
                <div className="w-24 h-24 border-4 border-slate-200 rounded-full"></div>
                <div className="w-24 h-24 border-4 border-indigo-600 rounded-full border-t-transparent animate-spin absolute top-0 left-0"></div>
                <ImageIcon className="w-8 h-8 text-indigo-400 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
              </div>
              <h2 className="text-2xl font-bold tracking-tight text-slate-800 mb-2">Executing Ad Resizer Sequence</h2>
              <div className="text-slate-500 flex flex-col items-center gap-1 font-mono text-sm">
                <motion.p animate={{ opacity: [0.5, 1, 0.5] }} transition={{ repeat: Infinity, duration: 2 }}>
                  [1/3] Generating 1:1 Base Logo...
                </motion.p>
                <motion.p animate={{ opacity: [0.5, 1, 0.5] }} transition={{ repeat: Infinity, duration: 2, delay: 0.5 }}>
                  [2/3] Expanding to 16:9 Banner...
                </motion.p>
                <motion.p animate={{ opacity: [0.5, 1, 0.5] }} transition={{ repeat: Infinity, duration: 2, delay: 1 }}>
                  [3/3] Formatting 9:16 Story asset...
                </motion.p>
              </div>
            </motion.div>
          )}

          {/* STEP 4: Delivery */}
          {step === 4 && assets && (
            <motion.div
              key="step4"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="text-3xl font-bold tracking-tight text-slate-800 mb-2">Your Brand Package</h2>
                  <p className="text-slate-500">Ready for download and vectorization.</p>
                </div>
                <button className="bg-indigo-600 text-white px-5 py-2.5 rounded font-bold text-sm flex items-center gap-2 hover:bg-indigo-700 shadow-md transition-colors uppercase tracking-wider">
                  <Download className="w-4 h-4" /> Download .ZIP
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                {/* 1:1 Base Logo */}
                <div className="md:col-span-4 flex flex-col gap-3">
                  <div className="bg-white p-2 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden">
                    <span className="absolute top-4 right-4 z-10 text-[10px] font-mono text-white bg-slate-900/50 px-2 py-1 rounded backdrop-blur-sm">1:1 PRIMARY LOGO</span>
                    <div className="aspect-square bg-slate-100 rounded-lg overflow-hidden relative group">
                      <img src={assets.baseLogo} alt="Base Logo" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-indigo-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <button className="bg-white text-indigo-700 px-4 py-2 rounded font-bold text-sm shadow-md">View High-Res</button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Others */}
                <div className="md:col-span-8 flex flex-col gap-6">
                  {/* 16:9 */}
                  <div className="flex flex-col gap-3">
                    <div className="bg-white p-2 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden">
                      <span className="absolute top-4 right-4 z-10 text-[10px] font-mono text-white bg-slate-900/50 px-2 py-1 rounded backdrop-blur-sm">16:9 BANNER</span>
                      <div className="aspect-video bg-slate-100 rounded-lg overflow-hidden">
                         <img src={assets.socialBanner} alt="Social Banner" className="w-full h-full object-cover" />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    {/* 3:1 */}
                    <div className="flex flex-col gap-3">
                      <div className="bg-white p-2 rounded-xl border border-slate-200 shadow-sm flex-1 relative overflow-hidden">
                        <span className="absolute top-4 right-4 z-10 text-[10px] font-mono text-white bg-slate-900/50 px-2 py-1 rounded backdrop-blur-sm">3:1 HEADER</span>
                        <div className="aspect-[3/1] bg-slate-100 rounded-lg overflow-hidden h-full">
                           <img src={assets.websiteHeader} alt="Header" className="w-full h-full object-cover" />
                        </div>
                      </div>
                    </div>

                    {/* 9:16 */}
                    <div className="flex flex-col gap-3">
                      <div className="bg-white p-2 rounded-xl border border-slate-200 shadow-sm flex-1 relative overflow-hidden">
                        <span className="absolute top-4 right-4 z-10 text-[10px] font-mono text-white bg-slate-900/50 px-2 py-1 rounded backdrop-blur-sm">9:16 STORY</span>
                        <div className="aspect-[9/16] bg-slate-100 rounded-lg overflow-hidden h-full max-h-[200px] mx-auto w-full">
                           <img src={assets.verticalStory} alt="Story" className="w-full h-full object-cover object-top" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-12 bg-indigo-50 border border-indigo-100 rounded-xl p-6 text-indigo-900 flex gap-4 items-start">
                <Sparkles className="w-6 h-6 text-indigo-500 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold mb-1 text-indigo-800">Vectorization Ready</h4>
                  <p className="text-sm text-indigo-800/80 leading-relaxed">
                    These assets are currently high-resolution raster images. The system is ready to pass these to the Potrace pipeline to generate crisp .SVG and .EPS files for your clients.
                  </p>
                </div>
              </div>
              
              <div className="mt-8 flex justify-center">
                <button 
                  onClick={() => {
                    setStep(1);
                    setAssets(null);
                    setEnhancedPrompt('');
                  }}
                  className="text-slate-500 hover:text-indigo-600 font-bold text-sm transition-colors uppercase tracking-wider"
                >
                  Start Over
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        </>
        )}
      </main>
    </div>
  );
}
