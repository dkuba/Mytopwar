# Current Task — R7: квалификация и публикация Last Column 2

## Goal
Завершить R0–R7 и опубликовать проверенное дерево в main.
## Non-goals
MMO, облако, multiplayer, чужие ассеты и реальные платежи.
## UX Requirements
Добор на трассе, ловушки с реальными потерями, светлая объёмная сцена, телефон/ПК.
## Technical Approach
Fixed-world simulation, процедурные модели, WebGL2 + software fallback, ES modules.
## Guardrails
Без внешних CDN/ключей и force push; честные границы квалификации.
## Acceptance Criteria
npm run check: 43/43. Build: passed. Кампания: 36/36. Browser: desktop/touch passed.
GPU/HTTP/физические телефоны в этом окружении не проверены. Remote read-back отдельно.
## Files Likely to Change
src/sim, src/render, src/data, src/main.js, tests, docs.
## Test Plan
Unit/regression + легальные действия бота + browser smoke.
## Manual QA/Scenarios
MT-001 «Добор»: +N/×2, один эффект на ряд.
MT-002 «Клетка»: прострелить прочность, затем подобрать.
MT-003 «Ловушка»: обход безопасен, контакт уменьшает реальный отряд.
MT-004 «Босс»: выйти из предупреждения, уничтожить орудие.
MT-005 «Пауза и повтор»: нет продвижения мира/дублированных часов.
MT-006 «Телефон»: drag, способность, артефакты, меню.
Ручная приёмка на физическом телефоне не заявляется выполненной.
