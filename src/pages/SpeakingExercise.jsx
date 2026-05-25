import { useState, useRef, useEffect } from 'react';
import {
    HiOutlineMicrophone,
    HiOutlineStopCircle,
    HiOutlinePlayCircle,
    HiOutlineArrowPath,
} from 'react-icons/hi2';
import ScoreCircle from '../components/ScoreCircle';
import './SpeakingExercise.css';

const prompts = [
    'Introduce yourself briefly.',
    'Tell me about a challenge you faced at work or college.',
    'Describe your ideal job and why.',
    'Explain a complex topic to a 10-year-old.',
    'What makes you unique as a candidate?',
];

const mockFeedback = {
    clarity: 7.8,
    confidence: 8.2,
    grammar: 7.5,
    vocabulary: 6.9,
    tone: 'Neutral',
    overallScore: 76,
    suggestions: [
        'Slow down your pace slightly for clarity.',
        'Work on stronger opening statements.',
        'Include more specific examples.',
        'Practice varying your vocal tone.',
    ],
};

function SpeakingExercise() {
    const [isRecording, setIsRecording] = useState(false);
    const [hasRecorded, setHasRecorded] = useState(false);
    const [showFeedback, setShowFeedback] = useState(false);
    const [timer, setTimer] = useState(0);
    const [currentPrompt, setCurrentPrompt] = useState(0);
    const timerRef = useRef(null);
    const [waveData, setWaveData] = useState(Array(30).fill(4));

    useEffect(() => {
        let interval;
        if (isRecording) {
            interval = setInterval(() => {
                setWaveData(Array(30).fill(0).map(() => Math.random() * 28 + 4));
            }, 150);
        }
        return () => clearInterval(interval);
    }, [isRecording]);

    const startRecording = () => {
        setIsRecording(true);
        setHasRecorded(false);
        setShowFeedback(false);
        setTimer(0);
        timerRef.current = setInterval(() => {
            setTimer((t) => t + 1);
        }, 1000);
    };

    const stopRecording = () => {
        setIsRecording(false);
        setHasRecorded(true);
        clearInterval(timerRef.current);
        setWaveData(Array(30).fill(4));
        // Simulate AI analysis delay
        setTimeout(() => setShowFeedback(true), 1500);
    };

    const nextPrompt = () => {
        setCurrentPrompt((p) => (p + 1) % prompts.length);
        setIsRecording(false);
        setHasRecorded(false);
        setShowFeedback(false);
        setTimer(0);
        clearInterval(timerRef.current);
    };

    const formatTime = (s) => {
        const m = Math.floor(s / 60);
        const sec = s % 60;
        return `${m}:${sec.toString().padStart(2, '0')}`;
    };

    return (
        <div className="speaking-page">
            <div className="speaking-grid">
                {/* Recording Panel */}
                <div className="card speaking-main-card">
                    <div className="speaking-prompt-section">
                        <span className="speaking-prompt-label">Prompt {currentPrompt + 1}/{prompts.length}</span>
                        <h2 className="speaking-prompt-text">{prompts[currentPrompt]}</h2>
                    </div>

                    <div className="recording-area">
                        <div className="waveform">
                            {waveData.map((h, i) => (
                                <div
                                    key={i}
                                    className="wave-bar"
                                    style={{
                                        height: `${h}px`,
                                        background: isRecording
                                            ? `linear-gradient(180deg, #4a6cf7, #8b5cf6)`
                                            : '#d1d5db',
                                    }}
                                />
                            ))}
                        </div>

                        <div className="recording-timer">
                            {isRecording && <span className="rec-indicator">● REC</span>}
                            <span className="timer-value">{formatTime(timer)}</span>
                        </div>

                        {hasRecorded && !showFeedback && (
                            <div className="recording-status">
                                <div className="analyzing-spinner"></div>
                                <span>Analyzing your speech...</span>
                            </div>
                        )}

                        {hasRecorded && showFeedback && (
                            <p className="recording-done-text">Recording complete — See AI Feedback →</p>
                        )}
                    </div>

                    <div className="recording-controls">
                        {!isRecording ? (
                            <button className="btn btn-primary btn-lg record-btn" onClick={startRecording}>
                                <HiOutlineMicrophone size={20} />
                                {hasRecorded ? 'Record Again' : 'Start Recording'}
                            </button>
                        ) : (
                            <button className="btn btn-lg stop-btn" onClick={stopRecording}>
                                <HiOutlineStopCircle size={20} />
                                Stop Recording
                            </button>
                        )}
                        <button className="btn btn-outline" onClick={nextPrompt}>
                            <HiOutlineArrowPath size={16} />
                            Next Prompt
                        </button>
                    </div>
                </div>

                {/* AI Feedback Panel */}
                <div className="card feedback-card">
                    <h3 className="card-heading">AI Feedback</h3>

                    {showFeedback ? (
                        <div className="feedback-content animate-fadeInUp">
                            <div className="feedback-score-row">
                                <div className="feedback-metric">
                                    <span className="metric-label">Speech Clarity</span>
                                    <span className="metric-value">{mockFeedback.clarity}</span>
                                </div>
                                <div className="feedback-metric">
                                    <span className="metric-label">Confidence</span>
                                    <span className="metric-value">{mockFeedback.confidence}</span>
                                </div>
                            </div>

                            <div className="feedback-score-row">
                                <div className="feedback-metric">
                                    <span className="metric-label">Grammar</span>
                                    <span className="metric-value">{mockFeedback.grammar}</span>
                                </div>
                                <div className="feedback-metric">
                                    <span className="metric-label">Vocabulary</span>
                                    <span className="metric-value">{mockFeedback.vocabulary}</span>
                                </div>
                            </div>

                            <div className="feedback-tone">
                                <span>Tone</span>
                                <span className="badge badge-info">{mockFeedback.tone}</span>
                            </div>

                            <div className="feedback-divider"></div>

                            <div className="feedback-overall">
                                <ScoreCircle value={mockFeedback.overallScore} size={90} strokeWidth={7} />
                                <span className="overall-label">Overall Score</span>
                            </div>

                            <div className="feedback-suggestions">
                                <h4>Suggestions</h4>
                                <ul>
                                    {mockFeedback.suggestions.map((s, i) => (
                                        <li key={i}>{s}</li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    ) : (
                        <div className="feedback-empty">
                            <HiOutlinePlayCircle size={48} />
                            <p>Record your speech to get AI-powered feedback</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default SpeakingExercise;
