import React, { useState } from 'react';

function Launcher() {
  const [games, setGames] = useState([]);
  const [newGame, setNewGame] = useState('');

  const handleAddGame = () => {
    if (newGame.trim()) {
      setGames([...games, newGame.trim()]);
      setNewGame('');
    }
  };

  const handleRemoveGame = (gameToRemove) => {
    setGames(games.filter(game => game !== gameToRemove));
  };

  return (
    <div className="launcher">
      <h2>Game Launcher</h2>
      <input
        type="text"
        value={newGame}
        onChange={(e) => setNewGame(e.target.value)}
        placeholder="Enter game name"
      />
      <button onClick={handleAddGame}>Add Game</button>
      <ul>
        {games.map((game, index) => (
          <li key={index}>
            {game}
            <button onClick={() => handleRemoveGame(game)}>Remove</button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default Launcher;
