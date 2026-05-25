import Navbar from './Navbar';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation } from 'react-router-dom';

function Layout({ children }) {
    const location = useLocation();

    return (
        <div className="flex flex-col min-h-screen bg-slate-50 dark:bg-slate-950 font-sans text-slate-800 dark:text-slate-100 transition-colors duration-300">
            {/* Nav Region */}
            <Navbar />

            {/* Main Content Region */}
            <main className="flex-1 flex flex-col w-full">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={location.pathname}
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -15 }}
                        transition={{ duration: 0.3, ease: 'easeOut' }}
                        className="flex-1 flex flex-col relative"
                    >
                        {children}
                    </motion.div>
                </AnimatePresence>
            </main>
        </div>
    );
}

export default Layout;
