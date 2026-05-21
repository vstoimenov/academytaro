# TaroAcademy Vercel MVP

Това е един Vercel-ready проект.

## Адреси

- `/` - клиентска зона
- `/admin` - CRM

Локално на Mac можеш да отвориш CRM и с:

`index.html?admin=1`

## Демо вход

Клиент:

- `demo@taroacademy.online`

CRM:

- PIN `1122`

## Checkout пренасочване

Продажбената страница трябва да води към checkout. След успешно плащане самият checkout трябва да пренасочи клиента към обучението.

След като качиш проекта във Vercel, сложи този адрес като success/thank-you redirect в checkout настройките:

`https://YOUR-VERCEL-DOMAIN.vercel.app/?email=client@email.com`

Ако имейлът вече е активен в CRM-а, клиентът ще влезе директно.

Ако checkout системата поддържа динамичен имейл, използвай нейния email placeholder, например:

`https://YOUR-VERCEL-DOMAIN.vercel.app/?email={{customer.email}}`

## Важно

Това е front-end MVP. Данните се пазят в браузъра чрез `localStorage`.

За реални клиенти трябва база данни и webhook от checkout-а, защото данните в твоя браузър не се споделят автоматично с браузъра на клиента.
