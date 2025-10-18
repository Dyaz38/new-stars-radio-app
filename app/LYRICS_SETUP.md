# Lyrics Setup Instructions

The lyrics display feature requires a Genius API token to function. Follow these steps to set it up:

## 1. Get a Genius API Token

1. Go to [https://genius.com/api-clients](https://genius.com/api-clients)
2. Sign in or create a Genius account
3. Click "New API Client"
4. Fill in the required information:
   - **App Name**: New Stars Radio (or any name you prefer)
   - **App Website URL**: http://localhost:5173 (for development)
   - **Redirect URI**: http://localhost:5173 (for development)
5. Click "Save"
6. Copy the **Client Access Token** (NOT the Client ID or Client Secret)

## 2. Configure the Environment Variable

1. Create a `.env` file in the `app` folder (same level as `package.json`)
2. Add the following line to the `.env` file:
   ```
   VITE_GENIUS_ACCESS_TOKEN=your_actual_token_here
   ```
   Replace `your_actual_token_here` with the token you copied from Genius

## 3. Restart the Development Server

After creating the `.env` file, restart your development server:

```bash
npm run dev
```

## 4. Test the Lyrics Feature

1. Open the radio app in your browser
2. Play a song (or wait for the current song to load)
3. Scroll down to the "Lyrics" section
4. You should now see lyrics being fetched from Genius

## Troubleshooting

- **Still seeing "Lyrics Service Setup Required"?** 
  - Make sure the `.env` file is in the correct location (`app/.env`)
  - Check that the token is correctly formatted without extra spaces
  - Restart the development server after making changes

- **Getting API errors?**
  - Verify your token is valid by checking the Genius API clients page
  - Make sure you copied the "Client Access Token" and not other credentials

- **No lyrics found for songs?**
  - This is normal - not all songs have lyrics available on Genius
  - The system will show "No Lyrics Found" for songs without available lyrics

## Security Note

The `.env` file is automatically ignored by git to prevent accidentally committing your API token. Never share your API token publicly.

