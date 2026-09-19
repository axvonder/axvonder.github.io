# Alexander Vonderschmidt

Static personal website for [axvonder.com](https://axvonder.com/).

## Local preview

Run `python3 -m http.server 8000 --bind 127.0.0.1` from this folder, then open `http://127.0.0.1:8000/`.

`index.html` is the homepage. `music.html` lists singing experience. Both use `site.css`. The old `research.html` and `choir.html` URLs redirect to their replacements. `cv.html` and both existing CV PDFs remain unchanged. `CNAME` preserves the custom domain. The `RiskStratTool`, `FIMreadiness`, and `mage-game` folders retain their existing URLs.

## Publications

Run `python3 publications/verify.py` to check the ten publication entries, nine PDF downloads, file hashes, and disclosure links.

Edit publication content in `index.html` and keep `publications/publications.json` consistent. List all authors in AMA-style citations and bold **Vonderschmidt A**. Keep the copyright and licence credits. See [publication sharing checks](publications/SHARING.md) for sources and reuse terms. Keep the saved PDFs unchanged.

## Images

The portrait and Tufts logo in `assets/` were supplied by Alexander. The LinkedIn icon comes from [LinkedIn's official downloads](https://brand.linkedin.com/downloads). The choir photograph and Google Scholar icon reuse the existing site files.
