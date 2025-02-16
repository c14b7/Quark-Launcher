import React from 'react';

function RightSidebar() {
  return (
    <div id="right-sidebar">
      <div id="user-profile">
        <div>Username</div>
        <div>User ID</div>
      </div>
      <div id="additional-content"></div>
      <div id="friends-list">
        <div>Friends:</div>
        {/* List of friends will be dynamically added here */}
      </div>
    </div>
  );
}

export default RightSidebar;
