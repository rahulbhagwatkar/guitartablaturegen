import React, { useEffect } from 'react';
import './Fretboard.css';

const Fretboard = ({ notes, currentNote, isPlaying }) => {
  const strings = ['e', 'B', 'G', 'D', 'A', 'E'];
  const frets = Array.from({ length: 12 }, (_, i) => i);

  const isNoteActive = (string, fret) => {
    if (!currentNote || !notes) {
      console.log('No current note or notes dictionary');
      return false;
    }
    
    const activeNotes = Array.isArray(currentNote) ? currentNote : [currentNote];
    console.log('Active notes to check:', activeNotes);
    
    return activeNotes.some(noteName => {
      const positions = notes[noteName] || [];
      console.log(`Checking positions for ${noteName}:`, positions);
      
      const hasMatch = positions.some(pos => {
        const match = pos.string === string && pos.fret === fret;
        if (match) {
          console.log(`Match found at string=${string}, fret=${fret} for note=${noteName}`);
        }
        return match;
      });
      
      return hasMatch;
    });
  };

  // Log props changes
  useEffect(() => {
    console.log('Fretboard received new props:', {
      notesCount: Object.keys(notes || {}).length,
      currentNote,
      isPlaying
    });
  }, [notes, currentNote, isPlaying]);

  const getNotePosition = (string, fret) => {
    const stringIndex = strings.indexOf(string);
    // Align with string positions from CSS
    const stringPosition = 10 + (stringIndex * 15);
    // Align with fret positions from CSS
    const fretPosition = 8.33 * (fret + 1);
    return { top: `${stringPosition}%`, left: `${fretPosition}%` };
  };

  return (
    <div className="fretboard">
      {/* Render frets */}
      {frets.map((fret) => (
        <div key={`fret-${fret}`} className={`fret fret-${fret + 1}`} />
      ))}
      
      {/* Render strings */}
      {strings.map((string, i) => (
        <div key={`string-${i}`} className={`string string-${i + 1}`} />
      ))}
      
      {/* Add debug display */}
      <div className="debug-overlay" style={{position: 'absolute', top: '-30px', left: 0, color: 'white'}}>
        Current Notes: {JSON.stringify(currentNote)}
      </div>
      
      {/* Render note markers */}
      {strings.map(string =>
        frets.map(fret => {
          const active = isNoteActive(string, fret);
          if (active) {
            console.log(`Rendering marker at string=${string}, fret=${fret}`);
            return (
              <div
                key={`note-${string}-${fret}`}
                className={`note-marker ${isPlaying ? 'playing' : ''}`}
                style={getNotePosition(string, fret)}
              />
            );
          }
          return null;
        })
      )}
    </div>
  );
};

export default Fretboard;