import React from 'react';
import { bottomLeftButtonsStyle, bottomLeftButtonStyle } from '../styles';

function BottomLeftButtons() {
  return (
    <div id="bottom-left-buttons" css={bottomLeftButtonsStyle}>
      <button css={bottomLeftButtonStyle}>PRO</button>
      <button css={bottomLeftButtonStyle}>User Icon</button>
    </div>
  );
}

export default BottomLeftButtons;
