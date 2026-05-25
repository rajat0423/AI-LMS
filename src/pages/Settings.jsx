import { useEffect, useState } from 'react';
import { useAuth } from '../context/useAuth';
import { apiUrl } from '../api';
import { motion } from 'framer-motion';
import { User, Lock, Shield, Save, CheckCircle, AlertCircle } from 'lucide-react';

const YEAR_OPTIONS = [
    { value: 1, label: 'Year 1' },
    { value: 2, label: 'Year 2' },
    { value: 3, label: 'Year 3' },
    { value: 4, label: 'Year 4' },
];

function Settings() {
    const { user, token, syncUserFromApi } = useAuth();
    const [activeTab, setActiveTab] = useState('profile');

    // Profile form
    const [firstName, setFirstName] = useState(user?.firstName || '');
    const [lastName, setLastName] = useState(user?.lastName || '');
    const [academicYear, setAcademicYear] = useState(user?.yearNumber || 1);
    const [profileMsg, setProfileMsg] = useState(null);
    const [profileLoading, setProfileLoading] = useState(false);

    // Password form
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [passwordMsg, setPasswordMsg] = useState(null);
    const [passwordLoading, setPasswordLoading] = useState(false);

    useEffect(() => {
        setFirstName(user?.firstName || '');
        setLastName(user?.lastName || '');
        setAcademicYear(user?.yearNumber || 1);
    }, [user?.firstName, user?.lastName, user?.yearNumber]);

    const handleProfileUpdate = async (e) => {
        e.preventDefault();
        setProfileLoading(true);
        setProfileMsg(null);
        try {
            const res = await fetch(apiUrl('/api/v1/auth/profile'), {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    first_name: firstName,
                    last_name: lastName,
                    year: Number(academicYear),
                }),
            });
            if (res.ok) {
                const updatedUser = await res.json();
                syncUserFromApi(updatedUser);
                setProfileMsg({ type: 'success', text: 'Profile updated successfully!' });
            } else {
                const data = await res.json();
                setProfileMsg({ type: 'error', text: data?.error?.message || 'Failed to update profile' });
            }
        } catch {
            setProfileMsg({ type: 'error', text: 'Network error. Please try again.' });
        } finally {
            setProfileLoading(false);
        }
    };

    const handlePasswordChange = async (e) => {
        e.preventDefault();
        if (newPassword !== confirmPassword) {
            setPasswordMsg({ type: 'error', text: 'Passwords do not match' });
            return;
        }
        if (newPassword.length < 6) {
            setPasswordMsg({ type: 'error', text: 'Password must be at least 6 characters' });
            return;
        }
        setPasswordLoading(true);
        setPasswordMsg(null);
        try {
            const res = await fetch(apiUrl('/api/v1/auth/change-password'), {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
            });
            if (res.ok) {
                setPasswordMsg({ type: 'success', text: 'Password changed successfully!' });
                setCurrentPassword('');
                setNewPassword('');
                setConfirmPassword('');
            } else {
                const data = await res.json();
                setPasswordMsg({ type: 'error', text: data?.error?.message || data?.detail || 'Failed to change password' });
            }
        } catch {
            setPasswordMsg({ type: 'error', text: 'Network error. Please try again.' });
        } finally {
            setPasswordLoading(false);
        }
    };

    const tabs = [
        { id: 'profile', label: 'Profile', icon: User },
        { id: 'security', label: 'Security', icon: Lock },
        { id: 'account', label: 'Account', icon: Shield },
    ];

    return (
        <div className="w-full max-w-[900px] mx-auto px-4 sm:px-6 py-10">
            <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}>
                <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 mb-2">Settings</h1>
                <p className="text-base text-slate-500 mb-8">Manage your account and preferences</p>
            </motion.div>

            {/* Tabs */}
            <div className="flex gap-1.5 p-1 bg-slate-100/80 rounded-full border border-slate-200 w-fit mb-8">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`relative px-5 py-2 text-xs font-bold rounded-full transition-all duration-200 flex items-center gap-2 uppercase tracking-widest ${
                            activeTab === tab.id ? 'text-indigo-700 bg-white shadow-sm' : 'text-slate-500 hover:text-slate-900'
                        }`}
                    >
                        <tab.icon size={14} />
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Profile Tab */}
            {activeTab === 'profile' && (
                <motion.div
                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                    className="bg-white rounded-[2rem] border border-slate-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] p-8"
                >
                    <h2 className="text-lg font-bold text-slate-900 mb-6">Edit Profile</h2>
                    <form onSubmit={handleProfileUpdate} className="space-y-5">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Email</label>
                            <input type="email" value={user?.email || ''} disabled
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-500 text-sm font-medium cursor-not-allowed" />
                            <p className="text-[10px] text-slate-400 mt-1.5 font-medium">Email cannot be changed</p>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">First Name</label>
                                <input type="text" value={firstName} onChange={e => setFirstName(e.target.value)}
                                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-800 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Last Name</label>
                                <input type="text" value={lastName} onChange={e => setLastName(e.target.value)}
                                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-800 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all" />
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Academic Year</label>
                            <select
                                value={academicYear}
                                onChange={(e) => setAcademicYear(Number(e.target.value))}
                                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-800 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                            >
                                {YEAR_OPTIONS.map((yearOption) => (
                                    <option key={yearOption.value} value={yearOption.value}>
                                        {yearOption.label}
                                    </option>
                                ))}
                            </select>
                            <p className="text-[10px] text-slate-400 mt-1.5 font-medium">Students can be assigned only to Year 1, 2, 3, or 4.</p>
                        </div>
                        {profileMsg && (
                            <div className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold ${profileMsg.type === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                                {profileMsg.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
                                {profileMsg.text}
                            </div>
                        )}
                        <button type="submit" disabled={profileLoading}
                            className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 active:scale-95 transition-all disabled:opacity-50">
                            <Save size={16} /> {profileLoading ? 'Saving...' : 'Save Changes'}
                        </button>
                    </form>
                </motion.div>
            )}

            {/* Security Tab */}
            {activeTab === 'security' && (
                <motion.div
                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                    className="bg-white rounded-[2rem] border border-slate-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] p-8"
                >
                    <h2 className="text-lg font-bold text-slate-900 mb-6">Change Password</h2>
                    <form onSubmit={handlePasswordChange} className="space-y-5 max-w-md">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Current Password</label>
                            <input type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)}
                                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-800 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">New Password</label>
                            <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} minLength={6}
                                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-800 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Confirm New Password</label>
                            <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} minLength={6}
                                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-800 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all" />
                        </div>
                        {passwordMsg && (
                            <div className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold ${passwordMsg.type === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                                {passwordMsg.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
                                {passwordMsg.text}
                            </div>
                        )}
                        <button type="submit" disabled={passwordLoading}
                            className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 active:scale-95 transition-all disabled:opacity-50">
                            <Lock size={16} /> {passwordLoading ? 'Updating...' : 'Update Password'}
                        </button>
                    </form>
                </motion.div>
            )}

            {/* Account Tab */}
            {activeTab === 'account' && (
                <motion.div
                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                    className="bg-white rounded-[2rem] border border-slate-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] p-8"
                >
                    <h2 className="text-lg font-bold text-slate-900 mb-6">Account Information</h2>
                    <div className="space-y-4">
                        <div className="flex items-center justify-between py-3 px-4 bg-slate-50 rounded-xl">
                            <div>
                                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Account Type</p>
                                <p className="text-sm font-bold text-slate-800 mt-1">Student</p>
                            </div>
                            <span className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-xs font-bold uppercase tracking-widest">Active</span>
                        </div>
                        <div className="flex items-center justify-between py-3 px-4 bg-slate-50 rounded-xl">
                            <div>
                                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Academic Year</p>
                                <p className="text-sm font-bold text-slate-800 mt-1">{user?.year || 'Year 1'}</p>
                            </div>
                        </div>
                        <div className="flex items-center justify-between py-3 px-4 bg-slate-50 rounded-xl">
                            <div>
                                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Subscription</p>
                                <p className="text-sm font-bold text-slate-800 mt-1">Free Plan</p>
                            </div>
                            <button className="px-4 py-1.5 bg-indigo-600 text-white rounded-full text-xs font-bold hover:bg-indigo-700 transition-colors">
                                Upgrade
                            </button>
                        </div>
                        <div className="flex items-center justify-between py-3 px-4 bg-slate-50 rounded-xl">
                            <div>
                                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Member Since</p>
                                <p className="text-sm font-bold text-slate-800 mt-1">April 2026</p>
                            </div>
                        </div>
                    </div>
                </motion.div>
            )}
        </div>
    );
}

export default Settings;
