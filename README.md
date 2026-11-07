# ECHO

A 2.5D one-on-one fighting game for the browser. You climb a drowned tower in 2089 Mumbai, and every fight you play gets recorded. The boss on floor 99 is your Echo: a neural network trained on your own habits.

## Run it

```bash
npm install
npm run dev
```

Open http://localhost:5173. Keyboard works best; a PC or laptop is recommended.

## Controls

| Key | Action |
| --- | --- |
| W A S D | Jump, move, crouch. Tap a direction twice to dash |
| U / I | Front punch / back punch |
| J / K | Front kick / back kick (sweep) |
| U + J | Throw |
| O | Special |
| P | Super power (1 meter bar) |
| ; | Overclock super (3 bars) |
| L or Space | Block (hold S too for low block) |
| H | Hitbox view with live frame data |
| M | Mute |

Finish round 1 or 2 with your special and you get your fighter's Last Breath. After a match-winning K.O. the screen says DELETE THEM: enter down, down, special for your Deletion.

## The Spire

Arcade Tower takes you up five floors: 12, 37, 61, 88 and 99. Each CPU reacts faster and blocks more than the last. Floor 61 sits in the flooded temple and holds a story twist. Your Echo waits on floor 99, and beating it leads to the Archive and a choice between two endings.

## Fighters

| Fighter | Weapon | Super power | Overclock | Last Breath | Deletion |
| --- | --- | --- | --- | --- | --- |
| Kaal | Urumi whip sword | Rewind: jump back one second and recover the health lost in it | Thousand Coils | Monsoon Cut | Kaal's Loop |
| Vanta | Twin kukris | Shadow Phase: reappear behind the opponent | Night Shift | Cross Out | Faceless |
| Rook | Hydraulic hammer | Iron Will: three seconds of armor that turns damage into meter | Demolition Order | Pile Driver | Foundation |

Every fighter also has two strings, a special and a Deletion. The fighter select screen lists the inputs.

## How the Echo works

1. During your fights, the recorder samples the game ten times a second. Each sample holds 43 numbers (distance, health, meter, both fighters' states, the opponent's attack phase) plus the choice you made, one of 20 actions.
2. The samples go into IndexedDB in your browser. Nothing leaves your machine.
3. After three fights, a Web Worker trains a small network with TensorFlow.js (43 inputs, layers of 128 and 64, 20 outputs) to predict your choice from the situation.
4. On floor 99 the Echo plays your fighter. It samples an action from the network every 6 ticks, with a reaction delay and some temperature so it stays unpredictable.

The Echo Lab screen shows the training curve, how often the model matches your choices, and a Habit Report built from your data.

## Code layout

```
src/core/     deterministic fight engine, frame data, CPU AI, Echo features (no browser code)
src/echo/     recorder, IndexedDB store, training worker, Echo controller, habit stats
src/render/   canvas art, fight rendering, menus
src/audio.ts  sound effects synthesized with Web Audio
```

The engine runs at a fixed 60 ticks per second and depends on no rendering code, so tests run it headless. All move timing and damage lives in `src/core/data.ts`.

## Tests

```bash
npm test
```

The tests check that two runs with the same inputs end in the same state, that every string combos, that powers and Overclocks fire, and that each of the 20 Echo actions comes back as the same action through the recorder.
