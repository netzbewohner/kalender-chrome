# 📅 Kalender

**Kalender** is a Chrome extension that displays your Google Calendar in a **12-month column view**, making it easy to review an entire year at once.

It’s designed for **long-term planning** — family schedules, vacations, business roadmaps, and project timelines — where seeing the *big picture* matters.

---

## ✨ Why Kalender?

Most calendar apps focus on days or weeks. Kalender focuses on the **year**.

With one glance, you can:
- Review all 12 months at once
- Spot long gaps or busy periods
- Track multi-day and long-running events
- Compare multiple calendars visually

This makes Kalender especially useful for:
- Family planning
- Travel and vacation planning
- Business and product roadmaps
- Annual reviews and forecasting

---

## 🧩 Features

- 📆 **12-month overview**  
  All months shown side-by-side in a single view

- 📅 **Day-row layout (1–31)**  
  Each day of the month is a row, making patterns easy to spot

- 🎨 **Multiple calendars with colors**  
  Display multiple Google Calendars at once, each color-coded

- ➡️ **Multi-day event support**  
  Events spanning multiple days are rendered across days (and months)

- 🔐 **Secure Google authentication**  
  Uses Chrome’s built-in OAuth (`chrome.identity`)  
  Read-only access to calendar data

- ⚡ **Fast, lightweight, no server**  
  All data stays local in your browser

---

## 🖼️ Screenshots

tbd: _Add screenshots to `docs/screenshots/` and reference them here._

```md
![12-month overview](docs/screenshots/overview.png)
![Calendar selection](docs/screenshots/calendars.png)
```

---

## 🚀 Installation (Development / Unpacked)

### 1. Clone the repository
```bash
git clone https://github.com/YOUR_USERNAME/kalender.git
cd kalender
```

### 2. Load the extension in Chrome
1. Open `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked**
4. Select the project folder

### 3. Sign in
- Click the Kalender icon
- Sign in with Google
- Select the calendars you want to display

---

## 🔐 Privacy & Permissions

Kalender:
- Uses **read-only** access to Google Calendar
- Does **not** store event data on any external server
- Stores only user preferences (e.g. selected calendars) via Chrome storage

See the full [Privacy Policy](docs/privacy.md).

---

## 🎨 Design Contributions Welcome

Kalender is functionally solid, but **design and UX are the areas where help is most needed**.

We especially welcome contributions related to:
- Visual clarity of the 12-month grid
- Multi-day event visualization
- Color systems and accessibility
- App icon and visual identity

Design-only contributions (mockups, sketches, UX ideas) are absolutely welcome.

👉 See open **design-labeled issues** to get started.

---

## 🤝 Contributing

Contributions of all kinds are welcome:
- Design & UX
- Frontend / CSS
- Performance improvements
- Bug fixes
- Documentation

Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidance.

---

## 🧠 AI Assistance

This repository includes an `AGENTS.md` file containing guidance for AI coding agents.
It is **not required reading** for contributors, but helps maintain architectural consistency when using AI tools.

---

## 📄 License

MIT License — free to use, modify, and distribute.  
See [LICENSE](LICENSE).

---

## 🌱 Roadmap (high level)

- Improve visual clarity for dense calendars
- Better visual treatment for long-running events
- Refined icon and branding
- Optional settings & customization

---

## 🙏 Acknowledgements

Kalender was developed with the assistance of AI tools.
Community contributions are welcome and encouraged.
