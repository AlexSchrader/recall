import { Link, useNavigate } from 'react-router-dom';

const GAMES = [
  { to: '/games/speed-round', emoji: '🏃', title: 'Speed Round',     desc: '10 questions, 15 seconds each — beat the clock.' },
  { to: '/games/time-attack', emoji: '⏱️', title: 'Time Attack',     desc: 'As many as you can in 60 seconds.' },
  { to: '/games/streak',      emoji: '🔥', title: 'Streak Challenge', desc: 'Answer until you miss one — how long can you go?' },
  { to: '/games/survival',    emoji: '❤️', title: 'Survival',         desc: '3 lives, and the clock tightens each level. How far can you go?' },
  { to: '/games/boss',        emoji: '👾', title: 'Boss Battle',      desc: 'Fight a gauntlet on one of your weak topics.' },
];

const RANDOM_POOL = ['/games/speed-round', '/games/time-attack', '/games/streak', '/games/survival'];

export default function GamesPage() {
  const navigate = useNavigate();

  return (
    <>
      <div className="page-header"><h1>Games</h1></div>
      <p style={{ color: 'var(--muted)', marginBottom: '1.25rem' }}>
        Quick practice drawn from the questions in your completed quizzes — no generation needed.
      </p>

      <div className="game-rows">
        {GAMES.map(g => (
          <Link key={g.to} to={g.to} className="game-row">
            <span className="game-row-emoji">{g.emoji}</span>
            <span className="game-row-text">
              <span className="game-row-title">{g.title}</span>
              <span className="game-row-desc">{g.desc}</span>
            </span>
            <span className="game-row-go">›</span>
          </Link>
        ))}

        <button
          type="button"
          className="game-row game-row--surprise"
          onClick={() => navigate(RANDOM_POOL[Math.floor(Math.random() * RANDOM_POOL.length)])}
        >
          <span className="game-row-emoji">🎲</span>
          <span className="game-row-text">
            <span className="game-row-title">Surprise me</span>
            <span className="game-row-desc">Throw me into a random game.</span>
          </span>
          <span className="game-row-go">›</span>
        </button>
      </div>

      <p style={{ color: 'var(--muted)', fontSize: '.85rem', marginTop: '1.25rem' }}>
        🃏 <strong>Match It</strong> lives on each flashcard deck — open a deck to pair terms with definitions.
      </p>
    </>
  );
}
