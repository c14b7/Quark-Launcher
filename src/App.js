import React from 'react';
import LeftSidebar from './components/LeftSidebar';
import MainContent from './components/MainContent';
import RightSidebar from './components/RightSidebar';
import BottomLeftButtons from './components/BottomLeftButtons';

function App() {
  return (
    <div id="app-root">
      <LeftSidebar />
      <MainContent />
      <RightSidebar />
      <BottomLeftButtons />
    </div>
  );
}

export default App;
