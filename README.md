# Dandadan: Spirit Ball Showdown

An original browser-based fan game inspired by the physics-driven weapon-ball battle format popularized by Earclacks. Four characters from *Dandadan* are reimagined as colorful arena fighters with spinning attack arcs and signature powers.

> Unofficial fan-made project. Dandadan and its characters belong to their respective rights holders. This project is not affiliated with or endorsed by them. It uses original CSS/canvas character representations and does not include official artwork, logos, or audio.

## Play
Open `index.html` in a modern browser. No build tools or dependencies are required. For local development, run `python -m http.server 8000` and visit http://localhost:8000.

## Features
- Momo Ayase, Okarun, Aira Shiratori, and Jiji
- 1v1, 2v2, and four-way free-for-all
- Physics-based bouncing movement, collisions, spinning attack arcs, health, damage, and knockouts
- Unique special abilities for each fighter
- Adjustable health, battle speed, and arena theme
- Pause, restart, rematch, and responsive interface

## Code map
- `index.html` — page structure and controls
- `style.css` — visual theme and responsive layout
- `game.js` — fighter data, match state, physics, attacks, special abilities, rendering, and match results

## Where game data is stored
The `F` array in `game.js` stores each fighter's name, color, weapon, power, damage, speed, and special-move type. The `make()` function copies that definition into a fresh match object containing position, velocity, health, cooldowns, team, and damage totals. `update()` advances the physics, `hit()` applies damage and knockback, `special()` handles character powers, and `draw()` renders the arena on the HTML canvas.

## License
The project code is provided under the MIT License. Dandadan names and character concepts remain the property of their respective owners.
