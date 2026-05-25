import { motion, AnimatePresence } from 'framer-motion';
import { Leaf, Sprout, Trees } from 'lucide-react';

function ConsistencyTree({ streak }) {
    let treeState = 'sapling';
    let TreeIcon = Sprout;
    let color = 'text-emerald-500 dark:text-emerald-400';
    let bg = 'bg-emerald-50 dark:bg-emerald-950/40';

    if (streak >= 5 && streak < 15) {
        treeState = 'growing';
        TreeIcon = Leaf;
        color = 'text-green-600 dark:text-green-400';
        bg = 'bg-green-50 dark:bg-green-950/40';
    } else if (streak >= 15) {
        treeState = 'blooming';
        TreeIcon = Trees;
        color = 'text-teal-600 dark:text-teal-400';
        bg = 'bg-teal-50 dark:bg-teal-950/40';
    }

    return (
        <div className="flex items-center gap-3 p-3 bg-white dark:bg-slate-850 border border-slate-100 dark:border-slate-800/80 rounded-2xl shadow-sm relative overflow-hidden group transition-colors">
            <div className={`w-12 h-12 flex items-center justify-center rounded-xl ${bg}`}>
                <AnimatePresence mode="wait">
                    <motion.div
                        key={treeState}
                        initial={{ opacity: 0, scale: 0.5, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.5, y: -10 }}
                        transition={{ duration: 0.5, type: 'spring', bounce: 0.5 }}
                    >
                        <TreeIcon size={24} className={color} />
                    </motion.div>
                </AnimatePresence>
            </div>
            <div className="flex flex-col flex-1">
                <span className="text-xs font-black text-slate-400 dark:text-slate-500 tracking-wider uppercase">Consistency</span>
                <div className="flex items-end gap-1">
                    <span className="text-lg font-extrabold text-slate-800 dark:text-white">{streak}</span>
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Days</span>
                </div>
            </div>
            
            {/* Ambient Growth Effect */}
            <motion.div 
                className={`absolute -right-4 -bottom-4 w-16 h-16 rounded-full blur-2xl opacity-20 ${bg.replace('50', '400')}`}
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
            />
        </div>
    );
}

export default ConsistencyTree;
