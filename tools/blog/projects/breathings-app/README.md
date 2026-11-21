# Breathings

- **Overview:** An Android mindfulness app that pairs timed breathing exercises with guided meditation and calming audio for relaxation and sleep.
- **Public links:** [Portfolio case study](https://dhem.io/projects/breathings-app) · [App and API source](https://github.com/murtazabaanihali/breathings)

## Product capabilities

- Choose a breathing goal and timer, follow animated pacing cues, and track completed sessions. The app also includes a mood chart and reminders.
- Explore sleep, meditation, relaxation, and melody playlists; save favorites and revisit listening history. The player supports background audio controls and offers track downloads to premium users.

## Stack and article angles

- React Native and Expo power the app; Redux stores client state and React Native Track Player handles playback. Django and Django REST Framework supply the audio catalog, favorites, listening and breathing history, and monthly mood summaries.
- **Possible articles:** Compare the short, timer-driven breathing flow with longer audio sessions; design a mobile audio library that supports playback controls, favorites, history, and offline tracks.

## Sources

- Portfolio case study and public repository README; `frontend/src/pages/Breathing.js`, `Track.js`, and `MoodChart.js`; Django models and routes under `backend/code/home/`.
