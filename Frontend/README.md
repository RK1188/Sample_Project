# Presentation Studio

A modern, web-based presentation application similar to Google Slides, built with React and TypeScript.

## Features

### Core Features
- ✅ **File Import**: Upload and import PowerPoint (.pptx) and OpenDocument (.odp) files
- ✅ **Interactive Editor**: Drag-and-drop slide editor with shape manipulation
- ✅ **Slide Management**: Create, delete, duplicate, and reorder slides
- ✅ **Drawing Tools**: Add text, shapes (rectangles, circles), and lines
- ✅ **Text Editing**: Rich text editing with font styling, colors, and alignment
- ✅ **Properties Panel**: Edit element properties like position, size, colors, and styling

### UI Features
- ✅ **Modern Design**: Clean, intuitive interface with beautiful animations
- ✅ **Dark/Light Theme**: Toggle between light and dark modes
- ✅ **Responsive Layout**: Works on desktop and tablet devices
- ✅ **Thumbnail Navigation**: Slide thumbnails with drag-and-drop reordering
- ✅ **Toolbar**: Comprehensive toolbar with all drawing and editing tools

### Technical Features
- ✅ **TypeScript**: Full type safety and better development experience
- ✅ **State Management**: Robust state management using React Context API
- ✅ **Canvas Rendering**: High-performance slide rendering with Konva.js
- ✅ **File Processing**: Support for importing presentation files
- ✅ **Error Handling**: Comprehensive error handling and user feedback

## Getting Started

### Prerequisites
- Node.js (version 16 or higher)
- npm or yarn package manager

### Installation

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm start
```

3. Open your browser and navigate to `http://localhost:3000`

### Building for Production

To create a production build:
```bash
npm run build
```

## Usage Guide

### Getting Started
1. **Create New Presentation**: Click "Create New Presentation" to start with a blank slide
2. **Import Files**: Drag and drop a .pptx or .odp file to import an existing presentation

### Working with Slides
- **Add Slide**: Click the "+" button in the slide navigation panel
- **Select Slide**: Click on any slide thumbnail to switch to it
- **Reorder Slides**: Drag and drop slides in the navigation panel
- **Delete Slide**: Right-click on a slide and select "Delete Slide"

### Using Drawing Tools
1. **Select Tool**: Choose from the toolbar (Select, Text, Rectangle, Circle, Line)
2. **Add Elements**: Click and drag on the canvas to create new elements
3. **Edit Elements**: Select elements to show transform handles for resizing and rotating
4. **Properties**: Use the properties panel on the right to modify element properties

### Text Editing
1. **Add Text**: Select the Text tool and click on the canvas
2. **Edit Text**: Double-click on any text element to open the text editor
3. **Format Text**: Use the text editor toolbar to change fonts, sizes, colors, and alignment

### Navigation and View
- **Zoom**: Use the zoom controls in the bottom-right corner
- **Pan**: Hold and drag with the pan tool (or while holding space)
- **Fit to Screen**: Click "Fit" to center and fit the slide to the view

### Keyboard Shortcuts
- `Delete` / `Backspace`: Delete selected elements
- `Escape`: Deselect all elements
- `Ctrl/Cmd + +`: Zoom in
- `Ctrl/Cmd + -`: Zoom out
- `Ctrl/Cmd + 0`: Zoom to fit
- `Arrow Keys`: Navigate between slides
- `Ctrl/Cmd + Enter`: Save text (in text editor)

## Project Structure

```
src/
├── components/          # React components
│   ├── App.tsx         # Main application component
│   ├── SlideCanvas.tsx # Canvas rendering component
│   ├── SlideEditor.tsx # Slide editor container
│   ├── SlideNavigation.tsx # Slide thumbnail navigation
│   ├── Toolbar.tsx     # Drawing tools toolbar
│   ├── PropertiesPanel.tsx # Element properties editor
│   ├── TextEditor.tsx  # Text editing modal
│   └── FileUpload.tsx  # File import component
├── context/            # State management
│   └── AppContext.tsx  # Application state context
├── services/           # Business logic
│   └── fileService.ts  # File import/export services
├── types/              # TypeScript type definitions
│   └── index.ts        # All type definitions
└── styles/             # CSS styles
    └── main.css        # Main stylesheet
```

## Architecture

### State Management
- Uses React Context API for global state management
- Centralized state with actions and reducers pattern
- Type-safe state updates with TypeScript

### Rendering Engine
- Canvas-based rendering using Konva.js and react-konva
- Efficient element manipulation and transformation
- Real-time updates with React integration

### File Processing
- JSZip for handling compressed presentation formats
- XML parsing for extracting slide content and structure
- Type-safe file import with comprehensive error handling

## Browser Support

- Chrome/Chromium 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Performance Considerations

- Canvas rendering for smooth animations
- Efficient re-rendering with React.memo and useMemo
- Lazy loading for large presentations
- Optimized bundle size with code splitting

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Acknowledgments

- Built with React 18 and TypeScript
- UI components styled with modern CSS
- Canvas rendering powered by Konva.js
- Drag and drop functionality using @hello-pangea/dnd
- File processing with JSZip