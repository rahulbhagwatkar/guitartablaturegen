import sys
import json
import numpy as np  # Fixed: correct import syntax for numpy
import wave
import scipy.signal
import os

# New function to process audio and return notes
def process_audio(file_path):
    samples, sample_rate = load_audio(file_path)
    notes = detect_notes(samples, sample_rate)
    return notes

# Function to load and process audio
def load_audio(file_path):
    with wave.open(file_path, 'rb') as wf:
        sample_rate = wf.getframerate()
        # Process the file in smaller chunks
        chunk_size = 1024 * 1024  # 1MB chunks
        chunks = []
        while True:
            chunk = wf.readframes(chunk_size)
            if not chunk:
                break
            chunks.append(np.frombuffer(chunk, dtype=np.int16))
        samples = np.concatenate(chunks).astype(np.float32)
        
        # Downsample if file is too large
        if len(samples) > 1000000:  # If more than 1M samples
            downsample_factor = len(samples) // 1000000 + 1
            samples = samples[::downsample_factor]
            
    return samples, sample_rate

# Function to detect notes in audio using scipy
def detect_notes(samples, sample_rate):
    f, t, Sxx = scipy.signal.spectrogram(samples, sample_rate)
    detected_notes = []
    for i in range(len(t)):
        index = np.argmax(Sxx[:, i])
        pitch = f[index]
        if pitch > 0:
            detected_notes.append(pitch)
    return detected_notes

# Function to detect notes with timing information
def detect_notes_with_timing(samples, sample_rate):
    try:
        print("Starting note detection...", file=sys.stderr)
        nperseg = min(2048, len(samples))
        noverlap = nperseg // 4
        
        print(f"Sample rate: {sample_rate}, nperseg: {nperseg}", file=sys.stderr)
        f, t, Sxx = scipy.signal.spectrogram(
            samples, 
            sample_rate,
            nperseg=nperseg,
            noverlap=noverlap,
            window='hamming'
        )
        
        notes_timing = []
        step = max(1, int(0.1 * sample_rate / nperseg))  # 100ms steps

        print(f"Processing {len(t)} time points...", file=sys.stderr)
        for i in range(0, len(t), step):
            try:
                Sxx_slice = np.mean(Sxx[:, i:i+1], axis=1)
                if np.max(Sxx_slice) > 0:  # Check if there's any signal
                    peaks = scipy.signal.find_peaks(Sxx_slice, height=np.max(Sxx_slice) * 0.3)[0]
                    
                    for peak in peaks[:3]:  # Get top 3 peaks
                        freq = f[peak]
                        if freq > 80:  # Filter out very low frequencies
                            note = freq_to_note(freq)
                            notes_timing.append({
                                "note": note,
                                "start": float(t[i]),
                                "end": float(t[min(i + step, len(t) - 1)])
                            })
            except Exception as e:
                print(f"Error processing time point {i}: {str(e)}", file=sys.stderr)
                continue

        print(f"Successfully detected {len(notes_timing)} notes", file=sys.stderr)
        return notes_timing

    except Exception as e:
        print(f"Error in detect_notes_with_timing: {str(e)}", file=sys.stderr)
        return []

# Function to convert frequencies to musical notes
def freq_to_note(freq):
    A4 = 440.0
    C0 = A4 * 2 ** (-4.75)
    note_names = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
    h = round(12 * np.log2(freq / C0))
    octave = h // 12
    n = h % 12
    return note_names[n] + str(octave)

# Guitar fretboard mapping
guitar_fretboard = {
    'E': ['E2', 'F2', 'F#2', 'G2', 'G#2', 'A2', 'A#2', 'B2', 'C3', 'C#3', 'D3', 'D#3', 'E3'],
    'A': ['A2', 'A#2', 'B2', 'C3', 'C#3', 'D3', 'D#3', 'E3', 'F3', 'F#3', 'G3', 'G#3', 'A3'],
    'D': ['D3', 'D#3', 'E3', 'F3', 'F#3', 'G3', 'G#3', 'A3', 'A#3', 'B3', 'C4', 'C#4', 'D4'],
    'G': ['G3', 'G#3', 'A3', 'A#3', 'B3', 'C4', 'C#4', 'D4', 'D#4', 'E4', 'F4', 'F#4', 'G4'],
    'B': ['B3', 'C4', 'C#4', 'D4', 'D#4', 'E4', 'F4', 'F#4', 'G4', 'G#4', 'A4', 'A#4', 'B4'],
    'e': ['E4', 'F4', 'F#4', 'G4', 'G#4', 'A4', 'A#4', 'B4', 'C5', 'C#5', 'D5', 'D#5', 'E5']
}

# Function to map notes to fretboard positions
def map_notes_to_fretboard(note):
    positions = []
    print(f"Mapping note: {note}", file=sys.stderr)
    for string, notes in guitar_fretboard.items():
        if note in notes:
            fret = notes.index(note)
            positions.append((string, fret))
            print(f"Found position: string={string}, fret={fret} for note={note}", file=sys.stderr)
    
    if not positions:
        print(f"No positions found for note: {note}", file=sys.stderr)
    return positions

# Function to draw the fretboard
def draw_fretboard(positions):
    return [{"string": string, "fret": fret} for string, fret in positions]

def main():
    try:
        print("Starting processing...", file=sys.stderr)
        if len(sys.argv) < 2:
            print(json.dumps({
                "error": "No input file specified",
                "notes": {},
                "timing": []
            }))
            return

        file_path = sys.argv[1]
        if not os.path.exists(file_path):
            print(json.dumps({
                "error": f"File not found: {file_path}",
                "notes": {},
                "timing": []
            }))
            return

        print(f"Loading audio file: {file_path}", file=sys.stderr)
        try:
            samples, sample_rate = load_audio(file_path)
        except Exception as e:
            print(json.dumps({
                "error": f"Error loading audio: {str(e)}",
                "notes": {},
                "timing": []
            }))
            return

        print("Processing audio...", file=sys.stderr)
        try:
            notes_timing = detect_notes_with_timing(samples, sample_rate)
            
            # Process notes for fretboard with more logging
            notes_dict = {}
            print("\nProcessing notes for fretboard:", file=sys.stderr)
            for note_info in notes_timing:
                note = note_info["note"]
                if note not in notes_dict:
                    print(f"\nProcessing note: {note}", file=sys.stderr)
                    positions = map_notes_to_fretboard(note)
                    notes_dict[note] = draw_fretboard(positions)
                    print(f"Positions for {note}: {notes_dict[note]}", file=sys.stderr)

            result = {
                "notes": notes_dict,
                "timing": notes_timing,
                "error": None
            }

            print("Processing complete", file=sys.stderr)
            print(json.dumps(result))

        except Exception as e:
            print(f"Error processing audio: {str(e)}", file=sys.stderr)
            print(json.dumps({
                "error": f"Processing error: {str(e)}",
                "notes": {},
                "timing": []
            }))

    except Exception as e:
        print(f"Unexpected error: {str(e)}", file=sys.stderr)
        print(json.dumps({
            "error": str(e),
            "notes": {},
            "timing": []
        }))

if __name__ == "__main__":
    main()