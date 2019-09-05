// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.
const fetch = require("node-fetch");

const fetchUsers = async (existing, cursor) => {
  let users = existing || []

  let url = `https://slack.com/api/users.list?token=${process.env.SlackAccessToken}`
  if (cursor) {
    url += `&cursor=${cursor}`
  }

  const response = await fetch(url).then(response => response.json())

  users = users.concat(response.members || [])

  if (response.response_metadata && response.response_metadata.next_cursor) {
    return await fetchUsers(users, response.response_metadata.next_cursor)
  } else {
    return users
  }
}

const fetchEmojis = async () => {
  return await fetch(
      `https://slack.com/api/emoji.list?token=${process.env.SlackAccessToken}`
    ).then(response => response.json())
    .then(response => response.emoji || [])
}

const replaceEmoji = (message) => {
  const standardEmojiMap = require('./emoji')
  return message.replace(/\:(.*?)\:/g, (original, name) => {
    if (standardEmojiMap[name]) {
      return String.fromCodePoint(standardEmojiMap[name])
    } else {
      return original
    }
  })
}

const replaceCustomEmoji = (message, emojiMap) => {
  return message.replace(/\:(.*?)\:/g, (original, name) => {
    const url = emojiMap[name]
    if (url) {
      return `<img class='slack-emoji' src="${url}"/>`
    } else {
      return original
    }
  })

}

module.exports = async function (context, req) {
  const payload = req.body;
  if (payload.type === "url_verification") {
    // WARNING: Here, and with all requests, we _should_ be verifying the signature of the request
    // For our purposes, shrug.
    context.res = {
      status: 200,
      body: JSON.stringify({
        challenge: payload.challenge
      })
    };
  } else {
    context.res = {
      status: 200
    };
  }

  const event = payload.event;
  if (
    event &&
    event.channel === process.env.SlackChannelId &&
    event.type === "message" &&
    event.subtype !== "message_deleted"
  ) {
    let response = {
      timestamp: event.ts,
      user: event.user
    };

    let users = []
    let customEmoji = []

    const data = context.bindings.cachedData[0]

    if (data &&
      data.customEmoji &&
      data.users &&
      data.timestamp &&
      new Date() - new Date(data.timestamp) <= 1000 * 60 /* 1 minute */ ) {
      users = data.users
      customEmoji = data.customEmoji
    } else {
      users = await fetchUsers()
      customEmoji = await fetchEmojis()
      context.bindings.newData = {
        timestamp: (new Date()).toISOString(),
        id: "1", // loool
        users,
        customEmoji
      }
    }

    const user = users.find(u => u.id === event.user);
    if (user) {
      response.username = user.name;
      response.user = user.real_name;
    }

    if (event.text !== "") {
      let text = event.text
      text = replaceEmoji(text)
      text = replaceCustomEmoji(text, customEmoji)
      response.text = text
    }

    if (event.attachments && event.attachments[0]) {
      const giphy = event.attachments[0];

      if (giphy.image_url !== undefined) {
        response.url = giphy.image_url;
      }

      if (giphy.image_width !== undefined) {
        response.width = giphy.image_width;
      }

      if (giphy.image_height !== undefined) {
        response.height = giphy.image_height;
      }
    }

    return {
      target: "newMessage",
      arguments: [response]
    };
  }
};