import { useApp } from '../context/AppContext';
import { TranscriptionView } from './TranscriptionView';

export function AudioPlayer() {
  const { selectedTrack, isMobileView, isTrackListVisible } = useApp();

  if (isMobileView && isTrackListVisible) {
    return null;
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
      }}
    >
    
      
      {selectedTrack && (
        <TranscriptionView trackId={selectedTrack.id} />
      )}
    </div>
  );
}
