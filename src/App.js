import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import './index.css';
import Fretboard from './Fretboard.js';

function App() {
  const [notes, setNotes] = useState({});
  const [currentNote, setCurrentNote] = useState(null);
  const [audioSrc, setAudioSrc] = useState(null);
  const [timeMap, setTimeMap] = useState([]);
  const [error, setError] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  
  const audioRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const animationFrameRef = useRef(null);

  const initializeAudioContext = () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 2048;
    }
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) {
      setError('No file selected');
      return;
    }

    // Reset states
    setError(null);
    setNotes({});
    setTimeMap([]);
    setCurrentNote(null);
    setAudioSrc(null);
    setIsPlaying(false);

    const formData = new FormData();
    formData.append('file', file);

    try {
      console.log('Uploading file:', file.name);
      const response = await axios.post('http://localhost:3001/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        validateStatus: false // Don't throw error on non-2xx status
      });

      console.log('Raw server response:', response.data);
      console.log('Notes received:', response.data.notes);
      console.log('Timing received:', response.data.timing);

      if (response.status !== 200) {
        throw new Error(
          response.data?.details || 
          response.data?.error || 
          'Server error'
        );
      }

      if (!response.data.notes || !response.data.timing) {
        throw new Error('Invalid response format from server');
      }

      setNotes(response.data.notes);
      setTimeMap(response.data.timing);
      
      // Create audio URL after successful processing
      const audioUrl = URL.createObjectURL(file);
      setAudioSrc(audioUrl);

    } catch (error) {
      console.error('Full upload error:', error);
      setError(
        error.response?.data?.details || 
        error.response?.data?.error ||
        error.message || 
        'Error processing file'
      );
      if (audioSrc) {
        URL.revokeObjectURL(audioSrc);
        setAudioSrc(null);
      }
    }
  };

  const updateFretboard = () => {
    if (!audioRef.current || !timeMap.length || !isPlaying) return;

    const currentTime = audioRef.current.currentTime;
    
    // Add debug logging
    console.log('Current time:', currentTime);
    
    const currentNotes = timeMap.filter(({ start, end }) => {
      const startTime = parseFloat(start);
      const endTime = parseFloat(end);
      const isInRange = currentTime >= startTime && currentTime <= endTime;
      if (isInRange) {
        console.log(`Note in range: start=${startTime}, end=${endTime}`);
      }
      return isInRange;
    });

    if (currentNotes.length > 0) {
      console.log('Found current notes:', currentNotes);
      const noteValues = currentNotes.map(note => note.note);
      console.log('Setting current notes:', noteValues);
      setCurrentNote(noteValues);
    } else {
      setCurrentNote(null);
    }

    animationFrameRef.current = requestAnimationFrame(updateFretboard);
  };

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handlePlay = () => {
      setIsPlaying(true);
      if (audioContextRef.current?.state === 'suspended') {
        audioContextRef.current.resume();
      }
      animationFrameRef.current = requestAnimationFrame(updateFretboard);
    };

    const handlePause = () => {
      setIsPlaying(false);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentNote(null);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };

    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('ended', handleEnded);

    // Connect audio to analyser when source changes
    if (audioContextRef.current && analyserRef.current) {
      const source = audioContextRef.current.createMediaElementSource(audio);
      source.connect(analyserRef.current);
      analyserRef.current.connect(audioContextRef.current.destination);
    }

    return () => {
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('ended', handleEnded);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [timeMap]);

  // Add debug logging when notes are received
  useEffect(() => {
    console.log('Notes dictionary updated:', notes);
  }, [notes]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (audioSrc) {
        URL.revokeObjectURL(audioSrc);
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, [audioSrc]);

  return (
    <div>
      <h1>Guitar Tabs App</h1>
      <input 
        type="file" 
        accept="audio/*"
        onChange={handleFileUpload} 
      />
      {error && (
        <div style={{ color: 'red', margin: '10px 0' }}>
          Error: {error}
        </div>
      )}
      {audioSrc && (
        <div>
          <audio 
            ref={audioRef} 
            controls 
            src={audioSrc}
            onError={(e) => {
              console.error('Audio error:', e);
              setError('Error playing audio file');
            }}
          >
            Your browser does not support the audio element.
          </audio>
          <Fretboard 
            notes={notes} 
            currentNote={currentNote} 
            isPlaying={isPlaying}
          />
          <div className="debug-info">
            <p>Current Note: {currentNote || 'None'}</p>
            <p>Total Notes: {Object.keys(notes).length}</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;