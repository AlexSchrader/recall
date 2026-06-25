import { Link, useNavigate } from 'react-router-dom';

export default function GamesPage() {
  const navigate = useNavigate();

  return (
    <>
      <div className="page-header"><h1>Games</h1></div>
      <p style={{ color: 'var(--muted)', marginBottom: '1.25rem' }}>
        Quick practice drawn from the questions in your completed quizzes — no generation needed.
      </p>

      <div className="games-grid">
        <Link to="/games/speed-round" className="game-card">
          <span className="game-card-emoji">🏃</span>
          <span className="game-card-title">Speed Round</span>
          <span className="game-card-desc">10 questions, race a 15-second timer on each.</span>
        </Link>

        <Link to="/games/streak" className="game-card">
          <span className="game-card-emoji">🔥</span>
          <span className="game-card-title">Streak Challenge</span>
          <span className="game-card-desc">Answer until you miss one — how long can you go?</span>
        </Link>

        <button
          type="button"
          className="game-card"
          onClick={() => navigate(Math.random() < 0.5 ? '/games/speed-round' : '/games/streak')}
        >
          <span className="game-card-emoji">🎲</span>
          <span className="game-card-title">Surprise me</span>
          <span className="game-card-desc">Throw me into a random game.</span>
        </button>
      </div>

      <p style={{ color: 'var(--muted)', fontSize: '.85rem', marginTop: '1.25rem' }}>
        🃏 <strong>Match It</strong> lives on each flashcard deck — open a deck to pair terms with definitions.
      </p>
    </>
  );
}
