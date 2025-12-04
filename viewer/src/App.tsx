/**
 * Main Application Component
 * Provides the layout for the session viewer
 */

import { Timeline } from '@/components/Timeline/Timeline';
import { ActionList } from '@/components/ActionList/ActionList';
import { SnapshotViewer } from '@/components/SnapshotViewer/SnapshotViewer';
import { TabPanel } from '@/components/TabPanel/TabPanel';
import './App.css';

function App() {
  return (
    <div className="app">
      <header className="app-header">
        <h1>Session Recorder Viewer</h1>
        <div className="app-header-actions">
          <button type="button" className="btn-primary">Import Session</button>
          <button type="button" className="btn-secondary">Export Session</button>
        </div>
      </header>

      <div className="app-layout">
        {/* Top: Timeline */}
        <div className="layout-timeline">
          <Timeline />
        </div>

        {/* Main content area */}
        <div className="layout-main">
          {/* Left: Action List */}
          <aside className="layout-sidebar">
            <ActionList />
          </aside>

          {/* Center: Snapshot Viewer */}
          <main className="layout-content">
            <SnapshotViewer />
          </main>
        </div>

        {/* Bottom: Tab Panel */}
        <div className="layout-tabs">
          <TabPanel />
        </div>
      </div>
    </div>
  );
}

export default App;
