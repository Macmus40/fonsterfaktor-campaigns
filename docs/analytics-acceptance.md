# Odbiór: linki i analityka

## Kroki odtworzenia

```bash
npm install
rm -f data/campaigns.sqlite data/campaigns.sqlite-*
npm run seed:demo
npm run acceptance:analytics
npm run dev
```

Otwórz [http://localhost:3000/analytics](http://localhost:3000/analytics).

## Kryteria

| Kryterium | Jak sprawdzić |
| --- | --- |
| Dwa posty z osobnymi linkami | Seed wypisuje dwa `/r/lnk_…`; raport „Według publikacji” |
| Przekierowanie do konfiguratora | `curl -I http://localhost:3000/r/<linkId>` → 302 z `product`/`finish`/`ff_link_id` |
| Symulowane wyceny i zapytania | `acceptance:analytics` wstawia `price_view` / `inquiry_submitted` |
| Duplikat zdarzenia | Ten sam `idempotencyKey` → `deduped: true`, zapytania B = 4 |
| Więcej ruchu ≠ więcej zapytań | Post A: 20 przejść / 1 zapytanie; Post B: 8 przejść / 4 zapytania |
| Boty / podglądy | UA `facebookexternalhit` → `link_preview`, nie „przejście” |
| Status bez DIN Next | Pusta baza zdarzeń DIN → etykieta „brak pomiaru konwersji” |
| Ręczne statystyki | Formularz na `/analytics` zapisuje `dataSource=manual` |

## Tygodniowe podsumowanie

Panel pokazuje trzy bloki: co się zmieniło, gdzie klienci odpadają, jeden test do zatwierdzenia (np. nowy nagłówek / wariant sezonowy). Przy zbyt małej próbie — „brak podstaw do wniosku”.
