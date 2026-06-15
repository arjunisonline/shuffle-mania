import { useState, useRef, useEffect } from 'react';
import type { KeyboardEvent, ChangeEvent } from 'react';

export default function App() {
  // --- States ---
  const [playerNames, setPlayerNames] = useState<string[]>(['', '', '', '']);
  const [totalPlayersCount, setTotalPlayersCount] = useState<number>(4);
  const [isShuffling, setIsShuffling] = useState<boolean>(false);
  const [shuffledNames, setShuffledNames] = useState<string[] | null>(null);
  const [splitTeams, setSplitTeams] = useState<boolean>(false);
  const [teamCount, setTeamCount] = useState<number>(2);
  const [shuffledTeams, setShuffledTeams] = useState<string[][] | null>(null);
  const [errors, setErrors] = useState<Record<number, string>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [showToast, setShowToast] = useState<string | null>(null);
  const [activeModal, setActiveModal] = useState<'how' | 'privacy' | 'terms' | null>(null);

  // Focus tracking ref for keyboard navigation
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const lastActionWasAdd = useRef<boolean>(false);

  // Sync inputs length when total count input changes
  const handleCountChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value === '') {
      setTotalPlayersCount(0); // Allow clearing input temporary
      return;
    }

    const count = parseInt(value, 10);
    if (isNaN(count)) return;

    // Constrain counts between 2 and 100
    const constrainedCount = Math.max(0, Math.min(100, count));
    setTotalPlayersCount(constrainedCount);

    if (constrainedCount >= 2) {
      adjustPlayerArraySize(constrainedCount);
    }
  };

  const handleCountBlur = () => {
    // Enforce minimum of 2 players on blur
    if (totalPlayersCount < 2) {
      setTotalPlayersCount(2);
      adjustPlayerArraySize(2);
    }
  };

  const adjustPlayerArraySize = (targetSize: number) => {
    setPlayerNames((prev) => {
      if (prev.length === targetSize) return prev;
      
      const newArray = [...prev];
      if (newArray.length < targetSize) {
        // Grow array
        while (newArray.length < targetSize) {
          newArray.push('');
        }
      } else {
        // Shrink array
        newArray.length = targetSize;
      }
      return newArray;
    });

    if (targetSize < teamCount) {
      setTeamCount(Math.max(2, targetSize));
    }

    // Clear errors beyond target size
    setErrors((prev) => {
      const newErrors = { ...prev };
      Object.keys(newErrors).forEach((key) => {
        if (parseInt(key, 10) >= targetSize) {
          delete newErrors[parseInt(key, 10)];
        }
      });
      return newErrors;
    });
    setGeneralError(null);
  };

  // Focus management when inputs count increases
  useEffect(() => {
    if (lastActionWasAdd.current && inputRefs.current[playerNames.length - 1]) {
      inputRefs.current[playerNames.length - 1]?.focus();
      lastActionWasAdd.current = false;
    }
  }, [playerNames.length]);

  // Handle single name change
  const handleNameChange = (index: number, value: string) => {
    setPlayerNames((prev) => {
      const updated = [...prev];
      updated[index] = value;
      return updated;
    });

    // Clear specific error if user corrected it
    if (value.trim() !== '') {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[index];
        return next;
      });
    }
  };

  // Keyboard navigation: Enter -> go to next or add new
  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (index < playerNames.length - 1) {
        // Focus next field
        inputRefs.current[index + 1]?.focus();
      } else {
        // We are on the last item, add a new player dynamically
        addPlayer();
      }
    }
  };

  // Action: Add new player input field
  const addPlayer = () => {
    if (playerNames.length >= 100) {
      setGeneralError('Maximum player limit (100) reached.');
      return;
    }
    lastActionWasAdd.current = true;
    setPlayerNames((prev) => [...prev, '']);
    setTotalPlayersCount((prev) => prev + 1);
    setGeneralError(null);
  };

  // Action: Remove specific player
  const removePlayer = (index: number) => {
    if (playerNames.length <= 2) {
      setGeneralError('A minimum of 2 players is required to shuffle.');
      return;
    }
    
    setPlayerNames((prev) => {
      const next = prev.filter((_, idx) => idx !== index);
      return next;
    });
    setTotalPlayersCount((prev) => prev - 1);
    
    // Adjust team count if it exceeds player count
    if (playerNames.length - 1 < teamCount) {
      setTeamCount(Math.max(2, playerNames.length - 1));
    }
    
    // Clear/adjust errors
    setErrors((prev) => {
      const next: Record<number, string> = {};
      let nextIdx = 0;
      for (let i = 0; i < playerNames.length; i++) {
        if (i !== index) {
          if (prev[i]) {
            next[nextIdx] = prev[i];
          }
          nextIdx++;
        }
      }
      return next;
    });
    setGeneralError(null);
  };

  // Fisher-Yates Shuffling logic
  const shuffleList = (list: string[]): string[] => {
    const arr = [...list];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  };

  // Action: Shuffle trigger
  const handleShuffle = () => {
    setGeneralError(null);
    const newErrors: Record<number, string> = {};
    let hasValidationError = false;

    // 1. Validation
    playerNames.forEach((name, idx) => {
      if (name.trim() === '') {
        newErrors[idx] = 'Name is required';
        hasValidationError = true;
      }
    });

    if (playerNames.length < 2) {
      setGeneralError('Add at least 2 players to shuffle.');
      return;
    }

    if (hasValidationError) {
      setErrors(newErrors);
      setGeneralError('Please fix empty player names before shuffling.');
      return;
    }

    if (splitTeams && teamCount > playerNames.length) {
      setGeneralError(`Cannot split into more teams than players (${playerNames.length} players available).`);
      return;
    }

    // 2. Simulate Shuffling
    setIsShuffling(true);
    setShuffledNames(null);
    setShuffledTeams(null);

    // Dynamic timeout to simulate anticipation (2.5 seconds)
    setTimeout(() => {
      setIsShuffling(false);
      const shuffled = shuffleList(playerNames);
      setShuffledNames(shuffled);

      if (splitTeams) {
        const teams: string[][] = Array.from({ length: teamCount }, () => []);
        shuffled.forEach((name, idx) => {
          teams[idx % teamCount].push(name);
        });
        setShuffledTeams(teams);
      }
    }, 2500);
  };

  // Action: Reshuffle instantly without timer delay
  const handleReshuffleInstantly = () => {
    if (shuffledNames) {
      const shuffled = shuffleList(playerNames);
      setShuffledNames(shuffled);

      if (splitTeams) {
        const teams: string[][] = Array.from({ length: teamCount }, () => []);
        shuffled.forEach((name, idx) => {
          teams[idx % teamCount].push(name);
        });
        setShuffledTeams(teams);
      }

      triggerToast('Lineup reshuffled instantly');
    }
  };

  // Action: Copy results to clipboard
  const handleCopy = () => {
    if (!shuffledNames) return;
    
    let textToCopy = '';
    if (splitTeams && shuffledTeams) {
      shuffledTeams.forEach((team, teamIdx) => {
        textToCopy += `--- TEAM ${teamIdx + 1} ---\n`;
        team.forEach((player, pIdx) => {
          textToCopy += `${pIdx + 1}. ${player}\n`;
        });
        textToCopy += '\n';
      });
    } else {
      textToCopy = shuffledNames
        .map((name, idx) => `${idx + 1}. ${name}`)
        .join('\n');
    }

    navigator.clipboard.writeText(textToCopy.trim())
      .then(() => {
        triggerToast('Copied list to clipboard!');
      })
      .catch((err) => {
        console.error('Failed to copy list: ', err);
        triggerToast('Copy failed. Please select and copy manually.');
      });
  };

  // Action: Reset all states
  const handleReset = () => {
    setPlayerNames(['', '', '', '']);
    setTotalPlayersCount(4);
    setIsShuffling(false);
    setShuffledNames(null);
    setShuffledTeams(null);
    setErrors({});
    setGeneralError(null);
    setSplitTeams(false);
    setTeamCount(2);
  };

  const triggerToast = (msg: string) => {
    setShowToast(msg);
    setTimeout(() => {
      setShowToast(null);
    }, 2000);
  };

  return (
    <>
      {/* --- Navbar --- */}
      <nav className="navbar" aria-label="Main Navigation">
        <div className="brand">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="brand-icon">
            <polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
          </svg>
          <span>Shufflemania</span>
        </div>
        <div className="navbar-actions">
          <button
            type="button"
            className="btn btn-sm"
            onClick={() => setActiveModal('how')}
            aria-label="View instructions on how to use Shufflemania"
          >
            How to Use
          </button>
        </div>
      </nav>

      {/* --- Main Content Grid Container --- */}
      <div className="main-content">
        <h1>Shufflemania</h1>

        {/* --- Main Configuration Card --- */}
        <section className="card" aria-labelledby="card-config-title">
          <h2 id="card-config-title" style={{ display: 'none' }}>Configuration</h2>
          
          {/* Total Count Form Control */}
          <div className="form-group">
            <label htmlFor="total-players-input" className="form-label">
              Total Players
            </label>
            <div className="input-row">
              <input
                type="number"
                id="total-players-input"
                value={totalPlayersCount === 0 ? '' : totalPlayersCount}
                onChange={handleCountChange}
                onBlur={handleCountBlur}
                min="2"
                max="100"
                disabled={isShuffling}
                placeholder="4"
                aria-describedby="total-players-desc"
              />
              <p id="total-players-desc" style={{ fontSize: '0.875rem' }}>
                Enter count to dynamically generate inputs (2 - 100)
              </p>
            </div>
          </div>

          {/* General Error Banner */}
          {generalError && (
            <div className="alert-banner" role="alert">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              <span>{generalError}</span>
            </div>
          )}

          {/* Dynamic Name inputs List */}
          <div className="players-list-header">
            <span className="form-label" style={{ marginBottom: 0 }}>Player Names</span>
            <button
              type="button"
              className="btn btn-sm"
              onClick={addPlayer}
              disabled={isShuffling}
              aria-label="Add extra player field"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              Add Player
            </button>
          </div>

          <div className="player-input-list">
            {playerNames.map((name, index) => (
              <div key={index} className="player-input-row">
                <span className="player-index">{index + 1}</span>
                <div className={`player-input-wrapper ${errors[index] ? 'has-error' : ''}`}>
                  <input
                    type="text"
                    ref={(el) => { inputRefs.current[index] = el; }}
                    value={name}
                    onChange={(e) => handleNameChange(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    placeholder={`Player ${index + 1} name`}
                    disabled={isShuffling}
                    aria-label={`Player ${index + 1} Name`}
                    aria-invalid={errors[index] ? 'true' : 'false'}
                    maxLength={50}
                  />
                  {errors[index] && (
                    <span className="field-error-message">{errors[index]}</span>
                  )}
                </div>
                <button
                  type="button"
                  className="btn btn-danger btn-icon-only"
                  onClick={() => removePlayer(index)}
                  disabled={isShuffling || playerNames.length <= 2}
                  aria-label={`Remove Player ${index + 1}`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              </div>
            ))}
          </div>

          {/* Team Splitting Configuration */}
          <div style={{ marginTop: '24px', borderTop: '1px solid var(--border-color)', paddingTop: '20px', marginBottom: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <label htmlFor="split-teams-checkbox" className="form-label" style={{ marginBottom: 0, cursor: 'pointer' }}>
                Split into Teams
              </label>
              <input
                type="checkbox"
                id="split-teams-checkbox"
                checked={splitTeams}
                onChange={(e) => setSplitTeams(e.target.checked)}
                disabled={isShuffling}
                style={{ width: '18px', height: '18px', cursor: 'pointer' }}
              />
            </div>

            {splitTeams && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '12px', animation: 'fadeIn 150ms ease' }}>
                <label htmlFor="team-count-input" className="form-label" style={{ marginBottom: 0 }}>
                  Number of Teams:
                </label>
                <div className="input-row" style={{ flex: 1, justifyContent: 'flex-start', gap: '6px' }}>
                  <button
                    type="button"
                    className="btn btn-sm btn-icon-only"
                    style={{ width: '36px', height: '36px' }}
                    onClick={() => setTeamCount(prev => Math.max(2, prev - 1))}
                    disabled={isShuffling || teamCount <= 2}
                  >
                    -
                  </button>
                  <input
                    type="number"
                    id="team-count-input"
                    value={teamCount}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10);
                      if (!isNaN(val)) setTeamCount(Math.max(2, Math.min(playerNames.length, val)));
                    }}
                    onBlur={() => {
                      if (teamCount > playerNames.length) {
                        setTeamCount(playerNames.length);
                      }
                    }}
                    min="2"
                    max={Math.max(2, playerNames.length)}
                    disabled={isShuffling}
                    style={{ maxHeight: '36px', width: '50px', textAlign: 'center', margin: '0 4px', padding: '6px' }}
                  />
                  <button
                    type="button"
                    className="btn btn-sm btn-icon-only"
                    style={{ width: '36px', height: '36px' }}
                    onClick={() => setTeamCount(prev => Math.min(playerNames.length, prev + 1))}
                    disabled={isShuffling || teamCount >= playerNames.length}
                  >
                    +
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Shuffling Loading Overlay */}
          {isShuffling ? (
            <div className="shuffling-container" aria-live="polite">
              <div className="spinner"></div>
              <div className="shuffling-text">Shuffling lineup, building suspense...</div>
            </div>
          ) : (
            <button
              type="button"
              className="btn btn-primary btn-full"
              onClick={handleShuffle}
              disabled={playerNames.length < 2}
              style={{ padding: '12px 20px', fontSize: '0.95rem' }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '4px' }}>
                <polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
              </svg>
              Shuffle Players
            </button>
          )}
        </section>

        {/* --- Results Card --- */}
        {shuffledNames && !isShuffling && (
          <section className="card" style={{ animation: 'fadeIn 200ms ease' }} aria-labelledby="card-results-title">
            <div className="card-header" style={{ marginBottom: '16px' }}>
              <h2 id="card-results-title">Shuffled Lineup</h2>
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                {shuffledNames.length} Players
              </span>
            </div>

            {splitTeams && shuffledTeams ? (
              <div className="teams-results-container" style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '16px', marginBottom: '24px' }}>
                {shuffledTeams.map((team, teamIdx) => (
                  <div key={teamIdx} className="team-result-card" style={{ border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '16px', backgroundColor: 'var(--bg-app)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
                      <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--color-primary)' }}>Team {teamIdx + 1}</span>
                      <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>{team.length} Players</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {team.map((player, pIdx) => (
                        <div key={pIdx} style={{ display: 'flex', alignItems: 'center', fontSize: '0.9rem' }}>
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: 'var(--text-muted)', width: '25px' }}>{pIdx + 1}</span>
                          <span style={{ fontWeight: 500 }}>{player}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="results-list">
                {shuffledNames.map((name, idx) => (
                  <div key={idx} className="result-item">
                    <div className="result-rank">{idx + 1}</div>
                    <div className="result-name">{name}</div>
                  </div>
                ))}
              </div>
            )}

            <div className="actions-footer">
              <div className="button-row">
                <button
                  type="button"
                  className="btn btn-primary"
                  style={{ flex: 1 }}
                  onClick={handleCopy}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                  </svg>
                  Copy List
                </button>
                <button
                  type="button"
                  className="btn"
                  style={{ flex: 1 }}
                  onClick={handleReshuffleInstantly}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/>
                  </svg>
                  Reshuffle
                </button>
              </div>
              <button
                type="button"
                className="btn btn-danger btn-full"
                onClick={handleReset}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
                  <polyline points="3 3 3 8 8 8"/>
                </svg>
                Reset Shuffler
              </button>
            </div>
          </section>
        )}

        {/* --- Toast System --- */}
        {showToast && (
          <div className="toast-message" role="status">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style={{ color: 'var(--color-success)' }}>
              <polyline points="20 6 9 17 4 12"/>
            </svg>
            <span>{showToast}</span>
          </div>
        )}
      </div>

      {/* --- Footer --- */}
      <footer className="footer">
        <div>
          &copy; 2026 Shufflemania. All rights reserved.
        </div>
        <div className="footer-links">
          <button
            type="button"
            className="footer-link"
            onClick={() => setActiveModal('privacy')}
          >
            Privacy Policy
          </button>
          <button
            type="button"
            className="footer-link"
            onClick={() => setActiveModal('terms')}
          >
            Terms & Conditions
          </button>
        </div>
      </footer>

      {/* --- Modals Overlay --- */}
      {activeModal && (
        <div className="modal-overlay" onClick={() => setActiveModal(null)} role="dialog" aria-modal="true">
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>
                {activeModal === 'how' && 'How to Use Shufflemania'}
                {activeModal === 'privacy' && 'Privacy Policy'}
                {activeModal === 'terms' && 'Terms & Conditions'}
              </h2>
              <button
                type="button"
                className="btn btn-sm btn-icon-only"
                onClick={() => setActiveModal(null)}
                aria-label="Close modal"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
            <div className="modal-body">
              {activeModal === 'how' && (
                <div className="instructions-steps">
                  <div className="step">
                    <strong>1. Set Player Count</strong>
                    <p>Enter the number of players in the "Total Players" field, or click "Add Player" to grow the list dynamically.</p>
                  </div>
                  <div className="step">
                    <strong>2. Enter Names</strong>
                    <p>Type player names into the generated input fields. Press the <code>Enter</code> key to focus the next input or add a new slot instantly.</p>
                  </div>
                  <div className="step">
                    <strong>3. Choose Layout Mode</strong>
                    <p>Optionally check "Split into Teams" and set the number of groups to distribute players into balanced team lineups.</p>
                  </div>
                  <div className="step">
                    <strong>4. Shuffle and Copy</strong>
                    <p>Click "Shuffle Players" to run the randomizer. Once complete, copy the output list to your clipboard or reshuffle instantly.</p>
                  </div>
                </div>
              )}
              {activeModal === 'privacy' && (
                <div className="legal-text">
                  <p><strong>Local Processing:</strong> Shufflemania processes all shuffling operations locally on your device. We do not transmit, collect, or store any personal data or player names on remote servers.</p>
                  <p><strong>Third-Party Scripts:</strong> We do not load tracking pixels, advertising tags, or cookie-based analytics engines. Your input data stays 100% private to your browser session.</p>
                  <p><strong>Data Storage:</strong> Player names are temporarily loaded into local React memory state and are cleared when you refresh or reset the shuffler.</p>
                </div>
              )}
              {activeModal === 'terms' && (
                <div className="legal-text">
                  <p><strong>Acceptance of Terms:</strong> By using Shufflemania, you agree to these simple terms of service.</p>
                  <p><strong>Permitted Use:</strong> The tool is free for personal, corporate, academic, and event sorting purposes. Commercial redistribution of the code without attribution is prohibited.</p>
                  <p><strong>No Warranties:</strong> The randomizing tool is provided "as is" without liability for sorting outcomes, selection biases, or decision outcomes resulting from its usage.</p>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-primary btn-full" onClick={() => setActiveModal(null)}>
                Got It
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
