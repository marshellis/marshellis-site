# Sunshine Heist: Florida

An open-world crime sandbox set in a sun-soaked Florida — Miami-style downtown, Art Deco beach, Tampa, Orlando, the Keys, the Everglades.
Plain browser JavaScript on Three.js r128 (loaded from a CDN), no build step.

**Content note:** cartoon-style violence, crime and police chases. Intended for teens and up.

## Run locally

```
npx serve -p 5600 .
```

then open http://localhost:5600 (the game also works from any static host, including a sub-folder).

## Controls

| Key | Action |
| --- | --- |
| W A S D / Shift / Space | move / sprint / jump |
| Mouse, LMB, RMB | aim at the cursor, shoot, aim (screen edge turns the camera; middle-drag orbits) |
| F | enter / exit / carjack vehicles |
| E | interact — hold to rob registers, crack ATMs, breach armored trucks |
| G | grab / release a hostage |
| R, 1–5 / wheel / Q | reload, switch weapons (Q = next radio station in a car) |
| X | ski mask (fewer stars, harder to identify) |
| C | dive roll |
| T | talk · M map · J journal · K stats & achievements |
| B | toggle cinematic effects · F1 hide HUD · Tab show info · Esc pause |

## What is in the game

- 6,500 citizens with jobs, schedules, names, moods and 911-calling witnesses; procedural skeleton animation
- Story missions with cutscenes, 15 weapons, cars / bikes / boats with traffic AI, police, SWAT and helicopters
- Robberies with silent-alarm response times, dye packs, masks, hostages and bank vaults; pawn shops, ATMs, armored trucks
- Street races, Pay 'n' Spray garages, roadblocks and spike strips, car radio, achievements, weather and day/night

## Code map (js/)

core (math, input, audio, particles) · world (terrain, sea, sky, roads, buildings) · humans · vehicles + carmodels · gunmodels · npcs · player · police · shops · props · weather · weapons · story + missions · extras (achievements, radio, races, ATMs, heists, polish) · ui · post (bloom / grading) · main.
