[![make.fun](https://make.fun/badge/best-heist-game-20261122-0559.svg)](https://make.fun/bounty/best-heist-game-20261122-0559)
[![rank](https://make.fun/badge/best-heist-game-20261122-0559/exc-ana/heist-game-01/rank.svg)](https://make.fun/bounty/best-heist-game-20261122-0559)
[![reward](https://make.fun/badge/best-heist-game-20261122-0559/exc-ana/heist-game-01/reward.svg)](https://make.fun/bounty/best-heist-game-20261122-0559)

# Midnight Vault — Make the best heist game

A top-down 2D canvas heist game for the [make.fun bounty](https://make.fun/bounty/best-heist-game-20261122-0559).
You are a thief in three moonlit vaults: pocket every vault diamond, dodge the
guards' vision cones and the sweeping security cameras, keep the alarm meter
down, and reach the green EXIT unseen.

- **Guards** patrol waypoints with ray-cast vision cones and a 0–100 suspicion
  meter (investigate → chase → search → return).
- **Cameras** sweep their cones and feed the **alarm meter** (0–100); at 100%
  the vault locks down and every guard hunts you.
- **Tools at a cost:** 3 coins per level to throw as distractions, one EMP to
  knock every camera offline for 6 seconds. Running is loud; sneaking is slow.
- **Cover:** crates block sight, shadow tiles hide you, several routes per room.
- **Levels:** The Gilded Gallery, The Iron Vault, The Penthouse Roof.
- **Controls:** WASD/arrows move · Shift sneak · Space run · click throw coin ·
  F EMP · P pause · R restart · M mute · Enter start/next.
- **Sound:** all synthesized with WebAudio, no audio files.

Play it locally: `node serve.ts`, then open http://localhost:8080.

Hand it in: `mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts`
(deterministic — two runs produce byte-identical output).
