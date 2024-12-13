// Import necessary modules
const express = require("express");
const bodyParser = require("body-parser");
const {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  TextChannel,
} = require("discord.js");

// Initialize the Express app
const app = express();

// Your Discord Bot Token (replace with your actual token)
const DISCORD_BOT_TOKEN =
  "MTMxNzEwNjQzMjkzNTU5NjAzMg.G-3xaE.s9xMOnoNvwfu8G12ACpUN14BLWeYhVe3r21e3I"; // Replace with your actual bot token
const CHANNEL_IDS = {
  "fems-web": "1317037893927043074",
  "vantage-mobile-app": "1317038054812291082", // Replace with your target channel ID
};

// Set up body-parser to handle incoming JSON
app.use(bodyParser.json());

// Initialize the Discord bot client with necessary intents
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers,
  ],
});

// Log in to Discord
client.once("ready", () => {
  console.log("Logged in as " + client.user.tag);
});

app.post("/github-webhook", (req, res) => {
  const event = req.headers["x-github-event"]; // GitHub event type
  const payload = req.body;
  const repository = req.body.repository.name;

  // Check which event was triggered (PR or Push)
  if (event === "pull_request") {
    handlePullRequestEvent(payload, res, repository);
  } else if (event === "push") {
    handlePushEvent(payload, res, repository);
  } else if (event === "pull_request_review") {
    handlePullRequestReviewEvent(payload, res, repository);
  } else {
    res.status(400).send("Event not supported");
  }
});

// Implement handlePullRequestReviewEvent
async function handlePullRequestReviewEvent(payload, res, repository) {
  const pr = payload.pull_request;
  const action = payload.action;

  // Check if PR and action are available
  if (pr && action) {
    const prTitle = pr.title;
    const prUrl = pr.html_url;
    const prUser = pr.user.login;
    let message = "";

    // Handle different pull request actions
    switch (action) {
      case "submitted":
        message = `${prUser} submitted a review for the pull request: **${prTitle}**\n`;
        break;
    }
    const embed = new EmbedBuilder()
      .setColor("#0099ff")
      .setTitle(prTitle)
      .setURL(prUrl);

    // Send the initial message in the newly created thread
    sendMessageToDiscord(
      message,
      res,
      embed,
      repository,
      true,
      action === "closed" ? true : false,
      prTitle
    );
  } else {
    res.status(400).send("Invalid PR payload");
  }
}
// Handle Pull Request events
async function handlePullRequestEvent(payload, res, repository) {
  const pr = payload.pull_request;
  const action = payload.action;

  // Check if PR and action are available
  if (pr && action) {
    const prTitle = pr.title;
    const prUrl = pr.html_url;
    const prUser = pr.user.login;
    let message = "";

    // Handle different pull request actions
    switch (action) {
      case "opened":
        message = `${prUser} opened a new pull request: **${prTitle}**\n`;
        break;
      case "closed":
        if (pr.merged) {
          message = `${prUser} merged the pull request: **${prTitle}**\n`;
        } else {
          message = `${prUser} closed the pull request without merging: **${prTitle}**\n`;
        }
        break;
      case "reopened":
        message = `${prUser} reopened the pull request: **${prTitle}**\n`;
        break;
      case "review_requested":
        message = `${prUser} requested a review for the pull request: **${prTitle}**\n`;
        break;
      case "review_request_removed":
        message = `${prUser} removed a review request from the pull request: **${prTitle}**\n`;
        break;
      default:
        message = `${prUser} ${action} the pull request: **${prTitle}**\n`;
        break;
    }

    // Create a Discord message with EmbedBuilder (updated for discord.js v14)
    const embed = new EmbedBuilder()
      .setColor("#0099ff")
      .setTitle(prTitle)
      .setURL(prUrl);

    sendMessageToDiscord(
      message,
      res,
      embed,
      repository,
      true,
      action === "closed" ? true : false,
      prTitle
    );
  } else {
    res.status(400).send("Invalid PR payload");
  }
}

// Handle Push events
function handlePushEvent(payload, res, repository) {
  const commits = payload.commits;
  const ref = payload.ref; // branch name
  const pusher = payload.pusher.name;

  const embed = new EmbedBuilder().setColor("#0099ff");

  if (ref === "refs/heads/development") {
    if (commits && commits.length > 0) {
      const commitMessage = commits[0].message;
      const commitUrl = commits[0].url;

      let message = `${pusher} pushed to the branch **${ref}**:\n\n**${commitMessage}**\n[View Commit](${commitUrl})\nRequesting everyone to do a git pull to get the latest changes.`;

      // Send message to Discord
      sendMessageToDiscord(message, res, embed, repository, false, false, "");
    } else {
      res.status(400).send("Invalid Push payload");
    }
  } else {
    // Ignore pushes to any branch other than 'development'
    res.status(200).send("Push to non-development branch, no action taken");
  }
}

// Send messages to Discord using Embed
async function sendMessageToDiscord(
  message,
  res,
  embed,
  repository,
  tryThread,
  threadDelete,
  prTitle
) {
  // Ensure the bot is part of the server and fetch the channel
  const channel = client.channels.cache.get(CHANNEL_IDS[repository]);

  if (channel instanceof TextChannel) {
    if (tryThread) {
      try {
        // Check if thread already exists
        const threads = await channel.threads.fetchActive(); // Fetch active threads
        let existingThread = threads.threads.find((thread) =>
          thread.name.includes(prTitle)
        );

        if (existingThread) {
          // Send the message to the existing thread\
          await existingThread.send({ content: message, embeds: [embed] });
          res.status(200).send("PR Thread created or updated and message sent");
          if (threadDelete) {
            await existingThread.delete();
          }
          return;
        }
      } catch (err) {
        console.error("Error handling thread:", err);
        res.status(500).send("Failed to create thread or send message");
      }
    }
    // Send the embed message to the Discord channel
    channel
      .send({ content: message, embeds: [embed] })
      .then(() => res.status(200).send("Notification sent to Discord"))
      .catch((err) => {
        console.error("Error sending message to Discord:", err);
        res.status(500).send("Failed to send notification");
      });
  } else {
    res
      .status(400)
      .send("Channel is not a text channel or bot is not a member");
  }
}

// Start the Express server on port 3000 or custom port
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

// Log in to Discord bot
client.login(DISCORD_BOT_TOKEN);
