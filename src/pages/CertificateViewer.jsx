import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Download, Share2, Award, CheckCircle2 } from 'lucide-react';
import { apiUrl } from '../api';
import { useAuth } from '../context/useAuth';

function CertificateViewer() {
    const { id } = useParams(); // module_id
    const navigate = useNavigate();
    const { token } = useAuth();
    const [certData, setCertData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const generateCert = async () => {
            try {
                const res = await fetch(apiUrl(`/api/v1/certificate/${id}/generate`), {
                    method: 'POST',
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (res.ok) {
                    const data = await res.json();
                    setCertData(data);
                }
            } catch (e) {
                console.error(e);
            } finally {
                setIsLoading(false);
            }
        };
        generateCert();
    }, [id, token]);

    if (isLoading) return <div className="p-12 text-center dark:text-white">Generating Certificate...</div>;
    
    if (!certData) return <div className="p-12 text-center dark:text-rose-500">Failed to generate certificate. Please ensure you have completed the module.</div>;

    const dateStr = new Date(certData.issued_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

    return (
        <div className="w-full max-w-5xl mx-auto px-4 py-12 dark:text-white">
            <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold font-heading">Your Certificate</h1>
                    <p className="text-slate-500 dark:text-slate-400">Congratulations on your achievement.</p>
                </div>
                <div className="flex gap-3">
                    <button className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-white font-bold rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                        <Share2 size={16} /> Share
                    </button>
                    <button className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 shadow-md shadow-indigo-600/20 transition-all active:scale-95">
                        <Download size={16} /> Download PDF
                    </button>
                </div>
            </div>

            {/* Certificate Render */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full aspect-[1.414] bg-white rounded-md shadow-2xl overflow-hidden relative border-[12px] border-slate-900">
                {/* Border accent */}
                <div className="absolute inset-2 border-[4px] border-indigo-100 p-8 flex flex-col items-center justify-between text-center relative pointer-events-none">
                    
                    {/* Background faint logo */}
                    <div className="absolute inset-0 flex items-center justify-center opacity-5">
                        <Award size={400} />
                    </div>

                    <div className="w-full pt-8 relative z-10">
                        <p className="font-heading tracking-[0.2em] text-slate-500 uppercase text-sm md:text-base mb-8">Certificate of Completion</p>
                        <h2 className="text-xl md:text-3xl text-slate-800 font-medium mb-12">This is to certify that</h2>
                        <h1 className="text-4xl md:text-6xl font-extrabold font-heading text-indigo-900 mb-8 italic">{certData.user_name}</h1>
                        <h2 className="text-lg md:text-2xl text-slate-700 mb-4">has successfully completed the module</h2>
                        <h3 className="text-2xl md:text-4xl font-bold font-heading text-slate-900 mb-4 px-12">{certData.module_title}</h3>
                    </div>

                    <div className="w-full flex justify-between items-end pb-8 px-12 relative z-10">
                        <div className="text-left w-48">
                            <div className="border-b-2 border-slate-800 pb-2 mb-2 text-center">
                                <span className="font-writing text-xl text-slate-700">AI LMS System</span>
                            </div>
                            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 text-center">Authorized Signature</p>
                        </div>
                        
                        <div className="flex flex-col items-center">
                            <div className="w-24 h-24 bg-gradient-to-br from-amber-400 to-amber-600 rounded-full flex gap-1 items-center justify-center shadow-lg border-4 border-amber-200">
                                <Award size={40} className="text-amber-100" />
                            </div>
                            <p className="text-[9px] font-bold text-slate-400 mt-2 uppercase">ID: {certData.certificate_id.split('-')[0]}</p>
                        </div>
                        
                        <div className="text-center w-48">
                            <div className="border-b-2 border-slate-800 pb-2 mb-2 text-center">
                                <span className="font-medium text-slate-800">{dateStr}</span>
                            </div>
                            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 text-center">Date of Issue</p>
                        </div>
                    </div>
                </div>
            </motion.div>

            <div className="mt-8 flex justify-center">
                <div className="inline-flex items-center gap-2 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 px-4 py-2 rounded-full text-sm font-bold border border-emerald-200 dark:border-emerald-800">
                    <CheckCircle2 size={16} /> Verifiable Credential
                </div>
            </div>
        </div>
    );
}

export default CertificateViewer;
