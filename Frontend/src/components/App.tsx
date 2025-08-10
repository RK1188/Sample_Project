import React, { useState, useCallback } from 'react';
import { AppProvider, useApp } from '../context/AppContext';
import SlideNavigation from './SlideNavigation';
import SlideEditor from './SlideEditor';
import FileUpload from './FileUpload';
import TextEditor from './TextEditor';
import { TextElement } from '../types';
import { SimpleExportService } from '../services/simpleExportService';
import { PptxExportService } from '../services/pptxExportService';
// import { ExportService } from '../services/exportService'; // Temporarily disabled due to PptxGenJS issues

const AppContent: React.FC = () => {
  const { state, dispatch } = useApp();
  const [textEditorState, setTextEditorState] = useState<{
    visible: boolean;
    element?: TextElement;
    slideId?: string;
    position: { x: number; y: number };
  }>({
    visible: false,
    position: { x: 0, y: 0 }
  });

  const { presentation, uiState } = state;
  const hasSlides = presentation.slides.length > 0;

  // Handle theme toggle
  const handleThemeToggle = useCallback(() => {
    dispatch({ type: 'TOGGLE_THEME' });
  }, [dispatch]);

  // Handle text element double-click (start editing)
  const handleTextEdit = useCallback((element: TextElement, slideId: string, position: { x: number; y: number }) => {
    setTextEditorState({
      visible: true,
      element,
      slideId,
      position
    });
  }, []);

  // Handle text editor close
  const handleTextEditorClose = useCallback(() => {
    setTextEditorState({
      visible: false,
      position: { x: 0, y: 0 }
    });
  }, []);

  // Handle new presentation
  const handleNewPresentation = useCallback(() => {
    dispatch({ type: 'RESET_APP' });
    dispatch({ type: 'ADD_SLIDE' });
  }, [dispatch]);

  // Handle save presentation
  const handleSavePresentation = useCallback(async () => {
    // This would typically save to a backend or trigger a download
    console.log('Saving presentation:', presentation);
    // For now, just show a success message
    dispatch({
      type: 'SET_UI_STATE',
      payload: {
        notifications: [
          ...uiState.notifications,
          {
            id: Date.now().toString(),
            type: 'success',
            title: 'Presentation Saved',
            message: 'Your presentation has been saved successfully.',
            timestamp: new Date()
          }
        ]
      }
    });
  }, [presentation, dispatch, uiState.notifications]);

  // Handle export presentation
  const handleExportPresentation = useCallback(async () => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      // Export as HTML for now (PPTX export requires server-side processing)
      await SimpleExportService.exportToHTML(presentation);
      
      dispatch({
        type: 'SET_UI_STATE',
        payload: {
          notifications: [
            ...uiState.notifications,
            {
              id: Date.now().toString(),
              type: 'success',
              title: 'Export Successful',
              message: 'Your presentation has been exported to HTML format.',
              timestamp: new Date()
            }
          ]
        }
      });
    } catch (error) {
      dispatch({
        type: 'SET_ERROR',
        payload: 'Failed to export presentation. Please try again.'
      });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [presentation, dispatch, uiState.notifications]);
  
  // Handle export as JSON
  const handleExportJSON = useCallback(async () => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      await SimpleExportService.exportToJSON(presentation);
      
      dispatch({
        type: 'SET_UI_STATE',
        payload: {
          notifications: [
            ...uiState.notifications,
            {
              id: Date.now().toString(),
              type: 'success',
              title: 'Export Successful',
              message: 'Your presentation has been exported to JSON format.',
              timestamp: new Date()
            }
          ]
        }
      });
    } catch (error) {
      dispatch({
        type: 'SET_ERROR',
        payload: 'Failed to export presentation. Please try again.'
      });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [presentation, dispatch, uiState.notifications]);

  const handleExportPPTX = useCallback(async () => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      await PptxExportService.exportToPPTX(presentation);
      
      dispatch({
        type: 'SET_UI_STATE',
        payload: {
          notifications: [
            ...uiState.notifications,
            {
              id: Date.now().toString(),
              type: 'success',
              title: 'Export Successful',
              message: 'Your presentation has been exported to PowerPoint format.',
              timestamp: new Date()
            }
          ]
        }
      });
    } catch (error) {
      dispatch({
        type: 'SET_ERROR',
        payload: 'Failed to export presentation to PPTX. Please try again.'
      });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [presentation, dispatch, uiState.notifications]);

  if (uiState.loading) {
    return (
      <div className="app-loading">
        <div className="loading-spinner large" />
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className={`app ${uiState.theme}`} data-theme={uiState.theme}>
      {/* Header */}
      <header className="app-header">
        <div className="header-left">
          <h1 className="app-title">Presentation Studio</h1>
          {hasSlides && (
            <span className="presentation-title">
              {presentation.title}
            </span>
          )}
        </div>
        
        <div className="header-actions">
          {hasSlides && (
            <>
              <button 
                className="header-button"
                onClick={handleNewPresentation}
                title="New Presentation"
              >
                New
              </button>
              <button 
                className="header-button"
                onClick={handleSavePresentation}
                title="Save Presentation"
              >
                Save
              </button>
              <button 
                className="header-button export-button"
                onClick={handleExportPresentation}
                title="Export as HTML"
              >
                Export HTML
              </button>
              <button 
                className="header-button"
                onClick={handleExportJSON}
                title="Export as JSON"
              >
                Export JSON
              </button>
              <button 
                className="header-button primary"
                onClick={handleExportPPTX}
                title="Export as PowerPoint"
              >
                Export PPTX
              </button>
            </>
          )}
          
          <button 
            className="header-button theme-toggle"
            onClick={handleThemeToggle}
            title={`Switch to ${uiState.theme === 'light' ? 'dark' : 'light'} theme`}
          >
            {uiState.theme === 'light' ? '🌙' : '☀️'}
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="app-main">
        {hasSlides ? (
          <div className="editor-layout">
            <SlideNavigation className="sidebar" />
            <SlideEditor className="main-editor" />
          </div>
        ) : (
          <div className="welcome-screen">
            <div className="welcome-content">
              <h2>Welcome to Presentation Studio</h2>
              <p>Create beautiful presentations with our intuitive editor</p>
              
              <div className="welcome-actions">
                <button 
                  className="action-button primary"
                  onClick={handleNewPresentation}
                >
                  Create New Presentation
                </button>
                
                <div className="or-divider">or</div>
                
                <FileUpload />
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Text Editor Modal */}
      {textEditorState.visible && textEditorState.element && textEditorState.slideId && (
        <TextEditor
          element={textEditorState.element}
          slideId={textEditorState.slideId}
          position={textEditorState.position}
          onClose={handleTextEditorClose}
        />
      )}

      {/* Notifications */}
      {uiState.notifications.length > 0 && (
        <div className="notifications">
          {uiState.notifications.map(notification => (
            <div
              key={notification.id}
              className={`notification notification-${notification.type}`}
            >
              <div className="notification-content">
                <strong>{notification.title}</strong>
                <p>{notification.message}</p>
              </div>
              <button
                className="notification-close"
                onClick={() => {
                  dispatch({
                    type: 'SET_UI_STATE',
                    payload: {
                      notifications: uiState.notifications.filter(n => n.id !== notification.id)
                    }
                  });
                }}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Error Display */}
      {uiState.error && (
        <div className="error-banner">
          <div className="error-content">
            <span className="error-icon">⚠️</span>
            <span className="error-message">{uiState.error}</span>
            <button
              className="error-dismiss"
              onClick={() => dispatch({ type: 'SET_ERROR', payload: null })}
            >
              Dismiss
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const App: React.FC = () => {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
};

export default App;