import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';
import { apiService } from '../services/api';
import UserContext from './user-context';

export function UserProvider({ children }) {
    const { token, user, isAuthenticated } = useAuth();
    
    const [userState, setUserState] = useState({
        name: "",
        hasTakenAssessment: false,
        streakCount: 0,
        scores: { communication: 0, confidence: 0, professionalReadiness: 0, resumeMatch: 0 },
        stats: null
    });
    
    const [isLoadingUser, setIsLoadingUser] = useState(true);

    useEffect(() => {
        if (!isAuthenticated || !token) {
            setIsLoadingUser(false);
            return;
        }

        let isMounted = true;
        
        async function fetchUserData() {
            setIsLoadingUser(true);
            try {
                const [assessment, stats] = await Promise.all([
                    apiService.getAssessment(token).catch(() => null),
                    apiService.getStats(token).catch(() => null)
                ]);
                
                if (isMounted) {
                    const traits = assessment?.traits || {
                        communication: 0, confidence: 0, professionalReadiness: 0, resumeMatch: 0
                    };
                    const hasTaken = Object.values(traits).some(v => v > 0);
                    
                    setUserState({
                        name: user?.name || "Learner",
                        hasTakenAssessment: hasTaken,
                        streakCount: stats?.current_streak || 0,
                        scores: traits,
                        stats: stats || { completed_lessons: 0, total_lessons: 0, completion_percentage: 0 }
                    });
                }
            } catch (e) {
                console.error("Failed to load user state", e);
            } finally {
                if (isMounted) setIsLoadingUser(false);
            }
        }
        
        fetchUserData();
        return () => { isMounted = false; };
    }, [isAuthenticated, token, user]);

    const completeAssessment = (newScores) => {
        setUserState(prev => ({
            ...prev,
            hasTakenAssessment: true,
            scores: { ...prev.scores, ...newScores }
        }));
    };

    return (
        <UserContext.Provider value={{ userState, setUserState, completeAssessment, isLoadingUser }}>
            {children}
        </UserContext.Provider>
    );
}
