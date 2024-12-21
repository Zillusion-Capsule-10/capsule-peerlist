import { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../supabaseClient';
import '../styles/switch.css';

export function TranscriptionView({ trackId }) {
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [previousVolume, setPreviousVolume] = useState(1);
  const [autoScroll, setAutoScroll] = useState(true);
  const [activeTab, setActiveTab] = useState('analytics');
  const [isDragging, setIsDragging] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const audioRef = useRef(null);
  const containerRef = useRef(null);
  const userScrollRef = useRef(false);
  const scrollTimeoutRef = useRef(null);
  const { user } = useAuth();
  const isMobile = window.innerWidth < 768;

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.addEventListener('timeupdate', handleTimeUpdate);
      audioRef.current.addEventListener('loadedmetadata', handleLoadedMetadata);
      audioRef.current.addEventListener('ended', handleEnded);
    }
    return () => {
      if (audioRef.current) {
        audioRef.current.removeEventListener('timeupdate', handleTimeUpdate);
        audioRef.current.removeEventListener(
          'loadedmetadata',
          handleLoadedMetadata
        );
        audioRef.current.removeEventListener('ended', handleEnded);
      }
    };
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (container) {
      const handleScroll = () => {
        if (!userScrollRef.current) {
          return;
        }

        // Disable auto-scroll when user scrolls
        setAutoScroll(false);

        // Clear any existing timeout
        if (scrollTimeoutRef.current) {
          clearTimeout(scrollTimeoutRef.current);
        }

        // Reset userScrollRef after a delay
        scrollTimeoutRef.current = setTimeout(() => {
          userScrollRef.current = false;
        }, 150);
      };

      container.addEventListener('scroll', handleScroll);
      return () => {
        container.removeEventListener('scroll', handleScroll);
      };
    }
  }, []);

  const scrollToCurrentUtterance = () => {
    if (!autoScroll || !containerRef.current || !transcriptionData) {
      return;
    }

    const currentUtterance = transcriptionData.metadata.results.utterances.find(
      (utterance) =>
        currentTime >= utterance.start && currentTime <= utterance.end
    );

    if (currentUtterance) {
      const utteranceElement = document.getElementById(
        `utterance-${currentUtterance.id}`
      );
      if (utteranceElement) {
        userScrollRef.current = false;
        utteranceElement.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        });
      }
    }
  };

  useEffect(() => {
    scrollToCurrentUtterance();
  }, [currentTime, autoScroll]);

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  const handleEnded = () => {
    setIsPlaying(false);
  };

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleRewind = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = Math.max(
        0,
        audioRef.current.currentTime - 10
      );
    }
  };

  const handleForward = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = Math.min(
        duration,
        audioRef.current.currentTime + 10
      );
    }
  };

  const handleVolumeChange = (e) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    if (audioRef.current) {
      audioRef.current.volume = newVolume;
    }
    if (newVolume === 0) {
      setIsMuted(true);
    } else {
      setIsMuted(false);
    }
  };

  const toggleMute = () => {
    if (audioRef.current) {
      if (isMuted) {
        audioRef.current.volume = previousVolume;
        setVolume(previousVolume);
      } else {
        setPreviousVolume(volume);
        audioRef.current.volume = 0;
        setVolume(0);
      }
      setIsMuted(!isMuted);
    }
  };

  const handleProgressMouseDown = (e) => {
    setIsDragging(true);
    handleProgressMove(e);
  };

  const handleProgressMove = (e) => {
    if (isDragging && audioRef.current) {
      const progressBar = e.currentTarget;
      const rect = progressBar.getBoundingClientRect();
      const clickPosition = Math.max(
        0,
        Math.min(1, (e.clientX - rect.left) / progressBar.offsetWidth)
      );
      const newTime = clickPosition * duration;
      audioRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  const handleProgressMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    document.addEventListener('mouseup', handleProgressMouseUp);
    return () => {
      document.removeEventListener('mouseup', handleProgressMouseUp);
    };
  }, []);

  function formatDate(createdAt) {
    const date = new Date(createdAt);
    const now = new Date();

    const isToday =
      date.getFullYear() === now.getFullYear() &&
      date.getMonth() === now.getMonth() &&
      date.getDate() === now.getDate();

    const isYesterday =
      date.getFullYear() === now.getFullYear() &&
      date.getMonth() === now.getMonth() &&
      date.getDate() === now.getDate() - 1;

    if (isToday) {
      return `Today ${date.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      })}`;
    } else if (isYesterday) {
      return `Yesterday ${date.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      })}`;
    } else {
      return date.toLocaleDateString([], {
        month: 'short',
        year: 'numeric',
        day: '2-digit',
      });
    }
  }

  const handleProgressClick = (e) => {
    if (audioRef.current) {
      const progressBar = e.currentTarget;
      const clickPosition =
        (e.clientX - progressBar.getBoundingClientRect().left) /
        progressBar.offsetWidth;
      const newTime = clickPosition * duration;
      audioRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  const handleWordClick = (startTime) => {
    if (audioRef.current) {
      audioRef.current.currentTime = startTime;
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const { data: transcriptionData, isLoading } = useQuery({
    queryKey: ['transcription', trackId],
    queryFn: async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const response = await fetch(
        `https://deepgram-integration-l5v0.onrender.com/transcription/v2/${trackId}`,
        {
          headers: {
            Authorization: `Bearer ${session?.access_token}`,
          },
        }
      );
      if (!response.ok) {
        throw new Error('Failed to fetch transcription');
      }
      return response.json();
    },
    enabled: !!trackId && !!user,
  });

  const renderUtterance = (utterance) => {
    return (
      <div
        id={`utterance-${utterance.id}`}
        key={utterance.id}
        style={{
          backgroundColor:
            currentTime >= utterance.start && currentTime <= utterance.end
              ? 'var(--bg-tertiary)'
              : 'transparent',
          padding: '12px',
          borderRadius: '8px',
          transition: 'background-color 0.3s ease',
          paddingTop: '5px',
        }}
      >
        <div
          style={{
            display: 'flex',
            gap: '12px',
            marginBottom: '8px',
            alignItems: 'center',
          }}
        >
          <div
            style={{
              display: 'inline-block',
              padding: '4px 12px',
              backgroundColor:
                (utterance?.speaker ?? 0) === 0 ? '#ef4444' : '#3b82f6',
              color: 'white',
              borderRadius: '16px',
              fontSize: '14px',
            }}
          >
            {`Speaker ${(utterance?.speaker ?? 0) + 1}`}
          </div>
          <div style={{ color: 'gray', fontSize: '12px' }}>
            {`${formatTime(utterance.start)} - ${formatTime(utterance.end)}`}
          </div>
        </div>
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '0px',
            lineHeight: '1.8',
          }}
        >
          {utterance.words.map((word, index) => (
            <span
              key={index}
              onClick={() => handleWordClick(word.start)}
              style={{
                cursor: 'pointer',
                color:
                  word.start <= currentTime && word.end >= currentTime
                    ? 'var(--text-primary)'
                    : 'var(--text-secondary)',
                backgroundColor:
                  word.start <= currentTime && word.end >= currentTime
                    ? 'var(--bg-tertiary)'
                    : 'transparent',
                padding: '2px 4px',
                borderRadius: '4px',
                transition: 'all 0.2s',
                display: 'inline-block',
              }}
            >
              {word.punctuated_word}
            </span>
          ))}
        </div>
      </div>
    );
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const renderSkeleton = () => {
    const isDeepThinkingTab = activeTab === 'deepthinking';

    return (
      <div style={{ padding: '20px' }}>
        {isDeepThinkingTab && (
          <div
            style={{
              textAlign: 'center',
              marginBottom: '30px',
              color: 'var(--text-secondary)',
              fontSize: '16px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '12px',
            }}
          >
            <div
              className="spinner"
              style={{
                width: '40px',
                height: '40px',
                border: '3px solid var(--bg-tertiary)',
                borderTop: '3px solid var(--accent-color)',
                borderRadius: '50%',
              }}
            />
            <div>Deep thinking about your conversation...</div>
            <div style={{ fontSize: '14px', opacity: 0.7 }}>
              This may take a few moments
            </div>
          </div>
        )}

        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="skeleton-pulse"
            style={{
              marginBottom: '20px',
              padding: '12px',
              borderRadius: '8px',
              backgroundColor: 'var(--bg-secondary)',
            }}
          >
            <div
              style={{
                display: 'flex',
                gap: '8px',
                alignItems: 'center',
                marginBottom: '12px',
              }}
            >
              <div
                style={{
                  width: '80px',
                  height: '24px',
                  backgroundColor: 'var(--bg-tertiary)',
                  borderRadius: '12px',
                }}
              />
              <div
                style={{
                  width: '60px',
                  height: '14px',
                  backgroundColor: 'var(--bg-tertiary)',
                  borderRadius: '4px',
                }}
              />
            </div>
            <div
              style={{
                width: '100%',
                height: '14px',
                backgroundColor: 'var(--bg-tertiary)',
                borderRadius: '4px',
                marginBottom: '8px',
              }}
            />
            <div
              style={{
                width: '90%',
                height: '14px',
                backgroundColor: 'var(--bg-tertiary)',
                borderRadius: '4px',
              }}
            />
          </div>
        ))}
        <style>
          {`
            .spinner {
              animation: spin 1s linear infinite;
            }
            .skeleton-pulse {
              animation: pulse 1.5s ease-in-out infinite;
            }
            @keyframes pulse {
              0% {
                opacity: 1;
              }
              50% {
                opacity: 0.7;
              }
              100% {
                opacity: 1;
              }
            }
            @keyframes spin {
              0% {
                transform: rotate(0deg);
              }
              100% {
                transform: rotate(360deg);
              }
            }
          `}
        </style>
      </div>
    );
  };

  const renderAnalysisTab = () => {
    // Show skeleton when analysis is empty or Analysis array is not present
    if (
      !transcriptionData?.analysis?.Analysis ||
      Object.keys(transcriptionData?.analysis).length === 0
    ) {
      return renderSkeleton();
    }

    const renderOverallScores = () => {
      const { 'Overall Call Score': overallScore, Conclusion } =
        transcriptionData.analysis;

      return (
        <div style={{ marginBottom: '32px' }}>
          {/* Overall Scores */}
          <div
            style={{
              backgroundColor: 'var(--bg-primary)',
              borderRadius: '8px',
              padding: '20px',
              marginBottom: '24px',
            }}
          >
            <div
              style={{
                fontSize: '16px',
                fontWeight: '500',
                color: 'var(--text-primary)',
                marginBottom: '16px',
              }}
            >
              Overall Call Score
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                gap: '16px',
              }}
            >
              <div
                style={{
                  backgroundColor: 'var(--bg-secondary)',
                  padding: '16px',
                  borderRadius: '8px',
                  borderLeft: '4px solid var(--text-primary)',
                }}
              >
                <div
                  style={{
                    fontSize: '24px',
                    fontWeight: '600',
                    color: 'var(--text-primary)',
                  }}
                >
                  {overallScore.total}/10
                </div>
                <div
                  style={{ fontSize: '14px', color: 'var(--text-secondary)' }}
                >
                  Total Score
                </div>
              </div>
              {Object.entries(overallScore.criteria).map(([key, value]) => (
                <div
                  key={key}
                  style={{
                    backgroundColor: 'var(--bg-secondary)',
                    padding: '16px',
                    borderRadius: '8px',
                  }}
                >
                  <div
                    style={{
                      fontSize: '20px',
                      fontWeight: '500',
                      color: 'var(--text-primary)',
                    }}
                  >
                    {value}/10
                  </div>
                  <div
                    style={{
                      fontSize: '14px',
                      color: 'var(--text-secondary)',
                      textTransform: 'capitalize',
                    }}
                  >
                    {key}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Conclusion */}
          <div
            style={{
              backgroundColor: 'var(--bg-primary)',
              borderRadius: '8px',
              padding: '20px',
            }}
          >
            <div
              style={{
                fontSize: '16px',
                fontWeight: '500',
                color: 'var(--text-primary)',
                marginBottom: '16px',
              }}
            >
              Conclusion
            </div>

            {/* Insights */}
            <div style={{ marginBottom: '20px' }}>
              <div
                style={{
                  fontSize: '14px',
                  fontWeight: '500',
                  color: 'var(--text-secondary)',
                  marginBottom: '8px',
                }}
              >
                Key Insights
              </div>
              <ul
                style={{
                  margin: 0,
                  paddingLeft: '24px',
                  color: 'var(--text-secondary)',
                  fontSize: '14px',
                }}
              >
                {Conclusion.insights.map((insight, i) => (
                  <li key={i} style={{ marginBottom: '8px' }}>
                    {insight}
                  </li>
                ))}
              </ul>
            </div>

            {/* Follow-up Plan */}
            <div>
              <div
                style={{
                  fontSize: '14px',
                  fontWeight: '500',
                  color: 'var(--text-secondary)',
                  marginBottom: '8px',
                }}
              >
                Follow-up Plan
              </div>
              <div
                style={{
                  backgroundColor: 'var(--bg-secondary)',
                  padding: '16px',
                  borderRadius: '8px',
                }}
              >
                {Conclusion.follow_up_plan.actionItems.map((item, i) => (
                  <div
                    key={i}
                    style={{
                      marginBottom:
                        i < Conclusion.follow_up_plan.actionItems.length - 1
                          ? '16px'
                          : 0,
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        marginBottom: '4px',
                      }}
                    >
                      <div
                        style={{
                          fontSize: '14px',
                          fontWeight: '500',
                          color: 'var(--text-primary)',
                        }}
                      >
                        {item.item}
                      </div>
                      <div
                        style={{
                          fontSize: '12px',
                          color: 'var(--text-secondary)',
                          backgroundColor: 'var(--bg-tertiary)',
                          padding: '2px 8px',
                          borderRadius: '12px',
                        }}
                      >
                        {item.timeline}
                      </div>
                    </div>
                    <div
                      style={{
                        fontSize: '13px',
                        color: 'var(--text-secondary)',
                      }}
                    >
                      {item.actions_required.join(', ')}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      );
    };

    const findUtteranceByIndex = (index) => {
      return transcriptionData.metadata.results.utterances[index];
    };

    return (
      <div style={{ padding: '20px 0' }}>
        {renderOverallScores()}

        {transcriptionData.analysis.Analysis.map((item, index) => {
          const utterance = findUtteranceByIndex(item.index);

          return (
            <div
              key={index}
              style={{
                marginBottom: '24px',
                backgroundColor: 'var(--bg-primary)',
                borderRadius: '8px',
                padding: '16px',
              }}
            >
              <div style={{ marginBottom: '16px' }}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '16px',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                    }}
                  >
                    <div
                      style={{
                        display: 'inline-block',
                        padding: '4px 12px',
                        backgroundColor:
                          item.speaker === 'Speaker 2' ? '#3b82f6' : '#ef4444',
                        color: 'white',
                        borderRadius: '16px',
                        fontSize: '14px',
                      }}
                    >
                      {item.speaker || 'Speaker 1'}
                    </div>
                  </div>
                  {utterance && (
                    <div
                      onClick={() => {
                        if (audioRef.current) {
                          audioRef.current.currentTime = utterance.start;
                          audioRef.current.play();
                          setIsPlaying(true);
                        }
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '6px 12px',
                        backgroundColor: 'var(--bg-secondary)',
                        borderRadius: '16px',
                        cursor: 'pointer',
                        color: 'var(--text-secondary)',
                        fontSize: '14px',
                      }}
                    >
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                      >
                        <path d="M7 4V20L20 12L7 4Z" fill="currentColor" />
                      </svg>
                      {formatTime(utterance.start)}
                    </div>
                  )}
                </div>

                {utterance && (
                  <div
                    style={{
                      padding: '12px',
                      backgroundColor: 'var(--bg-secondary)',
                      borderRadius: '8px',
                      marginBottom: '16px',
                      fontSize: '14px',
                      color: 'var(--text-secondary)',
                      lineHeight: '1.8',
                    }}
                  >
                    {utterance.words.map((word, i) => (
                      <span
                        key={i}
                        onClick={() => handleWordClick(word.start)}
                        style={{
                          cursor: 'pointer',
                          color:
                            word.start <= currentTime && word.end >= currentTime
                              ? 'var(--text-primary)'
                              : 'var(--text-secondary)',
                          backgroundColor:
                            word.start <= currentTime && word.end >= currentTime
                              ? 'var(--bg-tertiary)'
                              : 'transparent',
                          padding: '2px 4px',
                          borderRadius: '4px',
                          transition: 'all 0.2s',
                          display: 'inline-block',
                        }}
                      >
                        {word.punctuated_word}
                      </span>
                    ))}
                  </div>
                )}

                {/* Strengths */}
                <div style={{ marginBottom: '16px' }}>
                  <div
                    style={{
                      color: '#22C55E',
                      fontSize: '14px',
                      fontWeight: '500',
                      marginBottom: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <path
                        d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z"
                        stroke="currentColor"
                        strokeWidth="2"
                      />
                      <path
                        d="M8 12L11 15L16 9"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    Strengths
                  </div>
                  <ul
                    style={{
                      margin: 0,
                      paddingLeft: '24px',
                      color: 'var(--text-secondary)',
                      fontSize: '14px',
                    }}
                  >
                    {item.analysis.strengths.map((strength, i) => (
                      <li key={i} style={{ marginBottom: '4px' }}>
                        {strength}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Weaknesses */}
                {item.analysis.weaknesses &&
                  item.analysis.weaknesses.length > 0 && (
                    <div style={{ marginBottom: '16px' }}>
                      <div
                        style={{
                          color: '#EF4444',
                          fontSize: '14px',
                          fontWeight: '500',
                          marginBottom: '8px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                        }}
                      >
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                        >
                          <path
                            d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z"
                            stroke="currentColor"
                            strokeWidth="2"
                          />
                          <path
                            d="M15 9L9 15M9 9L15 15"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                          />
                        </svg>
                        Weaknesses
                      </div>
                      <ul
                        style={{
                          margin: 0,
                          paddingLeft: '24px',
                          color: 'var(--text-secondary)',
                          fontSize: '14px',
                        }}
                      >
                        {item.analysis.weaknesses.map((weakness, i) => (
                          <li key={i} style={{ marginBottom: '4px' }}>
                            {weakness}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                {/* Improvements */}
                {item.analysis.improvements &&
                  item.analysis.improvements.length > 0 && (
                    <div style={{ marginBottom: '16px' }}>
                      <div
                        style={{
                          color: '#3B82F6',
                          fontSize: '14px',
                          fontWeight: '500',
                          marginBottom: '8px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                        }}
                      >
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                        >
                          <path
                            d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z"
                            stroke="currentColor"
                            strokeWidth="2"
                          />
                          <path
                            d="M12 16V8M12 8L8 12M12 8L16 12"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                        Improvements
                      </div>
                      <ul
                        style={{
                          margin: 0,
                          paddingLeft: '24px',
                          color: 'var(--text-secondary)',
                          fontSize: '14px',
                        }}
                      >
                        {item.analysis.improvements.map((improvement, i) => (
                          <li key={i} style={{ marginBottom: '4px' }}>
                            <strong>{improvement.area}:</strong>{' '}
                            {improvement.suggestion}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                {/* Hidden Intents */}
                {item.analysis.hidden_intents &&
                  item.analysis.hidden_intents.length > 0 && (
                    <div>
                      <div
                        style={{
                          color: '#A855F7',
                          fontSize: '14px',
                          fontWeight: '500',
                          marginBottom: '8px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                        }}
                      >
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                        >
                          <path
                            d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z"
                            stroke="currentColor"
                            strokeWidth="2"
                          />
                          <path
                            d="M12 8V12M12 16H12.01"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                          />
                        </svg>
                        Hidden Intents
                      </div>
                      <ul
                        style={{
                          margin: 0,
                          paddingLeft: '24px',
                          color: 'var(--text-secondary)',
                          fontSize: '14px',
                        }}
                      >
                        {item.analysis.hidden_intents.map((intent, i) => (
                          <li key={i} style={{ marginBottom: '4px' }}>
                            <strong>{intent.intent}</strong>
                            <div
                              style={{
                                fontSize: '13px',
                                color: 'var(--text-tertiary)',
                              }}
                            >
                              Evidence: {intent.evidence}
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const hasMultipleSpeakers = () => {
    if (!transcriptionData?.metadata?.results?.utterances) return false;
    return transcriptionData.metadata.results.utterances.some(
      (utterance) => (utterance?.speaker ?? 0) === 1
    );
  };

  const renderMembers = () => {
    return (
      <div
        style={{
          fontSize: '1.125rem',
          fontWeight: '500',
          color: 'var(--text-secondary)',
          letterSpacing: '-0.011em',
          padding: '8px 0',
          fontFamily: 'General Sans, sans-serif',
        }}
      >
        Members: {hasMultipleSpeakers() ? 'Speaker 1, Speaker 2' : 'Speaker 1'}
      </div>
    );
  };

  if (!trackId) {
    return null;
  }

  return (
    <div
      style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        padding: '10px',
        backgroundColor: 'var(--bg-secondary)',
        borderRadius: '8px',
        margin: '10px',
      }}
    >
      {/* Sticky header section */}
      <div
        style={{
          position: 'sticky',
          top: '10px',
          backgroundColor: 'var(--bg-secondary)',
          zIndex: 10,
          borderBottom: '1px solid var(--border-color)',
          margin: '-10px -10px 0 -10px',
          padding: '10px 10px 0 10px',
        }}
      >
        {/* Audio player section */}
        <div
          style={{
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            alignItems: 'center',
            gap: '16px',
            padding: '16px',
            backgroundColor: 'var(--bg-primary)',
            borderRadius: '8px',
            marginBottom: '10px',
          }}
        >
          <audio
            ref={audioRef}
            src={transcriptionData?.audioUrl}
            style={{ display: 'none' }}
          />

          {/* Progress bar for mobile */}
          {isMobile && (
            <div
              onMouseDown={handleProgressMouseDown}
              onMouseMove={handleProgressMove}
              onClick={handleProgressClick}
              style={{
                width: '100%',
                height: '4px',
                backgroundColor: 'var(--bg-tertiary)',
                borderRadius: '2px',
                cursor: 'pointer',
                position: 'relative',
                order: -1,
              }}
            >
              <div
                style={{
                  width: `${(currentTime / duration) * 100}%`,
                  height: '100%',
                  backgroundColor: 'var(--text-primary)',
                  borderRadius: '2px',
                  position: 'absolute',
                  top: 0,
                  left: 0,
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  left: `${(currentTime / duration) * 100}%`,
                  top: '50%',
                  transform: 'translate(-50%, -50%)',
                  width: '12px',
                  height: '12px',
                  backgroundColor: 'var(--text-primary)',
                  borderRadius: '50%',
                  pointerEvents: 'none',
                  opacity: isDragging ? 1 : 0,
                  transition: 'opacity 0.2s ease',
                }}
              />
            </div>
          )}

          {/* Play controls */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              width: isMobile ? '100%' : 'auto',
              justifyContent: isMobile ? 'center' : 'flex-start',
            }}
          >
            <button
              onClick={handleRewind}
              style={{
                padding: '8px',
                borderRadius: '4px',
                backgroundColor: 'transparent',
                border: 'none',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                fontSize: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M12.0001 7V3L4 9.5L12.0001 16V12C17.5001 12 20.5001 14 22.0001 19C21.0001 14 17.0001 9 12.0001 7Z"
                  fill="currentColor"
                />
              </svg>
            </button>
            <button
              onClick={togglePlay}
              style={{
                padding: '8px 12px',
                borderRadius: '4px',
                backgroundColor: 'transparent',
                border: 'none',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                fontSize: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {isPlaying ? (
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M8 5V19M16 5V19"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              ) : (
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path d="M7 4V20L20 12L7 4Z" fill="currentColor" />
                </svg>
              )}
            </button>
            <button
              onClick={handleForward}
              style={{
                padding: '8px',
                borderRadius: '4px',
                backgroundColor: 'transparent',
                border: 'none',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                fontSize: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M12 7V3L20 9.5L12 16V12C6.5 12 3.5 14 2 19C3 14 7 9 12 7Z"
                  fill="currentColor"
                />
              </svg>
            </button>
          </div>

          {/* Progress bar for desktop */}
          {!isMobile && (
            <div
              onMouseDown={handleProgressMouseDown}
              onMouseMove={handleProgressMove}
              onClick={handleProgressClick}
              style={{
                flex: 1,
                height: '4px',
                backgroundColor: 'var(--bg-tertiary)',
                borderRadius: '2px',
                cursor: 'pointer',
                position: 'relative',
              }}
            >
              <div
                style={{
                  width: `${(currentTime / duration) * 100}%`,
                  height: '100%',
                  backgroundColor: 'var(--text-primary)',
                  borderRadius: '2px',
                  position: 'absolute',
                  top: 0,
                  left: 0,
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  left: `${(currentTime / duration) * 100}%`,
                  top: '50%',
                  transform: 'translate(-50%, -50%)',
                  width: '12px',
                  height: '12px',
                  backgroundColor: 'var(--text-primary)',
                  borderRadius: '50%',
                  pointerEvents: 'none',
                  opacity: isDragging ? 1 : 0,
                  transition: 'opacity 0.2s ease',
                }}
              />
            </div>
          )}

          {/* Additional controls container */}
          <div
            style={{
              display: 'flex',
              flexDirection: isMobile ? 'column' : 'row',
              alignItems: 'center',
              gap: isMobile ? '12px' : '16px',
              width: isMobile ? '100%' : 'auto',
              marginLeft: isMobile ? 0 : 'auto',
            }}
          >
            {/* Time display */}
            <div
              style={{
                color: 'var(--text-secondary)',
                fontSize: '14px',
                minWidth: '100px',
                textAlign: 'center',
                order: isMobile ? 1 : 0,
              }}
            >
              {formatTime(currentTime)} / {formatTime(duration)}
            </div>

            {/* Volume and auto-scroll controls */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                justifyContent: isMobile ? 'center' : 'flex-end',
                order: isMobile ? 2 : 0,
                width: isMobile ? '100%' : 'auto',
              }}
            >
              <div
                style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                {/* Volume controls */}
                <button
                  onClick={toggleMute}
                  style={{
                    backgroundColor: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '4px',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  {isMuted ? (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                      <path
                        d="M2 9.5H6L11 5V19L6 14.5H2V9.5Z"
                        fill="currentColor"
                      />
                      <path
                        d="M17 9L23 15M17 15L23 9"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                      />
                    </svg>
                  ) : volume > 0.5 ? (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                      <path
                        d="M2 9.5H6L11 5V19L6 14.5H2V9.5Z"
                        fill="currentColor"
                      />
                      <path
                        d="M15 8C17.7614 8 20 10.2386 20 13C20 15.7614 17.7614 18 15 18"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                      />
                      <path
                        d="M15 5C19.4183 5 23 8.58172 23 13C23 17.4183 19.4183 21 15 21"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                      />
                    </svg>
                  ) : volume > 0 ? (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                      <path
                        d="M2 9.5H6L11 5V19L6 14.5H2V9.5Z"
                        fill="currentColor"
                      />
                      <path
                        d="M15 8C17.7614 8 20 10.2386 20 13C20 15.7614 17.7614 18 15 18"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                      />
                    </svg>
                  ) : (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                      <path
                        d="M2 9.5H6L11 5V19L6 14.5H2V9.5Z"
                        fill="currentColor"
                      />
                    </svg>
                  )}
                </button>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={volume}
                  onChange={handleVolumeChange}
                  style={{
                    width: '80px',
                    accentColor: 'var(--text-secondary)',
                    height: '4px',
                    backgroundColor: 'var(--bg-tertiary)',
                    borderRadius: '2px',
                    cursor: 'pointer',
                  }}
                />
              </div>
              {/* Auto-scroll toggle */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '6px 12px',
                  borderRadius: '16px',
                  position: 'relative', // For tooltip positioning
                }}
                onMouseEnter={() => setShowTooltip(true)} // Show tooltip on hover
                onMouseLeave={() => setShowTooltip(false)} // Hide tooltip when not hovering
              >
                <label className="switch">
                  <input
                    type="checkbox"
                    checked={autoScroll}
                    onChange={(e) => {
                      setAutoScroll(e.target.checked);
                      if (e.target.checked) {
                        scrollToCurrentUtterance();
                      }
                    }}
                  />
                  <span className="slider round"></span>
                </label>
                {/* Tooltip */}
                <span
                  style={{
                    visibility: showTooltip ? 'visible' : 'hidden',
                    opacity: showTooltip ? 1 : 0,
                    backgroundColor: '#000',
                    color: '#fff',
                    textAlign: 'center',
                    borderRadius: '4px',
                    padding: '6px 10px',
                    position: 'absolute',
                    top: '-40px', // Position above the toggle
                    left: '50%', // Center horizontally
                    transform: 'translateX(-50%)', // Center adjustment
                    whiteSpace: 'nowrap',
                    transition: 'opacity 0.3s ease, visibility 0.3s ease',
                    zIndex: 1,
                    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)', // Optional: Add shadow for better visibility
                  }}
                >
                  Auto-scroll
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs section */}
        <div
          style={{
            display: 'flex',
            backgroundColor: 'var(--bg-secondary)',
            borderBottom: '1px solid var(--border-color)',
          }}
        >
          <button
            onClick={() => setActiveTab('analytics')}
            style={{
              flex: 1,
              padding: '16px 8px',
              backgroundColor: 'transparent',
              border: 'none',
              borderBottom: `2px solid ${
                activeTab === 'analytics'
                  ? 'var(--accent-color)'
                  : 'transparent'
              }`,
              color:
                activeTab === 'analytics'
                  ? 'var(--text-primary)'
                  : 'var(--text-secondary)',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '600',
              transition: 'all 0.2s ease',
              outline: 'none',
              borderRadius: 0,
            }}
          >
            Transcript
          </button>
          <button
            onClick={() => setActiveTab('deepthinking')}
            style={{
              flex: 1,
              padding: '16px 8px',
              backgroundColor: 'transparent',
              border: 'none',
              borderBottom: `2px solid ${
                activeTab === 'deepthinking'
                  ? 'var(--accent-color)'
                  : 'transparent'
              }`,
              color:
                activeTab === 'deepthinking'
                  ? 'var(--text-primary)'
                  : 'var(--text-secondary)',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '600',
              transition: 'all 0.2s ease',
              outline: 'none',
              borderRadius: 0,
            }}
          >
            Deep Thinking
          </button>
        </div>
      </div>

      {/* Scrollable content */}
      <div
        ref={containerRef}
        style={{
          flex: 1,
          overflowY: 'auto',
          backgroundColor: 'var(--bg-secondary)',
          marginTop: '10px',
          padding: '10px',
        }}
        onWheel={() => {
          userScrollRef.current = true;
        }}
        onTouchMove={() => {
          userScrollRef.current = true;
        }}
      >
        <style>
          {`
            ::-webkit-scrollbar {
              width: 8px;
            }
            ::-webkit-scrollbar-track {
              background: var(--bg-secondary);
              border-radius: 4px;
            }
            ::-webkit-scrollbar-thumb {
              background: var(--text-secondary);
              border-radius: 4px;
            }
            ::-webkit-scrollbar-thumb:hover {
              background: var(--text-primary);
            }
          `}
        </style>
        {/* Tab Content */}
        {isLoading ? (
          renderSkeleton()
        ) : activeTab === 'analytics' ? (
          <>
            <div>
              <div
                style={{ display: 'flex', gap: '8px', alignItems: 'center' }}
              >
                <div
                  style={{
                    fontSize: '1.125rem',
                    fontWeight: '500',
                    color: 'var(--text-secondary)',
                    letterSpacing: '-0.011em',
                    padding: '8px 0',
                    fontFamily: 'General Sans, sans-serif',
                  }}
                >
                  {formatDate(transcriptionData.created_at)}
                </div>

                <div
                  style={{ color: 'var(--text-secondary)', fontSize: '14px' }}
                >
                  •
                </div>
                {renderMembers()}
              </div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px',
                  marginBottom: '24px',
                  marginTop: '16px',
                  backgroundColor: 'var(--bg-secondary)',
                  padding: '16px',
                  borderRadius: '8px',
                  border: '1px solid var(--border-color)',
                }}
              >
                <div
                  style={{
                    fontSize: '1.125rem',
                    fontWeight: '500',
                    color: 'var(--text-primary)',
                    lineHeight: '1.6',
                    letterSpacing: '-0.011em',
                    fontFamily: 'General Sans, sans-serif',
                  }}
                >
                  {transcriptionData.metadata.results.summary.short}
                </div>
              </div>
            </div>

            <div>
              {transcriptionData.metadata.results.utterances.map(
                renderUtterance
              )}
            </div>
          </>
        ) : (
          renderAnalysisTab()
        )}
      </div>
    </div>
  );
}

<style>
  {`
    @keyframes pulse {
      0% {
        opacity: 1;
      }
      50% {
        opacity: 0.7;
      }
      100% {
        opacity: 1;
      }
    }
    @keyframes spin {
      0% {
        transform: rotate(0deg);
      }
      100% {
        transform: rotate(360deg);
      }
    }
  `}
</style>;
