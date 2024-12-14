// Import necessary modules
const express = require("express");
const bodyParser = require("body-parser");
const {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  TextChannel,
  ThreadChannel,
} = require("discord.js");

// Initialize the Express app
const app = express();

// Set up body-parser to handle incoming JSON
app.use(bodyParser.json());

app.get("/", (req, res) => res.send("Express on Vercel"));

app.post("/github-webhook", async (req, res) => {
  const event = req.headers["x-github-event"]; // GitHub event type
  const payload = req.body;
  const repository = req.body.repository.name;
  let action = "";
  let prTitle = "";
  let embed;
  let message = "";

  // Your Discord Bot Token (replace with your actual token)

  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.GuildMembers,
    ],
  });

  client.once("ready", () => {
    console.log("Logged in as " + client.user.tag);
  });

  // Log in to Discord bot
  await client.login(process.env.DISCORD_BOT_TOKEN);

  // sleep for 5 seconds to prevent abuse
  await new Promise((resolve) => setTimeout(resolve, 1000));

  // Check which event was triggered (PR or Push)
  if (event === "pull_request") {
    const pr = payload.pull_request;
    action = payload.action;

    // Check if PR and action are available
    if (pr && action) {
      prTitle = pr.title;
      const prUrl = pr.html_url;
      const prUser = payload.sender.login;
      message = "";

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
          message = `${prUser} requested a review from ${payload.requested_reviewer.login} for the pull request: **${prTitle}**\n`;
          break;
        case "review_request_removed":
          message = `${prUser} removed a review request from ${payload.requested_reviewer.login} for the pull request: **${prTitle}**\n`;
          break;
        default:
          res.status(400).send("Event not supported");
          return;
      }

      // Create a Discord message with EmbedBuilder (updated for discord.js v14)
      embed = new EmbedBuilder()
        .setColor("#0099ff")
        .setTitle(prTitle)
        .setURL(prUrl);
    } else {
      res.status(400).send("Invalid PR payload");
      return;
    }
  } else if (event === "push") {
    const commits = payload.commits;
    const ref = payload.ref; // branch name
    const pusher = payload.pusher.name;

    if (ref === "refs/heads/development") {
      if (commits && commits.length > 0) {
        const commitMessage = commits[0].message;
        const commitUrl = commits[0].url;

        embed = new EmbedBuilder()
          .setColor("#0099ff")
          .setTitle("View Commit")
          .setURL(commitUrl);

        message = `${pusher} pushed to the branch **${ref.replace(
          "refs/heads/",
          ""
        )}**:\n\n**${
          commits[0].message
        }**\n\nRequesting everyone to do a git pull to get the latest changes.`;

        // Send message to Discord
      } else {
        res.status(400).send("Invalid Push payload");
        return;
      }
    } else {
      // Ignore pushes to any branch other than 'development'
      res.status(200).send("Push to non-development branch, no action taken");
      return;
    }
  } else if (event === "pull_request_review") {
    const pr = payload.pull_request;
    action = payload.action;

    // Check if PR and action are available
    if (pr && action) {
      prTitle = pr.title;
      const prUrl = pr.html_url;
      const prUser = payload.sender.login;
      message = "";

      // Handle different pull request actions
      switch (action) {
        case "submitted":
          message = `${prUser} submitted a review for the pull request: **${prTitle}**\n`;
          break;
        default:
          res.status(400).send("Event not supported");
          return;
      }
      embed = new EmbedBuilder()
        .setColor("#0099ff")
        .setTitle(prTitle)
        .setURL(prUrl);

      // Send the initial message in the newly created thread
    } else {
      res.status(400).send("Invalid PR payload");
      return;
    }
  } else {
    res.status(400).send("Event not supported");
    return;
  }

  let channel_id = "";

  if (repository === "fems-web") {
    channel_id = process.env.WEB_CHANNEL_ID;
  } else if (repository === "vantage-mobile-app") {
    channel_id = process.env.MOBILE_APP_CHANNEL_ID;
  } else if (repository === "vantage-backend") {
    channel_id = process.env.BACKEND_CHANNEL_ID;
  }
  // Ensure the bot is part of the server and fetch the channel
  const channel = client.channels.cache.get(channel_id);
  if (channel instanceof ThreadChannel) {
    // Send the embed message to the Discord channel
    try {
      await channel.send({ content: message, embeds: [embed] });
      res.status(200).send("Notification sent to Discord");
      console.log("res sent");
      return;
    } catch (err) {
      console.error("Error sending message to Discord:", err);
      res.status(500).send("Failed to send notification");
      return;
    }
  } else {
    res
      .status(400)
      .send("Channel is not a text channel or bot is not a member");
  }
});

module.exports = app;
