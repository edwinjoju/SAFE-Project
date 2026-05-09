import React from 'react';
import './Sidebar.css';

function Sidebar({ appMode, handleNav, sidebarCollapsed, setSidebarCollapsed }) {
  return (
    <aside className={`sidebar ${sidebarCollapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-logo">
        <h1>{sidebarCollapsed ? 'S' : 'S.A.F.E.'}</h1>
        <p>Smart Atmospheric Forecast Engine</p>
      </div>
      
      <nav className="sidebar-nav">
        <button 
          className={`sidebar-nav-item ${appMode === 'home' ? 'active' : ''}`}
          onClick={() => handleNav('home')}
          title="Today"
        >
          <span className="sidebar-icon">🏠</span> <span className="nav-text">Today</span>
        </button>
        
        <button 
          className={`sidebar-nav-item ${appMode === 'plan' ? 'active' : ''}`}
          onClick={() => handleNav('plan')}
          title="Commute Advisor"
        >
          <span className="sidebar-icon">🚗</span> <span className="nav-text">Commute Advisor</span>
        </button>

        <button 
          className={`sidebar-nav-item ${appMode === 'skincare' ? 'active' : ''}`}
          onClick={() => handleNav('skincare')}
          title="Skincare"
        >
          <span className="sidebar-icon">🧑‍🦰</span> <span className="nav-text">Skincare</span>
        </button>

        <button 
          className={`sidebar-nav-item ${appMode === 'alerts' ? 'active' : ''}`}
          onClick={() => handleNav('alerts')}
          title="Environmental Alerts"
        >
          <span className="sidebar-icon">🛰️</span> <span className="nav-text">Env. Alerts</span>
        </button>
      </nav>

      <button 
        className="sidebar-toggle-btn" 
        onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
        title={sidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
      >
        {sidebarCollapsed ? '»' : '«'}
      </button>
    </aside>
  );
}

export default Sidebar;
