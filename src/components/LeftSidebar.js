import React from 'react';
import { css } from '@emotion/react';
import { leftSidebarStyle, searchBarStyle, menuItemsStyle, menuItemStyle, gameListStyle } from '../styles';

function LeftSidebar() {
  return (
    <div id="left-sidebar" css={leftSidebarStyle}>
      <div id="search-bar" css={searchBarStyle}>Search...</div>
      <div id="menu-items" css={menuItemsStyle}>
        <div css={menuItemStyle}>Strona główna</div>
        <div css={menuItemStyle}>Klipy</div>
        <div css={menuItemStyle}>Komendy <span>Coming soon</span></div>
        <div css={menuItemStyle}>Połączone konto</div>
        <div css={menuItemStyle}>Strona główna</div>
      </div>
      <div id="game-list" css={gameListStyle}>
        <div>Twoje gry:</div>
        {/* List of games will be dynamically added here */}
      </div>
    </div>
  );
}

export default LeftSidebar;
