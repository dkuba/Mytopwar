# Current Task — R7: восстановление и публикация Last Column 2

## Goal
Завершить переработку браузерной игры и закрепить результат в main малыми коммитами.
## Non-goals
MMO, облако, multiplayer, чужие ассеты, реальные платежи.
## UX Requirements
Добор на трассе, ловушки с реальными потерями, светлая объёмная сцена, управление на ПК и телефоне.
## Technical Approach
Fixed-world simulation, процедурные модели, WebGL2 + software fallback, ES modules.
## Guardrails
Без внешних CDN/ключей и force push; использовать только подтверждённые Git object IDs.
## Acceptance Criteria
npm run check: 48/48. Build: passed. Кампания: 36/36. Browser: desktop/touch passed через software3d.
Игровая реализация включена в main коммитом e1a4e2ec; runner улучшен в d272ec46.
Аппаратный GPU, физические телефоны и browser HTTP не заявляются проверенными.
## Files Likely to Change
Финальная документация и отчёт qualification.json; игровые модули зафиксированы.
## Test Plan
Unit/regression, обычные действия бота, browser smoke, remote ref и Pages read-back.
## Manual QA/Scenarios
MT-001 «Добор»: +N/×2, один эффект на ряд.
MT-002 «Клетка»: прострелить прочность, затем подобрать.
MT-003 «Ловушка»: обход безопасен, контакт уменьшает реальный отряд.
MT-004 «Босс»: выйти из предупреждения, уничтожить орудие.
MT-005 «Пауза и повтор»: нет продвижения мира или дублированных часов.
MT-006 «Телефон»: drag, способность, артефакты, меню.
Ручная приёмка на физическом телефоне не заявляется выполненной.
