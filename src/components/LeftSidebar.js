import React from 'react';

function LeftSidebar() {
  return (
    <div id="left-sidebar">
      <div id="search-bar">Search...</div>
      <div id="menu-items">
        <div>Strona główna</div>
        <div>Klipy</div>
        <div>Komendy <span>Coming soon</span></div>
        <div>Połączone konto</div>
        <div>Strona główna</div>
      </div>
      <div id="game-list">
        <div>Twoje gry:</div>
        {/* List of games will be dynamically added here */}
      </div>
    </div>
  );
}

export default LeftSidebar;
