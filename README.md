# Password Generator

A dependency-free web app for generating passwords, passphrases, PINs and developer tokens. Everything runs locally in the browser using `crypto.getRandomValues`, so nothing leaves your machine.

## Run

Open `index.html` in a browser, or serve the folder:

```sh
python3 -m http.server 8000   # then visit http://localhost:8000
```

## Test

```sh
node --test tests/
```

## Files

| File | Purpose |
| --- | --- |
| `generator.js` | Pure generation and strength logic (browser + Node) |
| `wordlist.js` | Word list for passphrases |
| `app.js` | UI wiring, clipboard, settings, history |
| `index.html`, `styles.css` | Markup and styles (light and dark mode) |
