# Isometric Architecture Diagram Renderer

A web-based architecture diagram renderer that parses a custom DSL and renders interactive, isometric diagrams using Elm and D3.js.

## 🚀 Features

- **Custom DSL**: Define architecture diagrams using a simple, readable syntax
- **Isometric Rendering**: Beautiful 3D-style diagrams with depth and perspective
- **Interactive**: Hover effects, tooltips, zoom and pan
- **Live Editing**: Real-time preview as you edit the DSL
- **Export**: Export diagrams as SVG files
- **Nested Containers**: Support for hierarchical component organization

## 🧩 DSL Syntax

### Layout Configuration
```dsl
layout direction=LR ranksep=50 nodesep=30
```

### Style Definitions
```dsl
style user icon=👤 color=#4CAF50 image="user.png"
style api icon=🔧 color=#2196F3
style db icon=🗄️ color=#FF9800
```

### Components
```dsl
component user {
  label "Application User"
  type actor
}
```

### Containers (Nested)
```dsl
container k8s_cluster {
  label "Kubernetes Cluster"
  
  container pod {
    label "API Pod"
    
    component python_api {
      label "Python API"
      type service
    }
  }
}
```

### Relations
```dsl
relation user -> python_api : "HTTP requests"
relation python_api -> postgres : "SQL queries"
```

### Annotations
```dsl
annotation user {
  tooltip "External users accessing the system"
  link "https://docs.example.com/users"
}
```

## 🛠️ Tech Stack

- **Frontend**: Elm + D3.js
- **Rendering**: SVG with isometric transforms
- **Parser**: Elm Parser combinators
- **Styling**: CSS3 with modern design

## 🚀 Getting Started

### Prerequisites
- Node.js (for Elm compilation)
- Modern web browser

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd isometric_diagram_creator
```

2. Install Elm (if not already installed):
```bash
npm install -g elm
```

3. Compile the Elm application (optional, currently using JS version):
```bash
elm make src/Main.elm --output=elm.js
```

4. Open `index.html` in your browser or serve it with a local server:
```bash
# Using Python
python -m http.server 8000

# Using Node.js
npx serve .

# Or simply open index.html in your browser
```

### Usage

1. **Edit the DSL**: Modify the DSL in the left panel
2. **Render**: Click "Render Diagram" to parse and display the diagram
3. **Interact**: Hover over components for tooltips, zoom and pan the diagram
4. **Export**: Click "Export SVG" to download the diagram

## 📁 Project Structure

```
isometric_diagram_creator/
├── src/
│   ├── Main.elm           # Main Elm application
│   ├── Types.elm          # Type definitions
│   ├── DSLParser.elm      # DSL parsing logic
│   └── IsometricRenderer.elm # Rendering calculations
├── index.html             # Main HTML file
├── main.js               # D3.js rendering and interaction
├── elm.json              # Elm project configuration
└── README.md             # This file
```

## 🎨 Isometric Rendering

The renderer uses D3.js to create isometric projections:

- **Depth Simulation**: Uses 30° angle transforms for 3D effect
- **Layered Rendering**: Containers → Components → Relations
- **Interactive Elements**: Hover states, tooltips, zoom/pan
- **Responsive Design**: Automatic scaling and fitting

## 🧪 Example DSL

```dsl
layout direction=LR ranksep=50 nodesep=30

style user icon=👤 color=#4CAF50
style api icon=🔧 color=#2196F3  
style db icon=🗄️ color=#FF9800

component user {
  label "Application User"
  type actor
}

container k8s_cluster {
  label "Kubernetes Cluster"
  
  container pod {
    label "API Pod"
    component python_api {
      label "Python API"
      type service
    }
  }
  
  container db_pod {
    label "Database Pod"
    component postgres {
      label "PostgreSQL"
      type database
    }
  }
}

relation user -> python_api : "HTTP requests"
relation python_api -> postgres : "SQL queries"

annotation user {
  tooltip "External users accessing the system"
}
```

## 🔧 Development

### Adding New Features

1. **Parser Extensions**: Modify `DSLParser.elm` to support new syntax
2. **Rendering Features**: Update `IsometricRenderer.elm` for layout changes
3. **Interactive Elements**: Enhance `main.js` for new D3.js interactions
4. **Styling**: Modify CSS in `index.html` for visual improvements

### Debugging

- Check browser console for parsing errors
- Use browser dev tools to inspect SVG elements
- Elm Debug.log for parser debugging (in development mode)

## 🚧 Future Enhancements

- [ ] **Live Editor**: Real-time DSL syntax highlighting
- [ ] **Drag & Drop**: Interactive layout editing
- [ ] **Export Options**: PNG, PDF export support
- [ ] **Themes**: Dark mode and custom color schemes
- [ ] **Component Library**: Predefined component templates
- [ ] **Animation**: Smooth transitions and loading states
- [ ] **Validation**: Better error messages and syntax validation

## 📝 License

MIT License - see LICENSE file for details

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Commit changes: `git commit -am 'Add feature'`
4. Push to branch: `git push origin feature-name`
5. Submit a pull request

## 📧 Support

For questions and support, please open an issue on GitHub.
