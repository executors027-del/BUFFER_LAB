# BUFFER LAB
### What happens between Play and Playback.

Buffer Lab is a browser-only interactive experiment about video streaming buffers. It demonstrates how incoming network data, video bitrate and buffer capacity combine to determine whether playback can continue.

## Project overview
This project makes the invisible buffering mechanism visible. Change download speed, bitrate, buffer capacity or network stability, then observe the buffer and playback state change in real time.

## Problem being explored
A video player consumes buffered video continuously while new data arrives over the network. If data arrives too slowly, the stored reserve shrinks. When it reaches zero, playback stalls until enough data has arrived to resume.

## Technology behind buffering
The simulation uses a simplified constant-bitrate model. Network throughput is converted into seconds of playable video by dividing download speed by the selected video bitrate. The buffer is capped at a configurable maximum.

## Mathematical model
Let:
- `D` = instantaneous download speed in Mbps
- `R` = video bitrate in Mbps
- `B` = current buffer in seconds of playable video
- `C` = maximum buffer capacity in seconds
- `dt` = simulation timestep in seconds

Incoming playable video duration is `(D / R) * dt`. The buffer accepts only the portion that fits within `C`. While playback is actively playing, it consumes `dt` seconds of buffered video:

`B_new = clamp(B + min((D / R) * dt, C - B) - consumption, 0, C)`

Consumption is zero while paused or buffering, and one video-second per simulation-second while playing. The engine resumes playback at a two-second refill threshold (or at capacity if capacity is smaller). A simplified model does not include chunk boundaries, adaptive bitrate logic, variable bitrate, protocol overhead, CDN behaviour, decoder delays or real player-specific rules.

## Architecture
- `index.html` — semantic page structure and controls
- `style.css` — responsive visual system, layout and motion preferences
- `simulation.js` — isolated simulation state machine and mathematical model
- `graph.js` — canvas chart and procedural player-scene rendering
- `script.js` — UI bindings, requestAnimationFrame loop, statistics and interactions
- `assets/` — reserved for local project assets

The application has no backend, database, authentication, API key or external AI service. Google Fonts are loaded from Google Fonts; system fallback fonts are provided.

## Technologies used
HTML5, CSS3, vanilla JavaScript (ES6+), Canvas 2D and `requestAnimationFrame`.

## Run locally
1. Download or clone this repository.
2. Open `index.html` in a modern browser, or serve the folder with any static file server.
3. For example, from the project directory run `python -m http.server 8000`.
4. Visit `http://localhost:8000`.

No build step is required.

## GitHub Pages deployment
1. Create a public GitHub repository and add all files in this folder, preserving the directory structure.
2. Push the commit to the `main` branch.
3. In GitHub, open **Settings → Pages**.
4. Under **Build and deployment**, choose **Deploy from a branch**.
5. Select `main` and `/ (root)`, then save.
6. Wait for GitHub Pages to publish the site. The generated HTTPS URL appears in the Pages settings.
7. Confirm that `index.html`, `style.css`, `simulation.js`, `graph.js` and `script.js` are all at the repository root.

All local references are relative, so the site can be hosted as a static GitHub Pages project.

## Limitations and assumptions
- Constant bitrate is assumed for each selected quality level.
- The model treats downloaded data as immediately playable and ignores segment/chunk boundaries and decoding delay.
- Network instability is represented by seeded, bounded throughput variation; it is an educational abstraction, not a measured network.
- Outages set incoming throughput to zero for eight simulation seconds.
- Video duration is fixed at 90 seconds.
- The simulator does not fetch or play an actual video stream.
- Google Fonts require an internet connection; fallback fonts work offline.

