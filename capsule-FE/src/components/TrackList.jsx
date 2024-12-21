import { useApp } from '../context/AppContext';
import { useTranscriptionList } from '../queries/useTranscriptionList';
import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';

export function TrackList() {
  const [searchParams, setSearchParams] = useSearchParams();
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '20');

  const {
    setSelectedTrack,
    selectedTrack,
    isTrackListVisible,
    isMobileView,
    toggleTrackList,
  } = useApp();

  const {
    data: transcriptionList,
    isLoading,
    error,
  } = useTranscriptionList(page, limit);

  useEffect(() => {
    if (
      transcriptionList?.data.length > 0 &&
      !transcriptionList.selectedTrack
    ) {
      setSelectedTrack(transcriptionList.data[0]);
    }
  }, [transcriptionList, setSelectedTrack]);

  const handleTrackSelect = (track) => {
    setSelectedTrack(track);
    if (isMobileView) {
      toggleTrackList();
    }
  };

  const handlePageChange = (newPage) => {
    setSearchParams((prev) => {
      const params = new URLSearchParams(prev);
      params.set('page', newPage.toString());
      return params;
    });
  };

  if (!isTrackListVisible && isMobileView) {
    return null;
  }

  function convertSecondsToHMS(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hours > 0) {
      return [
        hours.toString().padStart(2, '0'),
        minutes.toString().padStart(2, '0'),
        secs.toString().padStart(2, '0'),
      ].join(':');
    } else {
      return [
        minutes.toString().padStart(2, '0'),
        secs.toString().padStart(2, '0'),
      ].join(':');
    }
  }

  function trimString(text, maxLength = 160) {
    if (text.length > maxLength) {
      return text.substring(0, maxLength) + '...';
    }
    return text;
  }

  const renderPagination = () => {
    if (!transcriptionList?.pagination) return null;

    const { currentPage, totalPages } = transcriptionList.pagination;
    const hasTranscriptions = transcriptionList?.data?.length > 0;

    const buttonStyle = (disabled) => ({
      padding: '8px 16px',
      cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.5 : 1,
      backgroundColor: 'var(--bg-primary)',
      border: '1px solid var(--bg-hover)',
      borderRadius: '4px',
      color: 'var(--text-primary)',
      fontSize: '14px',
      transition: 'all 0.2s ease',
      ':hover': !disabled && {
        backgroundColor: 'var(--bg-hover)',
      },
    });

    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '12px',
          marginTop: '20px',
          padding: '16px',
          backgroundColor: 'var(--bg-secondary)',
          borderTop: '1px solid var(--bg-hover)',
        }}
      >
        <button
          onClick={() => handlePageChange(Math.max(page - 1, 1))}
          disabled={page === 1 || isLoading || !hasTranscriptions}
          style={buttonStyle(page === 1 || isLoading || !hasTranscriptions)}
        >
          Previous
        </button>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            color: 'var(--text-secondary)',
            fontSize: '14px',
          }}
        >
          <span
            style={{
              color: 'var(--text-primary)',
              fontWeight: 'bold',
              backgroundColor: 'var(--bg-primary)',
              padding: '4px 8px',
              borderRadius: '4px',
              minWidth: '28px',
              textAlign: 'center',
            }}
          >
            {page}/{totalPages}
          </span>
        </div>
        <button
          onClick={() => handlePageChange(Math.min(page + 1, totalPages))}
          disabled={page === totalPages || isLoading || !hasTranscriptions}
          style={buttonStyle(
            page === totalPages || isLoading || !hasTranscriptions
          )}
        >
          Next
        </button>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div style={{ padding: '20px' }}>
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            style={{
              height: '60px',
              backgroundColor: 'var(--bg-secondary)',
              borderRadius: '8px',
              marginBottom: '12px',
              padding: '12px',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
            }}
          >
            <div
              style={{
                width: '60%',
                height: '14px',
                backgroundColor: 'var(--bg-tertiary)',
                borderRadius: '4px',
              }}
            />
            <div
              style={{
                width: '40%',
                height: '12px',
                backgroundColor: 'var(--bg-tertiary)',
                borderRadius: '4px',
              }}
            />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div
      style={{
        padding: '20px',
        height: '100%',
        overflowY: 'hidden',
        display: isTrackListVisible ? 'block' : 'none',
        backgroundColor: 'var(--bg-secondary)',
      }}
    >
      <h2 style={{ marginBottom: '20px', color: 'var(--text-primary)' }}>
        Calls
      </h2>

      {error && (
        <div
          style={{
            color: 'var(--error)',
            textAlign: 'center',
            padding: '20px',
          }}
        >
          Error: {error.message}
        </div>
      )}
      <div style={{ height: 'calc(100vh - 230px)', overflowX: 'auto' }}>
        {!isLoading &&
          !error &&
          transcriptionList?.data.map((track) => (
            <div
              key={track.id}
              onClick={() => handleTrackSelect(track)}
              style={{
                padding: '10px',
                marginBottom: '10px',
                cursor: 'pointer',
                backgroundColor: selectedTrack?.id === track.id ? 'var(--bg-hover)' : 'var(--bg-primary)',
                borderRadius: '4px',
                color: 'var(--text-primary)',
                transition: 'background-color 0.2s',
                borderLeft: selectedTrack?.id === track.id ? '4px solid var(--primary)' : 'none',
                ':hover': {
                  backgroundColor: 'var(--bg-hover)',
                },
              }}
            >
              <div style={{ fontWeight: '450' }}>
                {trimString(track.text)}
              </div>
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                fontSize: '0.9em', 
                color: 'var(--text-secondary)',
                marginTop: '4px'
              }}>
                <span>{convertSecondsToHMS(track.duration)}</span>
                {track.demo && (
                  <span style={{
                    backgroundColor: '#A855F7',
                    color: 'white',
                    padding: '2px 8px',
                    borderRadius: '12px',
                    fontSize: '0.85em',
                    fontWeight: '500'
                  }}>
                    Demo
                  </span>
                )}
              </div>
            </div>
          ))}
      </div>

      {renderPagination()}
    </div>
  );
}
