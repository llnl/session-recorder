/**
 * Tab Panel Component
 * Container for Information, Console, Network, and Metadata tabs
 */

import { useSessionStore } from '@/stores/sessionStore';
import './TabPanel.css';

export const TabPanel = () => {
  const activeTab = useSessionStore((state) => state.activeTab);
  const setActiveTab = useSessionStore((state) => state.setActiveTab);

  return (
    <div className="tab-panel">
      <div className="tab-panel-header">
        <button
          className={`tab-button ${activeTab === 'information' ? 'active' : ''}`}
          onClick={() => setActiveTab('information')}
        >
          Information
        </button>
        <button
          className={`tab-button ${activeTab === 'console' ? 'active' : ''}`}
          onClick={() => setActiveTab('console')}
        >
          Console
        </button>
        <button
          className={`tab-button ${activeTab === 'network' ? 'active' : ''}`}
          onClick={() => setActiveTab('network')}
        >
          Network
        </button>
        <button
          className={`tab-button ${activeTab === 'metadata' ? 'active' : ''}`}
          onClick={() => setActiveTab('metadata')}
        >
          Metadata
        </button>
      </div>
      <div className="tab-panel-content">
        {/* TODO: Implement tab content components */}
        {/* TODO: InformationTab - Phase 7.2 */}
        {/* TODO: ConsoleTab - Phase 7.3 */}
        {/* TODO: NetworkTab - Phase 7.4 */}
        {/* TODO: MetadataTab - Phase 8.3 */}
        <p>Tab Panel - Active Tab: {activeTab}</p>
        <p>Tab content to be implemented in Phase 7</p>
      </div>
    </div>
  );
};
