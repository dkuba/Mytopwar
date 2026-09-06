# Проверка Last Column 2.0

- `npm run check`: 43 passed, 0 failed; syntax/content validation passed.
- `npm run build`: passed; dist содержит только браузерные ресурсы.
- Кампания: 36/36 victories — 12 миссий × seed 11, 73, 509.
- Chromium desktop 1280×900 и touch 390×844: по 12 сценариев, 0 JS exceptions.
- Данные: `qualification.json`. Повторение: `npm run test:campaign`;
  `FULL_CAMPAIGN=1 npm run test:campaign` включает все три seed.

Бот использует только штатные движение, способность и выбор артефакта. Не меняет
здоровье, не выдаёт бессмертие и не добавляет войска напрямую. Это проверка
достижимости кампании, а не доказательство идеального человеческого баланса.

Browser smoke: меню, миссии, живой добор, мышь/касание, пауза, способность,
заморозка и выбор артефактов, все 10 моделей боссов, выживание, арсенал,
единственный simulation clock после повторных запусков.

## Ограничения

Проверочный Chromium блокирует HTTP-навигацию и WebGL-контексты. Использован
`python tests/browser_smoke.py --offline`: те же модули встроены через import map,
меняются только относительные спецификаторы импортов. Симуляция не подменена.
Работал штатный **software3d**. Это НЕ проверка аппаратного WebGL2, хостинга,
физических iPhone/Android, часовых игровых сессий или производительности GPU.

Обычная проверка при доступном HTTP:

```bash
python3 -m http.server 8080
# в другой консоли; нужны Python playwright и установленный Chromium:
python tests/browser_smoke.py --url http://localhost:8080/
```

main read-back и Pages-публикация проверяются отдельно после записи в GitHub.
