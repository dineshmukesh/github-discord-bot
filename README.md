# github-discord-bot

# GitHub Discord Bot

This project is a GitHub Discord Bot that integrates GitHub webhooks with a Discord server. It listens for specific GitHub events such as pull requests, push events, and pull request reviews, and sends notifications to designated Discord channels using Discord embeds.

## Features

- Listens to GitHub events: pull requests, push events, and pull request reviews.
- Sends formatted messages to specified Discord channels using embeds.
- Automatically handles thread creation and message sending for pull requests.
- Filters push events to only notify for specific branches.

## Prerequisites

- Node.js and npm installed on your machine.
- A Discord bot token and a Discord server where the bot has the necessary permissions.
- A GitHub repository with webhooks set up to send events to this bot.

## Setup

1. Clone the repository:

   ```bash
   git clone https://github.com/yourusername/github-discord-bot.git
   ```

2. Navigate to the project directory:

   ```bash
   cd github-discord-bot
   ```

3. Install the dependencies:

   ```bash
   npm install
   ```

4. Create a `.env` file in the project root and add your Discord bot token:

   ```plaintext
   DISCORD_BOT_TOKEN=your_discord_bot_token
   ```

5. Configure your GitHub repository to send webhooks to your server's URL and port (default is port 3000).

## Running the Bot

Start the bot using:

```bash
npm run dev
```

The bot will now be listening for GitHub events and will send notifications to the configured Discord channels.

## Configuration

- Update `CHANNEL_IDS` in `index.js` to map the GitHub repository names to the corresponding Discord channel IDs.
- Modify the event handlers in `index.js` if you need to customize the messages or handle additional events.
