# Hexaequo

A modern web implementation of the strategic board game Hexaequo, featuring a 3D interface with free rotation and zoom capabilities.

## Features

- **3D Game Board**: Fully interactive hexagonal grid with 3D pieces
- **Intuitive Controls**: Mouse, touch, and keyboard controls for all game actions
- **Responsive Design**: Works on desktop and mobile devices
- **Save/Load**: Save and load games locally or export/import as files
- **PWA Support**: Install as a standalone app on supported devices
- **Offline Play**: Play without an internet connection

## Game Rules

### Objective
To win the game, a player must accomplish one of the following:
1. Capture all of the opponent's discs.
2. Capture all of the opponent's rings.
3. Remove all of the opponent's pieces from the board.

If a player cannot make a move during their turn, or if a position is repeated three times, the game ends in a draw ("Ex Aequo").

### Game Materials
- **Tiles**: 9 black and 9 white hexagonal tiles.
- **Discs**: 6 black and 6 white discs.
- **Rings**: 3 black and 3 white rings.

### Setup
1. The game starts with two black and two white tiles in the initial configuration.
2. One black disc is placed on a black tile and one white disc on a white tile.
3. The player with black pieces goes first.

### Gameplay
On your turn, you must perform one of these actions:

#### 1. Place a Tile
- The tile must be placed adjacent to at least two existing tiles.

#### 2. Place a Piece
- A piece (disc or ring) must be placed on an empty tile of your color.
- To place a ring, you must return one captured disc to your opponent.

#### 3. Move a Piece
- **Disc Movement**:
  - A disc can move to an adjacent empty tile.
  - Or it can make one or more consecutive jumps over any piece (friendly or opponent's).
  - When jumping over an opponent's piece, the piece is captured.
- **Ring Movement**:
  - A ring moves exactly two tiles away in any direction.
  - It can capture an opponent's piece by landing on it.
  - It cannot land on a friendly piece.

## Controls

### Mouse Controls
- **Left Click**: Select a hex or perform an action
- **Mouse Wheel**: Zoom in/out

### Touch Controls
- **Tap**: Select a hex or perform an action
- **Pinch**: Zoom in/out

### Keyboard Controls
- **Arrow Keys**: Rotate camera
- **+/-**: Zoom in/out
- **R**: Reset camera view
- **1-4**: Select action (1: Place Tile, 2: Place Disc, 3: Place Ring, 4: Move Piece)
- **Esc**: Cancel current action or close modal
- **Ctrl+N**: New game
- **Ctrl+S**: Save game
- **Ctrl+O**: Load game

## Technical Details

### Technologies Used
- **HTML5/CSS3**: For structure and styling
- **JavaScript (ES6+)**: For game logic and interactions
- **Three.js**: For 3D rendering
- **LocalStorage API**: For saving game state

### Architecture
The application follows a modular architecture with these main components:

- **HexGrid**: Implements the hexagonal grid system using axial coordinates
- **GameState**: Manages the game state and rules
- **Renderer**: Handles 3D rendering using Three.js
- **UserInterface**: Manages UI interactions
- **InputHandler**: Processes user input from various sources

## Development

### Prerequisites
- Modern web browser with WebGL support

### Local Development
1. Clone the repository
2. Open `index.html` in your browser

### Adding Custom 3D Models
The game supports custom 3D models in GLB format. Place your models in the `assets/models/` directory with the following naming convention:
- `tile_black.glb` / `tile_white.glb`
- `disc_black.glb` / `disc_white.glb`
- `ring_black.glb` / `ring_white.glb`

## Future Enhancements
- Online multiplayer
- AI opponent using machine learning
- Advanced animations and visual effects
- Customizable themes and piece designs

## License
This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments
- Game concept based on the original Hexaequo board game
- Hexagonal grid implementation inspired by [Red Blob Games](https://www.redblobgames.com/grids/hexagons/) 