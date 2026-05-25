import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGlobalUser } from '../context/useGlobalUser';
import { useAuth } from '../context/useAuth';
import { apiUrl } from '../api';
import { CheckCircle2, ChevronRight, BrainCircuit, Mic, Briefcase } from 'lucide-react';

const steps = [
    {
        id: 'welcome',
        title: 'Welcome to your AI journey',
        subtitle: "Let's calibrate your learning path. This quick assessment establishes your baseline scores.",
        icon: BrainCircuit,
        color: 'text-indigo-600 dark:text-indigo-400',
        bg: 'bg-indigo-100 dark:bg-indigo-950/40'
    },
    {
        id: 'comm',
        title: 'Communication Protocol',
        subtitle: "How would you rate your public speaking anxiety on a scale of 1-10?",
        icon: Mic,
        color: 'text-violet-600 dark:text-violet-400',
        bg: 'bg-violet-100 dark:bg-violet-950/40'
    },
    {
        id: 'prof',
        title: 'Professional Readiness',
        subtitle: "Have you tailored a resume to a specific JD before?",
        icon: Briefcase,
        color: 'text-emerald-600 dark:text-emerald-400',
        bg: 'bg-emerald-100 dark:bg-emerald-950/40'
    }
];

export default function InitialAssessmentWizard() {
    const { completeAssessment } = useGlobalUser();
    const { token } = useAuth();
    const [currentStep, setCurrentStep] = useState(0);
    const [isAnalyzing, setIsAnalyzing] = useState(false);

    const handleNext = async () => {
        if (currentStep < steps.length - 1) {
            setCurrentStep(prev => prev + 1);
        } else {
            setIsAnalyzing(true);
            try {
                const response = await fetch(apiUrl('/api/v1/assessment/complete'), {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                    },
                    body: JSON.stringify({ answers: [] })
                });
                if (!response.ok) throw new Error("Assessment API failed");
                const data = await response.json();
                completeAssessment(data.traits);
            } catch (error) {
                console.error("Failed to complete assessment:", error);
                // Fallback if backend is unavailable
                setTimeout(() => {
                    completeAssessment({
                        communication: 65,
                        confidence: 70,
                        professionalReadiness: 60,
                        resumeMatch: 55
                    });
                }, 1500);
            } finally {
                setIsAnalyzing(false);
            }
        }
    };

    if (isAnalyzing) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center min-h-[60vh] text-center p-8 bg-transparent">
                <motion.div 
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                    className="w-16 h-16 border-4 border-indigo-100 dark:border-slate-800 border-t-indigo-600 dark:border-t-indigo-400 rounded-full mb-6"
                />
                <h2 className="text-2xl font-black text-slate-850 dark:text-white mb-2">Analyzing Baseline...</h2>
                <p className="text-slate-500 dark:text-slate-400 font-bold">Generating your personalized SaaS learning curriculum.</p>
            </div>
        );
    }

    const step = steps[currentStep];

    return (
        <div className="flex-1 flex flex-col items-center justify-center p-4 md:p-8 min-h-[70vh] bg-transparent">
            <div className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 dark:border-slate-800 overflow-hidden relative">
                
                {/* Progress Bar */}
                <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-850">
                    <motion.div 
                        className="h-full bg-indigo-600 dark:bg-indigo-500"
                        initial={{ width: 0 }}
                        animate={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
                        transition={{ duration: 0.5, ease: "easeOut" }}
                    />
                </div>

                <div className="p-8 md:p-12">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={step.id}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            transition={{ duration: 0.3 }}
                            className="flex flex-col items-center text-center"
                        >
                            <div className={`w-20 h-20 rounded-2xl flex items-center justify-center mb-6 shadow-xs border border-slate-200/50 dark:border-slate-800/80 ${step.bg}`}>
                                <step.icon size={40} className={step.color} />
                            </div>
                            
                            <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight mb-4">
                                {step.title}
                            </h2>
                            <p className="text-base sm:text-lg text-slate-500 dark:text-slate-400 max-w-md mx-auto mb-8 font-bold leading-relaxed">
                                {step.subtitle}
                            </p>

                            {/* Mock Input Area for visual completeness */}
                            {currentStep > 0 && (
                                <div className="w-full max-w-sm mb-10">
                                    <input 
                                        type="text" 
                                        placeholder="Type your answer here..."
                                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/60 rounded-xl focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-950 focus:border-indigo-500 outline-none transition-all text-slate-750 dark:text-slate-100 font-extrabold text-center"
                                    />
                                </div>
                            )}

                            <button 
                                onClick={handleNext}
                                className="px-8 py-4 bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-650 dark:hover:bg-indigo-700 text-white font-black rounded-2xl shadow-lg shadow-indigo-600/20 flex items-center gap-2 transition-all active:scale-95 group text-base"
                            >
                                {currentStep === steps.length - 1 ? (
                                    <>Complete Assessment <CheckCircle2 size={20} /></>
                                ) : (
                                    <>Continue <ChevronRight size={20} className="group-hover:translate-x-0.5 transition-transform" /></>
                                )}
                            </button>
                        </motion.div>
                    </AnimatePresence>
                </div>
            </div>
            
            <div className="mt-8 flex gap-2">
                {steps.map((_, idx) => (
                    <div 
                        key={idx} 
                        className={`w-2 h-2 rounded-full transition-all ${idx === currentStep ? 'bg-indigo-600 dark:bg-indigo-400 w-6' : 'bg-slate-350 dark:bg-slate-700'}`}
                    />
                ))}
            </div>
        </div>
    );
}
