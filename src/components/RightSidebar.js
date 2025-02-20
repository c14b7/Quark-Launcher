import React from 'react';
import { css } from '@emotion/react';
import { rightSidebarStyle, userProfileStyle, additionalContentStyle, friendsListStyle } from '../styles';

function RightSidebar() {
  return (
    <div id="right-sidebar" css={rightSidebarStyle}>
      <div id="user-profile" css={userProfileStyle}>
        <div>Username</div>
        <div>User ID</div>
      </div>
      <div id="additional-content" css={additionalContentStyle}></div>
      <div id="friends-list" css={friendsListStyle}>
        <div>Friends:</div>
        {/* List of friends will be dynamically added here */}
      </div>
    </div>
  );
}

export default RightSidebar;
