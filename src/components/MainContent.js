import React from 'react';
import { css } from '@emotion/react';
import { mainContentStyle, largeSectionStyle, smallSectionRowStyle, smallSectionStyle } from '../styles';

function MainContent() {
  return (
    <div id="main-content" css={mainContentStyle}>
      <div className="large-section" css={largeSectionStyle}></div>
      <div className="large-section" css={largeSectionStyle}></div>
      <div className="large-section" css={largeSectionStyle}></div>
      <div className="small-section-row" css={smallSectionRowStyle}>
        <div className="small-section" css={smallSectionStyle}></div>
        <div className="small-section" css={smallSectionStyle}></div>
        <div className="small-section" css={smallSectionStyle}></div>
        <div className="small-section" css={smallSectionStyle}></div>
        <div className="small-section" css={smallSectionStyle}></div>
        <div className="small-section" css={smallSectionStyle}></div>
      </div>
      <div className="small-section-row" css={smallSectionRowStyle}>
        <div className="small-section" css={smallSectionStyle}></div>
        <div className="small-section" css={smallSectionStyle}></div>
        <div className="small-section" css={smallSectionStyle}></div>
        <div className="small-section" css={smallSectionStyle}></div>
        <div className="small-section" css={smallSectionStyle}></div>
        <div className="small-section" css={smallSectionStyle}></div>
      </div>
    </div>
  );
}

export default MainContent;
